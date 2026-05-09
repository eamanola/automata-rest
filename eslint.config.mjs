import airbnb from 'eslint-stylistic-airbnb';
// import react from 'eslint-plugin-react';
// import reactHooks from 'eslint-plugin-react-hooks';
import { configs as importConfigs } from 'eslint-plugin-import-x';
import globals from 'globals';
import js from '@eslint/js';

const SHOW_WARNINGS = 'off';

export default [
  // artifacts
  {
    ignores: ['public/*', 'dist/*'],
  },

  // base
  js.configs.recommended,
  importConfigs['flat/recommended'],

  // // react
  // {
  //   // languageOptions and plugins should be identical?
  //   files: ['**/*.jsx', '**/*.js'],
  //   languageOptions: {
  //     ...react.configs.flat.all.languageOptions,
  //     // ...react.configs.flat['jsx-runtime'].languageOptions,
  //     // ...reactHooks.configs.flat['recommended-latest'].languageOptions,
  //     // ...importConfigs['flat/react'].languageOptions,
  //     // ...airbnb.configs['flat/addon-react'].languageOptions,
  //     // ...airbnb.configs['flat/addon-jsx'].languageOptions,

  //     globals: {
  //       ...globals.browser,
  //     },
  //   },
  //   plugins: {
  //     ...react.configs.flat.all.plugins,
  //     // ...react.configs.flat['jsx-runtime'].plugins,
  //     ...reactHooks.configs.flat['recommended-latest'].plugins,
  //     // ...importConfigs['flat/react'].plugins,
  //     // ...airbnb.configs['flat/addon-react'].plugins,
  //     // ...airbnb.configs['flat/addon-jsx'].plugins,
  //   },
  //   rules: {
  //     ...react.configs.flat.all.rules,
  //     // with React 17+
  //     ...react.configs.flat['jsx-runtime'].rules,
  //     ...reactHooks.configs.flat['recommended-latest'].rules,
  //     ...importConfigs['flat/react'].rules,
  //     // requires eslint-plugin-react
  //     // recommended eslint-plugin-react-hooks
  //     ...airbnb.configs['flat/addon-react'].rules,
  //     ...airbnb.configs['flat/addon-jsx'].rules,

  //     // https://github.com/jsx-eslint/eslint-plugin-react/tree/master/docs/rules
  //     'react/function-component-definition': [2, { namedComponents: 'arrow-function' }],
  //     'react/jsx-indent': ['error', 2],
  //     'react/jsx-indent-props': ['error', 2],
  //     'react/jsx-max-props-per-line': [
  //       'error',
  //       {
  //         maximum: { multi: 1, single: 3 },
  //         // maximum: 1
  //         // only work, if maximum is number
  //         // when: 'multiline',
  //       },
  //     ],
  //     'react/jsx-no-literals': ['off'],
  //   },
  //   settings: {
  //     react: {
  //       version: 'detect',
  //     },
  //   },
  // },

  // airbnb
  airbnb.configs['flat/strict'],
  // requires import-x
  airbnb.configs['flat/addon-import'],

  // eslint-stylistic-airbnb deprecated overrides
  {
    rules: {
      // known by maintainer, fix upstream
      // '@stylistic/jsx-indent': ['error', 2],
      '@stylistic/line-comment-position': [
        'error',
        {
          applyDefaultIgnorePatterns: true,
          ignorePattern: '',
          position: 'above',
        },
      ],
    },
  },

  // general
  {
    rules: {
      '@stylistic/max-len': ['error', { code: 100 }],
      '@stylistic/multiline-ternary': ['error', 'always-multiline'],
      'no-console': [
        SHOW_WARNINGS,
        {
          allow: [
            'info',
            'warn',
            'error',
          ],
        },
      ],
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
      },
    },
  },

  // commonjs
  {
    files: ['**/*.cjs'],
    rules: {
      'import/no-commonjs': ['off'],
    },
  },

  // dev files
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'import-x/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            'eslint.config.mjs',
            'webpack.config.cjs',
            '**/*.test.js',
            'vite.config.js',
          ],
        },
      ],
    },
  },
];
