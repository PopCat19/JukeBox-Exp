// audio-worklet-processor.ts
//
// Purpose: AudioWorklet processor code for real-time audio playback
//
// This module:
// - Exports the worklet processor source as a string (loaded via blob URL)
// - Maintains an internal buffer queue of audio data received from the main thread
// - Requests more data via MessagePort when the queue runs low
// - Outputs audio in 128-sample render quantums via process()
// - Logging is opt-in, controlled by the debug flag passed via processorOptions

// IMPORTANT: This code runs in AudioWorkletGlobalScope, NOT the main thread.
// It is loaded as a string via audioWorklet.addModule(blobUrl).
// TypeScript does not type-check this string; it is plain JavaScript.

export const AUDIO_WORKLET_PROCESSOR_CODE: string = `
"use strict";

class BeepBoxAudioWorkletProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this._queue = [];
    this._offset = 0;
    this._dataRequested = false;
    this._bufferSize = (options && options.processorOptions && options.processorOptions.bufferSize) || 2048;
    this._sampleRate = sampleRate;
    this._totalProcessed = 0;
    this._totalReceived = 0;
    this._underrunCount = 0;
    this._processCallCount = 0;
    this._active = true;
    this._debug = !!(options && options.processorOptions && options.processorOptions.debug);

    this.port.onmessage = (e) => {
      const msg = e.data;
      if (!msg) return;

      if (msg.type === "audio") {
        this._queue.push({ left: msg.left, right: msg.right });
        this._totalReceived += msg.left.length;
        this._dataRequested = false;
        this._processCallCount++;
        if (this._debug && (this._processCallCount <= 5 || this._processCallCount % 100 === 0)) {
          console.log("[Worklet] Received audio buffer #" + this._processCallCount + ", queue size: " + this._queue.length + ", total received: " + this._totalProcessed + " samples, buffered: " + this._getBufferedSamples() + " samples");
        }
      } else if (msg.type === "clear") {
        this._queue.length = 0;
        this._offset = 0;
        this._dataRequested = false;
        if (this._debug) console.log("[Worklet] Queue cleared");
      } else if (msg.type === "stop") {
        this._active = false;
        if (this._debug) console.log("[Worklet] Stop signal received");
      }
    };

    if (this._debug) console.log("[Worklet] Processor created, bufferSize: " + this._bufferSize + ", sampleRate: " + this._sampleRate);
  }

  _getBufferedSamples() {
    var total = 0;
    for (var i = 0; i < this._queue.length; i++) {
      total += this._queue[i].left.length;
    }
    return total - this._offset;
  }

  process(inputs, outputs, parameters) {
    if (!this._active) return false;

    var output = outputs[0];
    if (!output || output.length < 2) {
      return true;
    }

    var outL = output[0];
    var outR = output[1];
    var len = outL.length;

    var written = 0;

    while (written < len) {
      if (this._queue.length === 0) {
        // Buffer underrun: fill remaining with silence
        for (var i = written; i < len; i++) {
          outL[i] = 0.0;
          outR[i] = 0.0;
        }
        this._underrunCount++;
        if (this._debug && (this._underrunCount <= 5 || this._underrunCount % 500 === 0)) {
          console.warn("[Worklet] UNDERRUN #" + this._underrunCount + ", total processed: " + this._totalProcessed + " samples");
        }
        break;
      }

      var buf = this._queue[0];
      var available = buf.left.length - this._offset;
      var needed = len - written;
      var toCopy = Math.min(available, needed);

      // Copy samples from buffer to output
      outL.set(buf.left.subarray(this._offset, this._offset + toCopy), written);
      outR.set(buf.right.subarray(this._offset, this._offset + toCopy), written);

      this._offset += toCopy;
      written += toCopy;

      // If we've consumed the entire buffer, shift it off the queue
      if (this._offset >= buf.left.length) {
        this._queue.shift();
        this._offset = 0;
      }
    }

    this._totalProcessed += len;

    // Request more data when the queue is running low.
    // Low watermark: request when buffered data falls below 2x buffer size.
    if (this._active) {
      var buffered = this._getBufferedSamples();
      if (buffered < this._bufferSize * 2 && !this._dataRequested) {
        this.port.postMessage({ type: "need-data" });
        this._dataRequested = true;
      }
    }

    return true;
  }
}

registerProcessor("beepbox-audio-worklet-processor", BeepBoxAudioWorkletProcessor);
`;
