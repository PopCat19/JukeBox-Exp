// filter.rs
//
// Purpose: Biquad filter processing for note and EQ filters
//
// This module:
//! - Implements cascaded biquad IIR filters
//! - Processes filter chains inline with synthesis output
//!
//! Port target: filtering.ts DynamicBiquadFilter + applyFilters from synth.ts

use wasm_bindgen::prelude::*;

/// Single biquad filter section (Direct Form I).
pub struct BiquadFilter {
    pub b0: f32,
    pub b1: f32,
    pub b2: f32,
    pub a1: f32,
    pub a2: f32,
    pub x1: f32,
    pub x2: f32,
    pub y1: f32,
    pub y2: f32,
}

impl BiquadFilter {
    pub const fn new() -> Self {
        Self {
            b0: 1.0, b1: 0.0, b2: 0.0,
            a1: 0.0, a2: 0.0,
            x1: 0.0, x2: 0.0,
            y1: 0.0, y2: 0.0,
        }
    }

    #[inline(always)]
    pub fn process(&mut self, input: f32) -> f32 {
        let output = self.b0 * input + self.b1 * self.x1 + self.b2 * self.x2
            - self.a1 * self.y1 - self.a2 * self.y2;
        self.x2 = self.x1;
        self.x1 = input;
        self.y2 = self.y1;
        self.y1 = output;
        output
    }

    pub fn set_coefficients(&mut self, b0: f32, b1: f32, b2: f32, a1: f32, a2: f32) {
        self.b0 = b0;
        self.b1 = b1;
        self.b2 = b2;
        self.a1 = a1;
        self.a2 = a2;
    }
}

/// Apply a chain of biquad filters to a sample.
/// Matches Synth.applyFilters from synth.ts.
#[wasm_bindgen]
pub fn apply_filters(
    input: f32,
    initial_input1: f32,
    initial_input2: f32,
    filter_count: usize,
    coefficients: &[f32], // flat: [b0, b1, b2, a1, a2] × filter_count
    state: &mut [f32],    // flat: [x1, x2, y1, y2] × filter_count
) -> f32 {
    let mut sample = input;
    for i in 0..filter_count {
        let base = i * 5;
        let state_base = i * 4;

        let b0 = coefficients[base];
        let b1 = coefficients[base + 1];
        let b2 = coefficients[base + 2];
        let a1 = coefficients[base + 3];
        let a2 = coefficients[base + 4];

        let x1 = if i == 0 { initial_input1 } else { state[state_base] };
        let x2 = if i == 0 { initial_input2 } else { state[state_base + 1] };
        let y1 = state[state_base + 2];
        let y2 = state[state_base + 3];

        let output = b0 * sample + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;

        state[state_base] = sample;
        state[state_base + 1] = x1;
        state[state_base + 2] = output;
        state[state_base + 3] = y1;

        sample = output;
    }
    sample
}
