{
  description = "Teak Shell";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = nixpkgs.legacyPackages.${system};
    in {
      devShells.default = with pkgs;
        mkShell {
          packages = [
            nodejs
            bun
            pnpm
            vercel-pkg
            vscode-langservers-extracted
            eslint
            eslint_d
            tailwindcss-language-server
            typescript-language-server
            typescript
            prettierd
          ];
          shellHook = ''
            export SHELL=$(which zsh)
            export NVIM_APPNAME=nvim-chad
          '';
        };
    });
}
