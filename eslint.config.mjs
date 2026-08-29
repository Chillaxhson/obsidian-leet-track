import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";

export default tseslint.config(
	{
		ignores: [
			"main.js",
			"esbuild.config.mjs",
			"version-bump.mjs",
			"eslint.config.mjs",
			"node_modules/**",
		],
	},
	eslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	...obsidianmd.configs.recommended,
	{
		languageOptions: {
			parserOptions: {
				project: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			"@typescript-eslint/no-explicit-any": "warn",
			// Allow setWarning for backwards compatibility with minAppVersion 1.5.0
			"@typescript-eslint/no-deprecated": "off",
		},
	}
);
