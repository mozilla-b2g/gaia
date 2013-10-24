require('/shared/test/unit/load_body_html_helper.js');
requireApp('clock/test/unit/test_require.js');

mocha.setup({
  globals: ['Template', 'asyncStorage', 'MockL10n', 'Emitter']
});
