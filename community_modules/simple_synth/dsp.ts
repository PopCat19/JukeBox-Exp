// community_modules/simple_synth/dsp.ts
//
// Purpose: Generate the synth function body for the simple_synth community module
//
// This module:
// - Returns a source string that, when called via `new Function(...)`, produces
//   a per-tone renderer writing one float per sample into the synth's mono
//   scratch buffer (synth.tempMonoInstrumentSampleBuffer).
// - Uses simple_synth's own runtime phase (tone.phases[0]) — host expects
//   tone.phases[1..N] for unison voices. simple_synth is single-voice.
// - Frequency is pulled from instrumentState.frequency (set by host from
//   module params at init).

export function buildSimpleSynthSource(): string {
	return `
		return (synth, bufferIndex, runLength, tone, instrumentState) => {
			const data = synth.tempMonoInstrumentSampleBuffer;
			const sampleRate = synth.sampleRate;
			const freq = instrumentState.frequency || 440;
			const phaseDelta = freq / sampleRate;
			let phase = tone.phases[0] || 0;
			for (let i = 0; i < runLength; i++) {
				phase += phaseDelta;
				if (phase > 1) phase -= 1;
				const sample = Math.sin(phase * 2 * Math.PI) * instrumentState.volumeScale;
				data[bufferIndex + i] += sample;
			}
			tone.phases[0] = phase;
		};
	`;
}
