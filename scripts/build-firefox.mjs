import { spawnSync } from "node:child_process";

const env = { ...process.env, BROWSER: "firefox" };

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: true,
    env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("npx", ["tsc", "--noEmit"]);
run("npx", ["vite", "build"]);
run("node", ["scripts/copy-public.mjs"]);

console.log("Firefox build ready in dist-firefox/");
