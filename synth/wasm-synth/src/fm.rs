// fm.rs
//
// Purpose: FM synthesis DSP — operator phase accumulation, modulation, and output
//
// This module:
// - Implements multi-operator FM synthesis with configurable algorithm routing
// - Uses flat array convention: state[0..N] for operator phases, params for tuning

use std::sync::OnceLock;
use wasm_bindgen::prelude::*;

const SINE_WAVE_LENGTH: usize = 1 << 11; // 2048, matches Config.sineWaveLength
const SINE_WAVE_MASK: usize = SINE_WAVE_LENGTH - 1;
const OPERATOR_COUNT: usize = 6;

/// Generate sine lookup table once, then share immutable reference.
fn sine_table() -> &'static [f32; SINE_WAVE_LENGTH + 2] {
    static TABLE: OnceLock<[f32; SINE_WAVE_LENGTH + 2]> = OnceLock::new();
    TABLE.get_or_init(|| {
        let mut table = [0.0f32; SINE_WAVE_LENGTH + 2];
        for i in 0..SINE_WAVE_LENGTH + 1 {
            table[i] = (2.0 * std::f32::consts::PI * (i as f32) / SINE_WAVE_LENGTH as f32).sin();
        }
        table[SINE_WAVE_LENGTH + 1] = table[1]; // wrap for interpolation
        table
    })
}

/// Bilinear-interpolated sine lookup.
#[inline(always)]
fn sine_sample(phase: f32) -> f32 {
    let table = sine_table();
    let index = phase as usize & SINE_WAVE_MASK;
    let frac = phase - phase.floor();
    let a = table[index];
    let b = table[index + 1];
    a + (b - a) * frac
}

/// FM synthesis entry point.
///
/// # Flat array layout
///
/// **state** (Float32Array, per-operator × 3 + feedback):
/// - `[0..6]`   operator phases (6 operators)
/// - `[6..12]`  operator output multipliers (expression)
/// - `[12..18]` feedback outputs (previous sample per operator)
/// - `[18]`     feedback multiplier
/// - `[19]`     expression
/// - `[20..26]` operator phase deltas
/// - `[26..32]` operator phase delta scales
///
/// **params** (Float32Array, per-operator × 3 + global):
/// - `[0..6]`   operator frequencies (as phase deltas, pre-scaled to sine table)
/// - `[6..12]`  operator amplitudes
/// - `[12]`     feedback amount
/// - `[13]`     expression delta per sample
/// - `[14]`     feedback delta per sample
///
/// **config** (Uint32Array):
/// - `[0]`      algorithm index (0-7)
/// - `[1]`      feedback type
/// - `[2]`      carrier count
///
/// **buffer_index**: starting offset in output buffer
/// **samples**: number of samples to render
#[wasm_bindgen]
pub fn fm_synth(
    output: &mut [f32],
    buffer_index: usize,
    samples: usize,
    state: &mut [f32],
    params: &[f32],
    config: &[u32],
) {
    let algorithm = config[0] as usize;
    let feedback_type = config[1] as usize;
    let carrier_count = config[2] as usize;

    // Algorithm routing: which operators modulate which.
    // Matches Config.algorithms[].modulatedBy in the TS codebase.
    // Each entry lists (target, sources).
    let routing = algorithm_routing(algorithm);
    let feedback_indices = feedback_targets(feedback_type);

    // Unpack state
    let mut phases = [0.0f32; OPERATOR_COUNT];
    let mut phase_deltas = [0.0f32; OPERATOR_COUNT];
    let mut phase_delta_scales = [0.0f32; OPERATOR_COUNT];
    let mut output_mults = [0.0f32; OPERATOR_COUNT];
    let mut feedback_outputs = [0.0f32; OPERATOR_COUNT];
    let mut feedback_mult = state[18];
    let mut expression = state[19];

    for i in 0..OPERATOR_COUNT {
        phases[i] = state[i] + 1000.0; // offset to avoid negative phases
        phases[i] *= SINE_WAVE_LENGTH as f32;
        phase_deltas[i] = state[20 + i] * SINE_WAVE_LENGTH as f32;
        phase_delta_scales[i] = state[26 + i];
        output_mults[i] = state[6 + i];
        feedback_outputs[i] = state[12 + i];
    }

    let expression_delta = params[13];
    let feedback_delta = params[14];

    let stop = buffer_index + samples;
    for sample_idx in buffer_index..stop {
        // Compute operators from last to first (modulators before carriers)
        let mut scaled = [0.0f32; OPERATOR_COUNT];

        for op in (0..OPERATOR_COUNT).rev() {
            // Phase mix: own phase + sum of modulator outputs
            let mut phase_mix = phases[op];
            for &src in &routing[op] {
                phase_mix += scaled[src];
            }

            // Feedback
            if feedback_indices[op] {
                phase_mix += feedback_mult * feedback_outputs.iter().enumerate()
                    .filter(|&(i, _)| feedback_indices[i])
                    .map(|(_, &v)| v)
                    .sum::<f32>();
            }

            let sample = sine_sample(phase_mix);
            feedback_outputs[op] = sample;
            scaled[op] = output_mults[op] * sample;

            // Advance phase
            phases[op] += phase_deltas[op];
            phase_deltas[op] *= phase_delta_scales[op];
            output_mults[op] += params[6 + op]; // amplitude delta (from params)
        }

        // Output: sum of carriers
        let mut fm_output = 0.0;
        for i in 0..carrier_count {
            fm_output += scaled[i];
        }

        let out = fm_output * expression;
        expression += expression_delta;
        feedback_mult += feedback_delta;

        output[sample_idx] += out;
    }

    // Write back state
    for i in 0..OPERATOR_COUNT {
        state[i] = phases[i] / SINE_WAVE_LENGTH as f32;
        state[6 + i] = output_mults[i];
        state[12 + i] = feedback_outputs[i];
        state[20 + i] = phase_deltas[i] / SINE_WAVE_LENGTH as f32;
    }
    state[18] = feedback_mult;
    state[19] = expression;
}

