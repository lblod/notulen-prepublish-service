import globals from 'globals';
import pluginJs from '@eslint/js';
/** @import { Linter } from 'eslint' */
import mochaPlugin from 'eslint-plugin-mocha';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

/** @type {Linter.Config[]} */
export default [
  pluginJs.configs.recommended,
  mochaPlugin.configs.flat.recommended,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: globals.node,
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      semi: ['error', 'always'],
      'linebreak-style': ['error', 'unix'],
    },
  },
];
