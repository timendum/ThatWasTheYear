/// esbuild plugin that runs the React Compiler (babel-plugin-react-compiler)

import type { Plugin } from "esbuild";
import { readFile } from "node:fs/promises";
import * as babel from "@babel/core";

export function reactCompilerPlugin(): Plugin {
  return {
    name: "react-compiler",
    setup(build) {
      build.onLoad({ filter: /\.tsx$/ }, async (args) => {
        const source = await readFile(args.path, "utf8");

        const result = await babel.transformAsync(source, {
          filename: args.path,
          babelrc: false,
          configFile: false,
          sourceMaps: "inline",
          parserOpts: { plugins: ["jsx", "typescript"] },
          plugins: [["babel-plugin-react-compiler", { target: "19" }]],
          presets: ["@babel/preset-typescript"],
        });

        if (!result?.code) {
          return { contents: source, loader: "tsx" };
        }

        // preset-typescript has already stripped the TS syntax, so hand the
        // output to esbuild as plain jsx.
        return { contents: result.code, loader: "jsx" };
      });
    },
  };
}
