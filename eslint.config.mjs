import airbnb from 'eslint-stylistic-airbnb';
import { configs as importConfigs } from 'eslint-plugin-import-x';
import globals from 'globals';
import js from '@eslint/js';

const SHOW_WARNINGS = 'off';

export default [
  // artifacts
  {
    ignores: ['dist/*'],
  },

  // base
  js.configs.recommended,
  importConfigs['flat/recommended'],

  // airbnb
  airbnb.configs['flat/strict'],
  // requires import-x
  airbnb.configs['flat/addon-import'],

  // general
  {
    rules: {
      '@stylistic/array-bracket-newline': ['error', 'consistent'],
      '@stylistic/array-element-newline': ['error', 'consistent'],
      '@stylistic/multiline-ternary': ['error', 'always-multiline'],
      'no-console': [SHOW_WARNINGS, { allow: ['info', 'warn', 'error'] }],
      'prefer-named-capture-group': ['error'],
      'require-unicode-regexp': ['error'],
      'sort-keys': ['warn'],
    },
  },

  // test
  {
    files: ['**/*.test.js', 'jest/**'],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
    rules: {
      'import-x/no-extraneous-dependencies': ['error', { devDependencies: true }],
    },
  },

  // dev files
  {
    files: ['eslint.config.mjs', 'esbuild.config.cjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'import-x/no-extraneous-dependencies': ['error', { devDependencies: true }],
    },
  },

  // project specific
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
