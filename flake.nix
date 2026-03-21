{
  description = "Slarmoo's Box - online music sketching tool";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        formatter = pkgs.nixfmt;

        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            bun
            shfmt
            shellcheck
            nixfmt
          ];
        };

        packages.default =
          let
            deps = pkgs.stdenv.mkDerivation {
              name = "slarmoosbox-deps";
              src = ./.;
              nativeBuildInputs = [ pkgs.bun ];
              buildPhase = ''
                bun install --frozen-lockfile --no-save
              '';
              installPhase = ''
                cp -r node_modules $out
              '';
              outputHashAlgo = "sha256";
              outputHashMode = "recursive";
              outputHash = pkgs.lib.fakeSha256;
            };
          in
          pkgs.stdenv.mkDerivation {
            pname = "slarmoosbox";
            version = "0.1.4";
            src = ./.;
            nativeBuildInputs = [ pkgs.bun ];
            buildPhase = ''
              cp -r ${deps} node_modules
              chmod -R u+w node_modules
              bun run build
            '';
            installPhase = ''
              mkdir -p $out
              cp -r website $out/
            '';
            meta.mainProgram = "slarmoosbox";
          };

        checks.build = self.packages.${system}.default;

        apps.default = {
          type = "app";
          program = toString (
            pkgs.writeShellScript "serve" ''
              exec ${pkgs.bun}/bin/bun run live_editor_typeless
            ''
          );
        };
      }
    );
}
