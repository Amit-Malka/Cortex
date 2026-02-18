module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/server.ts',
    '!src/__mocks__/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFiles: ['<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        strict: false,
        noUnusedLocals: false,
        noUnusedParameters: false,
        noImplicitReturns: false,
        types: ['node', 'jest', 'express'],
      }
    }]
  },
  moduleNameMapper: {
    '^.*/lib/prisma$': '<rootDir>/src/__mocks__/prisma'
  },
  verbose: true
};
