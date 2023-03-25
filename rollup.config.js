import sucrase from "@rollup/plugin-sucrase";
import dts from "rollup-plugin-dts";

export default [
  {
    input: "module.ts",
    plugins: [sucrase({
      transforms: ["typescript"],
      disableESTransforms: true,
    })],
    output: {
      file: "module.js",
      format: "es",
      sourcemap: true,
    },
  },
  {
    input: "module.ts",
    plugins: [dts()],
    output: {
      file: "module.d.ts",
      format: "es",
    },
  },
];
