requireApp('clock/test/unit/test_require.js');

mocha.setup({
  globals: ['Template', 'asyncStorage', 'MockL10n', 'Emitter',
            'PerformanceTestingHelper']
});
