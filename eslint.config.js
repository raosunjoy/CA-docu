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
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },
    rules: {
      // Code complexity and maintainability
      'max-lines-per-function': ['warn', 100],
      'complexity': ['warn', 15],
      'max-depth': ['warn', 5],
      'max-params': ['warn', 5],
      'max-lines': ['warn', 800],
      
      // Code quality
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-void': 'error',
      'no-with': 'error',
      
      // TypeScript specific
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      
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
      'no-magic-numbers': ['warn', { 
        ignore: [0, 1, -1, 2, 3, 4, 5, 10, 20, 30, 50, 100, 200, 300, 400, 500, 1000, 1024],
        ignoreArrayIndexes: true,
        ignoreDefaultValues: true
      }],
      'prefer-template': 'error',
      'no-nested-ternary': 'warn',
      'consistent-return': 'warn', // Relax consistent return requirements
      'no-alert': 'warn', // Allow alerts for debugging
      'react/no-unescaped-entities': 'warn', // Common in JSX text
      '@next/next/no-html-link-for-pages': 'warn', // Allow <a> for external links
      'no-useless-escape': 'warn', // Regex escaping can be necessary
      'react/display-name': 'warn', // Component display names not critical
      '@next/next/no-assign-module-variable': 'warn', // Module assignments sometimes needed
      'no-void': 'warn' // Void operator sometimes useful
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
  },
  {
    files: ['src/services/**/*.ts', 'src/lib/**/*.ts', 'src/middleware/**/*.ts'],
    rules: {
      'no-console': 'warn', // Allow console in services for debugging
      'max-lines-per-function': 'warn', // Relax for service functions
      'complexity': 'warn' // Services can be more complex
    }
  },
  {
    files: ['src/app/api/**/*.ts'],
    rules: {
      'no-console': 'warn', // API routes need console for debugging
      'max-lines-per-function': 'warn', // API routes can be longer
      'complexity': 'warn' // API routes handle multiple scenarios
    }
  },
  {
    files: ['src/app/**/page.tsx', 'src/components/**/*.tsx'],
    rules: {
      'max-lines-per-function': 'warn', // React components can be longer for layout
      'complexity': 'warn' // UI components have conditional rendering
    }
  },
  {
    files: ['prisma/**/*.ts', 'scripts/**/*.ts'],
    rules: {
      'no-console': 'off', // Database scripts need console output
      'max-lines-per-function': 'off', // Scripts can be long
      'complexity': 'off' // Scripts don't need complexity limits
    }
  }
]

export default config