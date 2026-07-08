// audio-worklet-processor.ts
//
// Purpose: AudioWorklet processor code for real-time audio playback
//
// This module:
// - Exports the worklet processor source as a string (loaded via blob URL)
// - Supports two data-source modes selected at runtime:
//   Mode A (SAB): Lock-free SharedArrayBuffer ring buffer. No callbacks
//     to main thread during playback. Set via "init" message with SAB.
//   Mode B (queue): Legacy postMessage-based buffer queue. Sends
//     "need-data" to main thread when the queue runs low.
// - Outputs audio in 128-sample render quantums via process()
// - Logging is opt-in, controlled by debug flag passed via processorOptions
//
// SAB ring buffer protocol (single producer, single consumer):
//   header[0] (writeHead, Int32): last slot index the producer has fully written
//   header[1] (readHead,  Int32): last slot index the consumer has fully consumed
//   Data: numSlots × (slotLength × 2) Float32 — L/R interleaved per slot
//
// readHead is only published AFTER the slot is fully consumed, so the
// producer never overwrites a slot that's still being read.

// IMPORTANT: This code runs in AudioWorkletGlobalScope, NOT the main thread.
// It is loaded as a string via audioWorklet.addModule(blobUrl).
// TypeScript does not type-check this string; it is plain JavaScript.

