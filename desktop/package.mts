import { packager } from "@electron/packager";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const { version } = JSON.parse(
  readFileSync("node_modules/electron/package.json", "utf8"),
);

const [output] = await packager({
  dir: "dist/app",
  name: "Monsoon",
  out: "release",
  asar: true,
  overwrite: true,
  prune: false,
  electronVersion: version,
  appBundleId: "app.monsoon.atlas.macos",
  appCategoryType: "public.app-category.weather",
  ...(process.platform === "darwin" && { icon: "desktop/Monsoon.icns" }),
});

if (process.platform === "darwin") {
  const bundle = join(output, "Monsoon.app");

  execFileSync("codesign", ["--force", "--deep", "--sign", "-", bundle], {
    stdio: "inherit",
  });

  execFileSync("codesign", ["--verify", "--deep", "--strict", bundle], {
    stdio: "inherit",
  });
}

console.log(output);
