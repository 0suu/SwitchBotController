// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'], // Look for tests in the src directory
  moduleNameMapper: {
    // Handle CSS imports (if you use CSS modules or plain CSS)
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Handle static asset imports
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/__mocks__/fileMock.js', // Example mock
    // Setup path aliases if you use them in your tsconfig.json and want them in Jest
    // e.g., '@/(.*)': '<rootDir>/src/renderer/src/$1'
    // Ensure these aliases match your tsconfig.renderer.json paths if testing renderer code primarily
    '^@api/(.*)$': '<rootDir>/src/api/$1',
    '^@store/(.*)$': '<rootDir>/src/renderer/src/store/$1',
    '^@components/(.*)$': '<rootDir>/src/renderer/src/components/$1',
    // If you have a global.d.ts, ensure it's recognized or types are available
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'], // Setup file for jest-dom and other global setups
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/src/renderer/tsconfig.json', // Point to specific tsconfig for renderer tests
                                                        // Or a general tsconfig if testing main/preload too
    }],
  },
  // Ignore patterns for main/preload if running tests primarily for renderer code with JSDOM
  // Or configure separate Jest configs if testing main process code (which runs in Node env)
  // testPathIgnorePatterns: [
  //   '<rootDir>/src/main/',
  //   '<rootDir>/src/preload/'
  // ],
  collectCoverage: true,
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/main/', // Excluding main process for now as it needs different test setup
    '<rootDir>/src/preload/', // Excluding preload for now
    '<rootDir>/src/api/types.ts', // Type definitions
    '<rootDir>/src/renderer/src/global.d.ts', // Type definitions
    '<rootDir>/src/renderer/vite.config.ts',
    '<rootDir>/src/renderer/src/vite-env.d.ts',
  ],
};
