module.exports = {
    ...require('../../config/jest.base.js'),
    "setupFiles": [
      "./__mocks__/createStorage.ts"
    ],
  };