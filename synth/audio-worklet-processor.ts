// audio-worklet-processor.ts
//
// Purpose: AudioWorklet processor code for real-time audio playback
//
// This module:
// - Exports the worklet processor source as a string (loaded via blob URL)
// - Reads audio from a SharedArrayBuffer ring buffer (lock-free, no callbacks)
// - Outputs audio in 128-sample render quantums via process()
// - Logging is opt-in, controlled by the debug flag passed via processorOptions
//
// SAB ring buffer protocol (single producer, single consumer):
//   header[0] (writeHead, Int32): last slot index the producer has fully written
//   header[1] (readHead,  Int32): last slot index the consumer has fully consumed
//   Data: numSlots × (slotLength × 2) Float32 — L/R interleaved per slot
//
// Producer (main thread):
//   nextWrite = writeHead + 1
//   if nextWrite - readHead >= numSlots: blocked (ring full)
//   Write slot at (nextWrite % numSlots)
//   publish writeHead = nextWrite (atomic store)
//
// Consumer (worklet):
//   track activeSlot = -1 (no slot in progress)
//   process():
//     if activeSlot == -1:
//       head = load writeHead
//       if head > readHead:
//         activeSlot = readHead + 1, slotOffset = 0
//       else: silence
//     Copy from activeSlot at slotOffset to output
//     If slot complete: readHead = activeSlot (atomic store), activeSlot = -1
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
    this._numSlots = 4;
    this._slotLength = this._bufferSize;
    this._slotStride = this._bufferSize * 2;
    this._debug = !!(options && options.processorOptions && options.processorOptions.debug);
    // Consumer-local tracking: last fully-consumed slot index, the slot
    // currently being read, and the read offset within that slot.
    this._readHead = -1;
    this._activeSlot = -1;
    this._slotOffset = 0;
    this._underrunCount = 0;
    this._processCallCount = 0;

    // SAB layout: header[2] Int32, then data[totalFloats] Float32
    this._headerBytes = 8;
    this._sab = null;
    this._header = null;
    this._data = null;

    this.port.onmessage = (e) => {
      var msg = e.data;
      if (!msg) return;

      if (msg.type === "init") {
        this._sab = msg.sab;
        this._header = new Int32Array(this._sab, 0, 2);
        var totalFloats = msg.numSlots * this._slotStride;
        this._data = new Float32Array(this._sab, this._headerBytes, totalFloats);
        this._readHead = -1;
        this._activeSlot = -1;
        this._slotOffset = 0;
        this._underrunCount = 0;
        this._processCallCount = 0;
        if (this._debug) console.log("[Worklet] SAB init, slots: " + msg.numSlots + ", slotLen: " + this._slotLength);
      } else if (msg.type === "stop") {
        this._active = false;
        if (this._debug) console.log("[Worklet] Stop signal");
      }
    };

    if (this._debug) console.log("[Worklet] Created, bufferSize: " + this._bufferSize);
  }

  process(inputs, outputs, parameters) {
    if (!this._active) return false;

    var output = outputs[0];
    if (!output || output.length < 2) return true;

    var outL = output[0];
    var outR = output[1];
    var len = outL.length;

    // No SAB — output silence until init
    if (this._sab == null) {
      this._setSilence(outL, outR, 0, len);
      return true;
    }

    var written = 0;

    while (written < len) {
      // No active slot: try to claim the next unconsumed one.
      if (this._activeSlot < 0) {
        var writeHead = Atomics.load(this._header, 0);

        if (writeHead <= this._readHead) {
          // Nothing new to play — fill rest with silence
          for (var i = written; i < len; i++) {
            outL[i] = 0.0;
            outR[i] = 0.0;
          }
          break;
        }

        this._activeSlot = this._readHead + 1;
        this._slotOffset = 0;

        if (this._debug && this._processCallCount < 5) {
          console.log("[Worklet] Consuming slot " + this._activeSlot + " (writeHead: " + writeHead + ", readHead: " + this._readHead + ")");
        }
        continue;
      }

      // Copy from active slot at current offset
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

      // Slot fully consumed — publish readHead
      if (this._slotOffset >= this._slotLength) {
        this._readHead = this._activeSlot;
        Atomics.store(this._header, 1, this._readHead);
        this._activeSlot = -1;
      }
    }

    this._processCallCount++;
    return true;
  }

  _setSilence(outL, outR, from, to) {
    for (var i = from; i < to; i++) {
      outL[i] = 0.0;
      outR[i] = 0.0;
    }
  }
}

registerProcessor("beepbox-audio-worklet-processor", BeepBoxAudioWorkletProcessor);
`;
