module.exports = {
  // Basic formatting
  semi: false,
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'es5',
  
  // Indentation
  tabWidth: 2,
  useTabs: false,
  
  // Line length
  printWidth: 100,
  
  // Bracket spacing
  bracketSpacing: true,
  bracketSameLine: false,
  
  // Arrow functions
  arrowParens: 'avoid',
  
  // JSX
  jsxSingleQuote: false,
  
  // End of line
  endOfLine: 'lf',
  
  // Embedded languages
  embeddedLanguageFormatting: 'auto',
  
  // HTML
  htmlWhitespaceSensitivity: 'css',
  
  // Vue
  vueIndentScriptAndStyle: false,
  
  // Override for specific file types
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 80,
        tabWidth: 2,
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always',
      },
    },
    {
      files: '*.yml',
      options: {
        tabWidth: 2,
      },
    },
  ],
}