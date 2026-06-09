#!/usr/bin/env node
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const root = path.dirname(fileURLToPath(import.meta.url));
execSync(`npx electron "${path.join(root, "electron", "main.js")}"`, { stdio: "inherit", cwd: root });
