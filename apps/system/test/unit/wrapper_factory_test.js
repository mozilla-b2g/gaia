'use strict';

suite('system/WrapperFactory', function() {
  setup(function(done) {
    requireApp('system/js/wrapper_factory.js', done);
  });
  test('Set oop in browser config', function() {
    var features = {
      remote: true
    };
    var config = WrapperFactory.generateBrowserConfig(features);
    assert.isTrue(config.oop);
  });
});
