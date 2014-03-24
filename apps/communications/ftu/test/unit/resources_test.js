'use strict';

requireApp('communications/ftu/js/resources.js');

var resourcePath = '/ftu/test/unit/resources/wallpaper.jpg';

suite(' Resources > ', function() {
  test(' load properly ', function(done) {
    var onerror = function errorHandler() {
        assert.ok(false, 'Resource not loaded properly');
        done();
      };
    Resources.load(resourcePath, 'blob', function() {
      done();
    }, onerror);
  });

  test(' error while loading ', function(done) {
    var onerror = function errorHandler() {
        done();
      };
    Resources.load('/wrong/path/file.jpg', 'blob', function() {
      assert.ok(false, 'Resource loaded when it should not.');
      done();
    }, onerror);
  });
});