/// Returns which operators modulate each operator.
/// Index = target operator, value = list of source operator indices.
fn algorithm_routing(algorithm: usize) -> [Vec<usize>; OPERATOR_COUNT] {
    // Matches Config.algorithms from synth-config.ts
    // 8 algorithms, each with different modulator→carrier topology.
    // TODO: port exact algorithm definitions from synth-config.ts
    match algorithm {
        0 => [vec![1], vec![2], vec![3], vec![], vec![], vec![]],           // 1→2→3→carrier
        1 => [vec![1, 2], vec![3], vec![], vec![], vec![], vec![]],         // (1+2)→3→carrier
        2 => [vec![1], vec![2, 3], vec![], vec![], vec![], vec![]],         // 1→(2+3)→carrier
        3 => [vec![1], vec![], vec![2], vec![3], vec![], vec![]],           // parallel pairs
        4 => [vec![], vec![], vec![], vec![], vec![], vec![]],              // all carriers
        5 => [vec![1], vec![2], vec![], vec![], vec![], vec![]],            // 1→2→carrier
        6 => [vec![1, 2, 3], vec![], vec![], vec![], vec![], vec![]],       // (1+2+3)→carrier
        7 => [vec![], vec![], vec![], vec![], vec![], vec![]],              // all independent
        _ => [vec![], vec![], vec![], vec![], vec![], vec![]],
    }
}

/// Returns which operators participate in feedback routing.
fn feedback_targets(feedback_type: usize) -> [bool; OPERATOR_COUNT] {
    let mut result = [false; OPERATOR_COUNT];
    // Matches Config.feedbacks from synth-config.ts
    // TODO: port exact feedback definitions
    match feedback_type {
        0 => {}                               // no feedback
        1 => { result[0] = true; }            // operator 0 self-feedback
        2 => { result[0] = true; result[1] = true; } // operators 0-1 feedback
        _ => {}
    }
    result
}
