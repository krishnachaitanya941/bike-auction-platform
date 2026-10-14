const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/*.test.js'],
    setupFiles: ['./tests/setup.js'],
    maxWorkers: 1,
    fileParallelism: false,
  },
});
