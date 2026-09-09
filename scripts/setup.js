import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "..");
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const run = (command, args) =>
  new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: "inherit",
    });

    child.on("error", rejectRun);
    child.on("exit", (code) => {
      if (code === 0) {
        resolveRun();
        return;
      }

      rejectRun(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });

const requireInstalledDependencies = async () => {
  try {
    await access(resolve(rootDir, "node_modules/dotenv/package.json"));
  } catch {
    throw new Error(
      "Dependencies are not installed. Run pnpm install --frozen-lockfile first."
    );
  }
};

const main = async () => {
  await access(resolve(rootDir, "package.json"));
  await access(resolve(rootDir, "docker-compose.yml"));
  await requireInstalledDependencies();

  const { prepareEnvironment } = await import("./setup-env.js");

  console.log("Preparing Geho local development environment...");

  await run("docker", ["info"]);

  const environment = await prepareEnvironment({
    envPath: resolve(rootDir, ".env"),
    examplePath: resolve(rootDir, ".env.example"),
  });

  if (environment.created) {
    console.log("Created .env from .env.example.");
  }

  if (environment.generated.length > 0) {
    console.log(`Generated ${environment.generated.join(" and ")}.`);
  }

  await run(pnpmCommand, ["infra:up"]);
  await run(pnpmCommand, ["infra:check"]);
  await run(pnpmCommand, ["--filter", "@geho/db", "db:migrate"]);

  console.log(`
Geho is ready.

Start the development apps:
  pnpm dev

Dashboard: http://localhost:3000
API:       http://localhost:4000
`);
};

main().catch((error) => {
  console.error(
    error instanceof Error ? `Setup failed: ${error.message}` : "Setup failed."
  );
  process.exitCode = 1;
});
