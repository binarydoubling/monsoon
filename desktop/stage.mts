import { readFileSync, writeFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));

writeFileSync(
  "dist/app/package.json",
  JSON.stringify({
    name: "monsoon",
    productName: "Monsoon",
    version,
    main: "main.cjs",
  }),
);
