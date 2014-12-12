'use strict';

/* global InputMethodDatabaseLoader */

require('/js/keyboard/input_method_database_loader.js');

suite('InputMethodDatabaseLoader', function() {
  var loader;

  setup(function() {
    loader = new InputMethodDatabaseLoader();
    // Use absolute path here.
    loader.SOURCE_DIR = '/js/imes/';
    loader.start();
  });

  teardown(function() {
    loader.stop();
    loader = null;
  });

  test('load data from package', function(done) {
    loader.load('latin', 'dictionaries/en_us.dict').then(function(data) {
      assert.equal(data && data.byteLength, 1451390, 'Got data');
    }, function(e) {
      if (e) { throw e; }
      throw 'Should not reject';
    }).then(done, done);
  });

  test('load data from package (non-exist path)', function(done) {
    loader.load('latin', 'dictionaries/404.dict').then(function(data) {
      assert.isTrue(false, 'Should not resolve');
    }, function() {
      assert.isTrue(true, 'Rejected');
    }).then(done, done);
  });
});
