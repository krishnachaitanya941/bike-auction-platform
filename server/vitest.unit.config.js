const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/unit/**/*.test.js'],
    setupFiles: ['./tests/unit/setup.js'],
    maxWorkers: 1,
    fileParallelism: false,
  },
});
