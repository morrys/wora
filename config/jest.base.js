module.exports = {
    transform: {
        '^.+\\.(js|jsx|ts|tsx)$': 'ts-jest',
    },
    preset: 'ts-jest',
    verbose: true,

    globals: {
        __DEV__: true,
        'ts-jest': {
            diagnostics: {
                warnOnly: true,
            },
            isolatedModules: true,
        },
    },

    moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
    testURL: 'http://localhost',
    testEnvironment: 'jsdom',

    testMatch: ['<rootDir>/__tests__/**/*-test.ts'],
    testPathIgnorePatterns: ['../../node_modules/', '/node_modules/', '/lib/', '<rootDir>/lib/', '<rootDir>/node_modules/'],
    transformIgnorePatterns: ['node_modules/(?!(@react-native-community|react-native))'],
    coverageThreshold: {
        global: {
            branches: 0,
            functions: 0,
            lines: 0,
            statements: 0,
        },
    },
    setupFiles: ['../../scripts/setup.ts'],
};
