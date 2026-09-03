import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const backendDirectory = path.join(repositoryRoot, "caresphere_backend");
const frontendDirectory = path.join(repositoryRoot, "caresphere_frontend");
const isWindows = process.platform === "win32";
const pythonCommand =
  process.env.E2E_PYTHON ||
  (isWindows
    ? "py"
    : path.join(repositoryRoot, ".venv", "bin", "python"));
const npmCommand = isWindows ? "npm.cmd" : "npm";
const npxCommand = isWindows ? "npx.cmd" : "npx";
const demoPassword = process.env.E2E_DEMO_PASSWORD || "CareSphereE2E!2026";
const databasePath = path
  .join(backendDirectory, "e2e.sqlite3")
  .replaceAll("\\", "/");
const databaseUrl =
  process.env.DATABASE_URL || `sqlite:///${databasePath}`;

const sharedEnvironment = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  DEBUG: "True",
  E2E_DEMO_PASSWORD: demoPassword,
  NEXT_PUBLIC_API_URL: "http://127.0.0.1:8100/api",
  PLAYWRIGHT_BASE_URL: "http://127.0.0.1:3100",
};

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    env: sharedEnvironment,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function start(command, args, cwd) {
  return spawn(command, args, {
    cwd,
    env: sharedEnvironment,
    detached: !isWindows,
    stdio: "inherit",
  });
}

function stop(child) {
  if (!child?.pid || child.exitCode !== null) {
    return;
  }

  if (isWindows) {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    return;
  }

  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
}

async function waitFor(url, label) {
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // The service is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`${label} did not become ready at ${url}.`);
}

run(pythonCommand, ["manage.py", "migrate", "--noinput"], backendDirectory);
run(
  pythonCommand,
  [
    "manage.py",
    "seed_demo_journey",
    "--password",
    demoPassword,
  ],
  backendDirectory
);

const backend = start(
  pythonCommand,
  ["manage.py", "runserver", "127.0.0.1:8100", "--noreload"],
  backendDirectory
);
const frontend = start(
  npmCommand,
  ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", "3100"],
  frontendDirectory
);

let exitCode = 1;

try {
  await Promise.all([
    waitFor("http://127.0.0.1:8100/api/health/", "Backend"),
    waitFor("http://127.0.0.1:3100/login", "Frontend"),
  ]);

  const result = spawnSync(npxCommand, ["playwright", "test"], {
    cwd: frontendDirectory,
    env: sharedEnvironment,
    stdio: "inherit",
  });
  exitCode = result.status ?? 1;
} finally {
  stop(frontend);
  stop(backend);
}

process.exit(exitCode);
