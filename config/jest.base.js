module.exports = {
    transform: {
        '^.+\\.(js|jsx|ts|tsx)$': 'ts-jest',
    },
    preset: "ts-jest",
    verbose: true,

    globals: {
        "ts-jest": {
            "diagnostics": {
              "warnOnly": true
            },
            "isolatedModules": true
          }
    },

    moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
    testURL: 'http://localhost',
    testEnvironment: "jsdom",

    testMatch: ['<rootDir>/__tests__/**/*.ts'],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/lib/',
        '<rootDir>/lib/',
    ],
    coverageThreshold: {
        global: {
          "branches": 0,
          "functions": 0,
          "lines": 0,
          "statements": 0
        }
      },
};