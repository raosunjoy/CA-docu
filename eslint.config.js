import js from '@eslint/js'
import { FlatCompat } from '@eslint/eslintrc'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  recommendedConfig: js.configs.recommended,
})

const config = [
  {
    ignores: [
      '.next/**',
      'coverage/**',
      'node_modules/**',
      '.git/**',
      'generated/**'
    ]
  },
  ...compat.extends('next/core-web-vitals'),
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },
    rules: {
      // Code complexity and maintainability
      'max-lines-per-function': ['error', 75],
      'complexity': ['error', 10],
      'max-depth': ['error', 4],
      'max-params': ['error', 4],
      'max-lines': ['error', 500],
      
      // Code quality
      'no-console': 'error',
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-void': 'error',
      'no-with': 'error',
      
      // TypeScript specific
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      
      // Security
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      
      // Best practices
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'no-duplicate-imports': 'error',
      'no-useless-return': 'error',
      'no-useless-concat': 'error',
      'no-useless-escape': 'error',
      
      // CA-specific rules
      'no-magic-numbers': ['error', { 
        ignore: [0, 1, -1, 100, 1000],
        ignoreArrayIndexes: true,
        ignoreDefaultValues: true
      }],
      'prefer-template': 'error',
      'no-nested-ternary': 'error',
      'consistent-return': 'error'
    }
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**/*.ts', '**/__tests__/**/*.tsx'],
    rules: {
      'no-console': 'off',
      'max-lines-per-function': 'off',
      'complexity': 'off'
    }
  },
  {
    files: ['*.config.js'],
    rules: {
      'import/no-anonymous-default-export': 'off'
    }
  }
]

export default config