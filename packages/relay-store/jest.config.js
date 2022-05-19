module.exports = {
    ...require('../../config/jest.base.js'),
    testEnvironment: 'node',
    globals: {
        __DEV__: true,
        'ts-jest': {
            astTransformers: {
                before: ['ts-relay-plugin'],
            },
            diagnostics: {
                warnOnly: true,
            },
            isolatedModules: true,
        },
    },
    timers: 'fake',
};
