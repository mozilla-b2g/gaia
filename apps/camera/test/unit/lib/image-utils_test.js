/*jshint maxlen:false*/
/*global req*/
'use strict';

suite('utils/image-utils', function() {
  var ImageUtils;

  suiteSetup(function(done) {
    var self = this;

    this.modules = {};

    req([
      'utils/image-utils'
    ], function(_ImageUtils) {
      ImageUtils = self.modules.ImageUtils = _ImageUtils;

      done();
    });
  });

  setup(function() {

  });

  suite('createContext', function() {
    setup(function() {

    });

    test('Should create a new CanvasRenderingContext2D object', function() {
      var width  = 100;
      var height = 100;

      var ctx = ImageUtils.createContext(width, height);

      assert.equal(typeof ctx.drawImage, 'function');
    });
  });

  suite('createImageData', function() {
    setup(function() {

    });

    test('Should create a new ImageData object', function() {
      var width  = 100;
      var height = 100;

      var imageData = ImageUtils.createImageData(width, height);

      assert.equal(imageData.width,  width);
      assert.equal(imageData.height, height);
    });
  });
});
