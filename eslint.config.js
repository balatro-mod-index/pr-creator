import prettier from "eslint-config-prettier";
import neverthrow from "eslint-plugin-neverthrow";
import js from "@eslint/js";
import {includeIgnoreFile} from "@eslint/compat";
import globals from "globals";
import {fileURLToPath} from "node:url";
import ts from "typescript-eslint";

const gitignorePath = fileURLToPath(new URL("./.gitignore", import.meta.url));

export default ts.config(
  includeIgnoreFile(gitignorePath),
  js.configs.recommended,
  ...ts.configs.recommended,
  prettier,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.ts", "**/*.js"],
    ignores: ["eslint.config.js"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        parser: ts.parser,
      },
    },
    plugins: {neverthrow},
    rules: {
      "neverthrow/must-use-result": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {argsIgnorePattern: "^_", varsIgnorePattern: "^_"},
      ],
    },
  },
);
