// synth-math-utils.ts
//
// Purpose: Module-level waveform, drum, and pitch utility functions that depend on Config data
//
// This module:
// - getPulseWidthRatio: Maps pulse width setting to ratio
// - getDrumWave: Generates chip noise waveforms (LFSR, white noise, FFT-based)
// - drawNoiseSpectrum: Fills spectral bins for noise drum design
// - getArpeggioPitchIndex: Computes arpeggio pitch from pattern table
// - calculateRingModHertz: Converts ring modulation slider to Hz
//
// Extracted from config-class.ts to reduce file from 4759 to ~4515 lines

import { Config } from "./config-class";

export function getPulseWidthRatio(pulseWidth: number): number {
	return pulseWidth / (Config.pulseWidthRange * 2);
}

export function getDrumWave(
	index: number,
	inverseRealFourierTransform: Function | null,
	scaleElementsByFactor: Function | null,
): Float32Array {
	let wave: Float32Array | null = Config.chipNoises[index].samples;
	if (wave == null) {
		wave = new Float32Array(Config.chipNoiseLength + 1);
		Config.chipNoises[index].samples = wave;

		if (index === 0) {
			// The "retro" drum uses a "Linear Feedback Shift Register" similar to the NES noise channel.
			let drumBuffer: number = 1;
			for (let i: number = 0; i < Config.chipNoiseLength; i++) {
				wave[i] = (drumBuffer & 1) * 2.0 - 1.0;
				let newBuffer: number = drumBuffer >> 1;
				if (((drumBuffer + newBuffer) & 1) === 1) {
					newBuffer += 1 << 14;
				}
				drumBuffer = newBuffer;
			}
		} else if (index === 1) {
			// White noise is just random values for each sample.
			for (let i: number = 0; i < Config.chipNoiseLength; i++) {
				wave[i] = Math.random() * 2.0 - 1.0;
			}
		} else if (index === 2) {
			// The "clang" noise wave is based on a similar noise wave in the modded beepbox made by DAzombieRE.
			let drumBuffer: number = 1;
			for (let i: number = 0; i < Config.chipNoiseLength; i++) {
				wave[i] = (drumBuffer & 1) * 2.0 - 1.0;
				let newBuffer: number = drumBuffer >> 1;
				if (((drumBuffer + newBuffer) & 1) === 1) {
					newBuffer += 2 << 14;
				}
				drumBuffer = newBuffer;
			}
		} else if (index === 3) {
			// The "buzz" noise wave is based on a similar noise wave in the modded beepbox made by DAzombieRE.
			let drumBuffer: number = 1;
			for (let i: number = 0; i < Config.chipNoiseLength; i++) {
				wave[i] = (drumBuffer & 1) * 2.0 - 1.0;
				let newBuffer: number = drumBuffer >> 1;
				if (((drumBuffer + newBuffer) & 1) === 1) {
					newBuffer += 10 << 2;
				}
				drumBuffer = newBuffer;
			}
		} else if (index === 4) {
			// "hollow" drums, designed in frequency space and then converted via FFT:
			drawNoiseSpectrum(wave, Config.chipNoiseLength, 10, 11, 1, 1, 0);
			drawNoiseSpectrum(wave, Config.chipNoiseLength, 11, 14, 0.6578, 0.6578, 0);
			inverseRealFourierTransform!(wave, Config.chipNoiseLength);
			scaleElementsByFactor!(wave, 1.0 / Math.sqrt(Config.chipNoiseLength));
		} else if (index === 5) {
			// "Shine" drums from modbox!
			let drumBuffer = 1;
			for (let i = 0; i < Config.chipNoiseLength; i++) {
				wave[i] = (drumBuffer & 1) * 2.0 - 1.0;
				let newBuffer = drumBuffer >> 1;
				if (((drumBuffer + newBuffer) & 1) === 1) {
					newBuffer += 10 << 2;
				}
				drumBuffer = newBuffer;
			}
		} else if (index === 6) {
			// "Deep" drums from modbox!
			drawNoiseSpectrum(wave, Config.chipNoiseLength, 1, 10, 1, 1, 0);
			drawNoiseSpectrum(wave, Config.chipNoiseLength, 20, 14, -2, -2, 0);
			inverseRealFourierTransform!(wave, Config.chipNoiseLength);
			scaleElementsByFactor!(wave, 1.0 / Math.sqrt(Config.chipNoiseLength));
		} else if (index === 7) {
			// "Cutter" drums from modbox!
			let drumBuffer = 1;
			for (let i = 0; i < Config.chipNoiseLength; i++) {
				wave[i] = (drumBuffer & 1) * 4.0 * (Math.random() * 14 + 1) - 8.0;
				let newBuffer = drumBuffer >> 1;
				if (((drumBuffer + newBuffer) & 1) === 1) {
					newBuffer += 15 << 2;
				}
				drumBuffer = newBuffer;
			}
		} else if (index === 8) {
			// "Metallic" drums from modbox!
			let drumBuffer = 1;
			for (let i = 0; i < Config.chipNoiseLength; i++) {
				wave[i] = (drumBuffer & 1) / 2.0 - 0.5;
				let newBuffer = drumBuffer >> 1;
				if (((drumBuffer + newBuffer) & 1) === 1) {
					newBuffer -= 10 << 2;
				}
				drumBuffer = newBuffer;
			}
		} else if (index === 9) {
			// a noise more like old static than white noise
			let drumBuffer: number = 1;
			for (let i: number = 0; i < Config.chipNoiseLength; i++) {
				wave[i] = (drumBuffer & 1) * 2.0 - 1.1;
				let newBuffer: number = drumBuffer >> 1;
				if (((drumBuffer + newBuffer) & 1) === 1) {
					newBuffer += 8 ^ (2 << 16);
				}
				drumBuffer = newBuffer;
			}
		} else if (index === 10) {
			for (let i = 0; i < Config.chipNoiseLength; i++) {
				wave[i] = Math.round(Math.random());
			}
		} else if (index === 11) {
			let drumBuffer = 1;
			for (let i = 0; i < Config.chipNoiseLength; i++) {
				wave[i] = Math.round(drumBuffer & 1);
				let newBuffer = drumBuffer >> 1;
				if (((drumBuffer + newBuffer) & 1) === 1) {
					newBuffer -= 10 << 2;
				}
				drumBuffer = newBuffer;
			}
		} else if (index === 12) {
			for (let i = 0; i < Config.chipNoiseLength; i++) {
				const ultraboxnewchipnoiserand = Math.random();
				wave[i] = ultraboxnewchipnoiserand ** Math.clz32(ultraboxnewchipnoiserand);
			}
		} else if (index === 13) {
			// https://noisehack.com/generate-noise-web-audio-api/
			let b0 = 0,
				b1 = 0,
				b2 = 0,
				b3,
				b4,
				b5,
				b6;
			b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;

			for (let i = 0; i < Config.chipNoiseLength; i++) {
				const white = Math.random() * 2 - 1;
				b0 = 0.99886 * b0 + white * 0.0555179;
				b1 = 0.99332 * b1 + white * 0.0750759;
				b2 = 0.969 * b2 + white * 0.153852;
				b3 = 0.8665 * b3 + white * 0.3104856;
				b4 = 0.55 * b4 + white * 0.5329522;
				b5 = -0.7616 * b5 - white * 0.016898;
				wave[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
				wave[i] *= 0.44;
				b6 = white * 0.115926;
			}
		} else if (index === 14) {
			let lastOut = 0.0;

			for (let i = 0; i < Config.chipNoiseLength; i++) {
				const white = Math.random() * 2 - 1;
				wave[i] = (lastOut + 0.02 * white) / 1.02;
				lastOut = wave[i];
				wave[i] *= 14;
			}
		} else {
			throw new Error(`Unrecognized drum index: ${index}`);
		}

		wave[Config.chipNoiseLength] = wave[0];
	}

	return wave;
}

export function drawNoiseSpectrum(
	wave: Float32Array,
	waveLength: number,
	lowOctave: number,
	highOctave: number,
	lowPower: number,
	highPower: number,
	overallSlope: number,
): number {
	const referenceOctave: number = 11;
	const referenceIndex: number = 1 << referenceOctave;
	const lowIndex: number = (2 ** lowOctave) | 0;
	const highIndex: number = Math.min(waveLength >> 1, (2 ** highOctave) | 0);
	const retroWave: Float32Array = getDrumWave(0, null, null);
	let combinedAmplitude: number = 0.0;
	for (let i: number = lowIndex; i < highIndex; i++) {
		const lerped: number =
			lowPower +
			((highPower - lowPower) * (Math.log2(i) - lowOctave)) / (highOctave - lowOctave);
		let amplitude: number = 2 ** ((lerped - 1) * 7 + 1) * lerped;

		amplitude *= (i / referenceIndex) ** overallSlope;

		combinedAmplitude += amplitude;

		amplitude *= retroWave[i];
		const radians: number = 0.61803398875 * i * i * Math.PI * 2.0;

		wave[i] = Math.cos(radians) * amplitude;
		wave[waveLength - i] = Math.sin(radians) * amplitude;
	}

	return combinedAmplitude;
}

export function getArpeggioPitchIndex(
	pitchCount: number,
	useFastTwoNoteArp: boolean,
	arpeggio: number,
): number {
	let arpeggioPattern: ReadonlyArray<number> = Config.arpeggioPatterns[pitchCount - 1];
	if (arpeggioPattern != null) {
		if (pitchCount === 2 && !useFastTwoNoteArp) {
			arpeggioPattern = [0, 0, 1, 1];
		}
		return arpeggioPattern[arpeggio % arpeggioPattern.length];
	} else {
		return arpeggio % pitchCount;
	}
}

export function calculateRingModHertz(sliderHz: number, _sliderHzOffset: number = 0): number {
	if (sliderHz === 0) return 0;
	if (sliderHz > 0) sliderHz -= 1 / Config.ringModHzRange;
	if (sliderHz > 1 / Config.ringModHzRange) sliderHz += 1 / Config.ringModHzRange;
	return Math.floor(
		Config.ringModMinHz * (Config.ringModMaxHz / Config.ringModMinHz) ** sliderHz,
	);
}
