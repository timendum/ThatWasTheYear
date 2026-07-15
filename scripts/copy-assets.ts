// To copy static assets in the build phase.
import { cpSync } from "node:fs";
import { resolve } from "node:path";

cpSync(resolve("assets"), resolve("dist"), { recursive: true });
