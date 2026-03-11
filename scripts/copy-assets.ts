import { cpSync } from "fs";

cpSync("assets", "dist/", { recursive: true });
