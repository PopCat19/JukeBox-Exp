//! # jukebox-synth
//!
//! Purpose: WASM synthesis engine for JukeBox-Exp, compiled via wasm-pack.
//!
//! This crate:
//! - Exports synthesis functions to JavaScript via wasm-bindgen
//! - Operates on flat Float32Array/Uint32Array buffers to minimize marshalling overhead

mod fm;
mod filter;

pub use fm::fm_synth;
