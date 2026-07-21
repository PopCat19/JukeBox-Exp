# flake.nix
#
# Purpose: Define Nix flake with package, devshell, and overlay outputs for JukeBox-Exp
#
{
  description = "JukeBox-Exp dev environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { nixpkgs, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = with pkgs; [
            bun
            nodejs
            biome
            shfmt
            shellcheck
            # Rust / WASM toolchain
            cargo
            rustc
            rust-analyzer
            wasm-pack
            lld
            binaryen # wasm-opt for post-build optimization
          ];

          shellHook = ''
            export RUST_SRC_PATH="${pkgs.rust.packages.stable.rustPlatform.rustLibSrc}"
            if [ ! -d node_modules ]; then
              if command -v bun &>/dev/null; then
                bun install
              else
                npm install
              fi
            fi
          '';
        };
      });
    };
}
