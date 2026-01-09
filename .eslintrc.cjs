module.exports = {
    root: true,
    env: {
        browser: true,
        es2022: true,
        node: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'prettier',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaFeatures: {
            jsx: true,
        },
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    plugins: ['@typescript-eslint', 'react', 'react-hooks'],
    settings: {
        react: {
            version: 'detect',
        },
    },
    rules: {
        // React 17+ não precisa de import React
        'react/react-in-jsx-scope': 'off',
        // Permite any quando necessário
        '@typescript-eslint/no-explicit-any': 'warn',
        // Variáveis não usadas como warning
        '@typescript-eslint/no-unused-vars': 'warn',
        // Permite empty functions
        '@typescript-eslint/no-empty-function': 'off',
        // Hooks
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
    },
    ignorePatterns: ['node_modules/', 'dist/', 'build/'],
};
