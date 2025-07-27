{
  nixConfig.bash-prompt-prefix = ''\[\e[0;31m\](node) \e[0m'';

  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = inputs:
    inputs.flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = import inputs.nixpkgs {
          inherit system;
          overlays = [inputs.rust-overlay.overlays.default];
        };
      in {
        devShells.default = inputs.self.devShells.${system}.full;

        devShells.full = pkgs.mkShell {
          inputsFrom = [inputs.self.devShells.${system}.base];
          packages = with pkgs; [gh curl jq];
        };

        devShells.base = pkgs.mkShell {
          packages = with pkgs; [
            pnpm
            nodePackages_latest.vscode-langservers-extracted
            nodePackages_latest.nodejs

            vtsls
            prettierd
          ];
        };
      }
    );
}
