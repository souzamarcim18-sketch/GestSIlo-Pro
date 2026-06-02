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
            // React Compiler rules — downgraded from "error" to "warn" because
            // eslint-config-next v16 introduced these as errors but existing
            // code uses patterns that are valid React (async calls in useEffect,
            // components defined outside render, etc.). Treat as warnings until
            // the codebase is incrementally migrated to compiler-compatible patterns.
            "react-hooks/set-state-in-effect": "warn",
            "react-hooks/static-components": "warn",
            "react-hooks/purity": "warn",
            "react-hooks/preserve-manual-memoization": "warn",
            "react-hooks/immutability": "warn",
        },
    },
]);
