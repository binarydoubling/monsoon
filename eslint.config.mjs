import stylistic from "@stylistic/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

const blocks = [
  "block-like",
  "class",
  "interface",
  { selector: ":not(ImportDeclaration)", lineMode: "multiline" },
];

export default [
  { ignores: ["dist/**", "release/**"] },
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "@stylistic": stylistic },
    rules: {
      "@stylistic/padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "import", next: "*" },
        { blankLine: "any", prev: "import", next: "import" },
        { blankLine: "always", prev: "*", next: blocks },
        { blankLine: "always", prev: blocks, next: "*" },
      ],
    },
  },
];
