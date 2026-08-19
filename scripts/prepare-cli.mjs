import { mkdirSync, writeFileSync } from "node:fs";

mkdirSync("dist/cli", { recursive: true });
writeFileSync(
  "dist/cli/index.js",
  `#!/usr/bin/env node
import { main } from "../src/cli/index.js";

process.exitCode = await main();
`,
  { mode: 0o755 },
);
