import {default as Cache } from '../src/Cache';
import createStorage from '../__mocks__/createStorage';

jest.mock('../src/createStorage', () => () => createStorage);

describe('Cache', () => {
    it('cache set', () => {
      const cache = new Cache();
      cache.set("prova", 1);

      console.log("cache", cache)
  
      expect(cache.get("prova")).toBe(1);
    });
})