import { defineConfig } from "eslint/config";
import next from "eslint-config-next";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([
    ...next,
    {
        plugins: {
            "@typescript-eslint": tsPlugin,
        },
        rules: {
            "@typescript-eslint/no-explicit-any": "error",
            "react-hooks/exhaustive-deps": "error",
        },
    },
]);
