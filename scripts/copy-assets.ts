// To copy static assets in the build phase.
import { cpSync } from "fs";

cpSync("assets", "dist/", { recursive: true });
