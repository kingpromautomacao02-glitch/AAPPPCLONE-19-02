import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default [
    js.configs.recommended,
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaFeatures: { jsx: true },
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
            globals: {
                window: 'readonly',
                document: 'readonly',
                localStorage: 'readonly',
                console: 'readonly',
                fetch: 'readonly',
                crypto: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                process: 'readonly',
                HTMLDivElement: 'readonly',
                HTMLInputElement: 'readonly',
                MouseEvent: 'readonly',
                Node: 'readonly',
                File: 'readonly',
                FileReader: 'readonly',
                Blob: 'readonly',
                URL: 'readonly',
                Image: 'readonly',
                alert: 'readonly',
                confirm: 'readonly',
                NodeJS: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
            'react': reactPlugin,
            'react-hooks': reactHooksPlugin,
        },
        settings: {
            react: { version: 'detect' },
        },
        rules: {
            // React 17+ não precisa de import React
            'react/react-in-jsx-scope': 'off',
            // Permite any quando necessário
            '@typescript-eslint/no-explicit-any': 'off',
            // Variáveis não usadas como warning
            '@typescript-eslint/no-unused-vars': 'warn',
            'no-unused-vars': 'off',
            // Permite empty functions
            '@typescript-eslint/no-empty-function': 'off',
            // Hooks
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
            // Permite require
            '@typescript-eslint/no-require-imports': 'off',
        },
    },
    {
        ignores: ['node_modules/', 'dist/', 'build/', '*.config.*'],
    },
];