export const AUDIO_WORKLET_PROCESSOR_CODE: string = `
"use strict";

class BeepBoxAudioWorkletProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this._active = true;
    this._bufferSize = (options && options.processorOptions && options.processorOptions.bufferSize) || 2048;
    this._debug = !!(options && options.processorOptions && options.processorOptions.debug);

    // Mode A (SAB) state
    this._sab = null;
    this._header = null;
    this._data = null;
    this._headerInts = 2;
    this._headerBytes = 8;
    this._resetSeq = 0;
    this._numSlots = 8;
    this._slotLength = this._bufferSize;
    this._slotStride = this._bufferSize * 2;
    this._readHead = -1;
    this._activeSlot = -1;
    this._slotOffset = 0;
    this._sabNeedDataPending = false;

    // Mode B (queue) state
    this._queue = [];
    this._queueOffset = 0;
    this._dataRequested = false;
    this._totalProcessed = 0;
    this._totalReceived = 0;
    this._underrunCount = 0;
    this._lastUnderrunMessageTime = 0;

    this.port.onmessage = (e) => {
      var msg = e.data;
      if (!msg) return;

      if (msg.type === "init") {
        // Mode A: SAB ring buffer
        this._sab = msg.sab;
        this._headerInts = msg.headerInts || 2;
        this._headerBytes = msg.headerBytes || 8;
        this._header = new Int32Array(this._sab, 0, this._headerInts);
        this._numSlots = msg.numSlots || this._numSlots;
        var totalFloats = this._numSlots * this._slotStride;
        this._data = new Float32Array(this._sab, this._headerBytes, totalFloats);
        this._resetSeq = this._headerInts > 2 ? Atomics.load(this._header, 2) : 0;
        this._readHead = -1;
        this._activeSlot = -1;
        this._slotOffset = 0;
        this._sabNeedDataPending = false;
        this._totalWritten = 0;
        this._queue.length = 0;
        if (this._debug) console.log("[Worklet] SAB mode, slots: " + msg.numSlots + ", slotLen: " + this._slotLength);
      } else if (msg.type === "audio") {
        // Mode B: queue mode — push buffer
        this._queue.push({ left: msg.left, right: msg.right });
        this._totalReceived += msg.left.length;
        this._dataRequested = false;
        if (this._debug && (this._totalReceived <= 5 * this._bufferSize || this._totalReceived % (100 * this._bufferSize) === 0)) {
          console.log("[Worklet] Queue push, size: " + this._queue.length);
        }
      } else if (msg.type === "clear") {
        this._queue.length = 0;
        this._queueOffset = 0;
        this._dataRequested = false;
      } else if (msg.type === "stop") {
        this._active = false;
      }
    };

    if (this._debug) console.log("[Worklet] Created, bufferSize: " + this._bufferSize);
  }

  _getBufferedSamples() {
    var total = 0;
    for (var i = 0; i < this._queue.length; i++) {
      total += this._queue[i].left.length;
    }
    return total - this._queueOffset;
  }

  process(inputs, outputs, parameters) {
    if (!this._active) return false;

    var output = outputs[0];
    if (!output || output.length < 2) return true;

    var outL = output[0];
    var outR = output[1];
    var len = outL.length;

    if (this._sab != null) {
      // ── Mode A: SAB ring buffer ──
      this._processSAB(outL, outR, len);
    } else {
      // ── Mode B: queue ──
      this._processQueue(outL, outR, len);
    }

    return true;
  }

  _processSAB(outL, outR, len) {
    if (this._headerInts > 2) {
      var resetSeq = Atomics.load(this._header, 2);
      if (resetSeq !== this._resetSeq) {
        this._resetSeq = resetSeq;
        this._readHead = Atomics.load(this._header, 1);
        this._activeSlot = -1;
        this._slotOffset = 0;
        this._sabNeedDataPending = false;
      }
    }

    var written = 0;

    while (written < len) {
      if (this._activeSlot < 0) {
        var writeHead = Atomics.load(this._header, 0);

        if (writeHead <= this._readHead) {
          if (!this._sabNeedDataPending) {
            this._sabNeedDataPending = true;
            this.port.postMessage({ type: "need-data" });
          }
          this._underrunCount++;
          var now = currentTime;
          if (now - this._lastUnderrunMessageTime > 0.25) {
            this._lastUnderrunMessageTime = now;
            this.port.postMessage({
              type: "underrun",
              mode: "sab",
              count: this._underrunCount,
              writeHead: writeHead,
              readHead: this._readHead,
              activeSlot: this._activeSlot,
              slotOffset: this._slotOffset,
              bufferSize: this._bufferSize
            });
          }
          for (var i = written; i < len; i++) { outL[i] = 0.0; outR[i] = 0.0; }
          return;
        }

        this._sabNeedDataPending = false;
        this._activeSlot = this._readHead + 1;
        this._slotOffset = 0;

        // Preemptive: if this is the last available slot in the ring
        // (only 1 ahead of readHead), fire need-data now. The main
        // thread has ~46ms to refill before this slot drains.
        if (writeHead === this._readHead + 1) {
          this.port.postMessage({ type: "need-data" });
        }
        continue;
      }

      var slotBase = (this._activeSlot % this._numSlots) * this._slotStride;
      var available = this._slotLength - this._slotOffset;
      var needed = len - written;
      var toCopy = Math.min(available, needed);

      outL.set(this._data.subarray(
        slotBase + this._slotOffset,
        slotBase + this._slotOffset + toCopy
      ), written);
      outR.set(this._data.subarray(
        slotBase + this._slotLength + this._slotOffset,
        slotBase + this._slotLength + this._slotOffset + toCopy
      ), written);

      this._slotOffset += toCopy;
      written += toCopy;

      if (this._slotOffset >= this._slotLength) {
        this._readHead = this._activeSlot;
        Atomics.store(this._header, 1, this._readHead);
        this._activeSlot = -1;
      }
    }
  }

  _processQueue(outL, outR, len) {
    var written = 0;

    while (written < len) {
      if (this._queue.length === 0) {
        for (var i = written; i < len; i++) { outL[i] = 0.0; outR[i] = 0.0; }
        this._underrunCount++;
        var now = currentTime;
        if (now - this._lastUnderrunMessageTime > 0.25) {
          this._lastUnderrunMessageTime = now;
          this.port.postMessage({
            type: "underrun",
            mode: "queue",
            count: this._underrunCount,
            queueLength: this._queue.length,
            queueOffset: this._queueOffset,
            bufferedSamples: this._getBufferedSamples(),
            bufferSize: this._bufferSize
          });
        }
        if (this._debug && (this._underrunCount <= 5 || this._underrunCount % 500 === 0)) {
          console.warn("[Worklet] UNDERRUN #" + this._underrunCount);
        }
        break;
      }

      var buf = this._queue[0];
      var available = buf.left.length - this._queueOffset;
      var needed = len - written;
      var toCopy = Math.min(available, needed);

      outL.set(buf.left.subarray(this._queueOffset, this._queueOffset + toCopy), written);
      outR.set(buf.right.subarray(this._queueOffset, this._queueOffset + toCopy), written);

      this._queueOffset += toCopy;
      written += toCopy;

      if (this._queueOffset >= buf.left.length) {
        this._queue.shift();
        this._queueOffset = 0;
      }
    }

    this._totalProcessed += len;

    if (this._active) {
      var buffered = this._getBufferedSamples();
      if (buffered < this._bufferSize * 2 && !this._dataRequested) {
        this.port.postMessage({ type: "need-data" });
        this._dataRequested = true;
      }
    }
  }
}

registerProcessor("beepbox-audio-worklet-processor", BeepBoxAudioWorkletProcessor);
`;
