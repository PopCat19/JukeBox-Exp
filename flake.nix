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
          ];

          shellHook = ''
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
