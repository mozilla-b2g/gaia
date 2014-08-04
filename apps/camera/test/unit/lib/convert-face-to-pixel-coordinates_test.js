suite('lib/convert-face-to-pixel-coordinates', function() {
  /*jshint maxlen:false*/
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs(['lib/convert-face-to-pixel-coordinates'], function(convertFaceToPixelCoordinates) {
      self.convertFaceToPixelCoordinates = convertFaceToPixelCoordinates;
      done();
    });
    this.viewportWidth = 800;
    this.viewportHeight = 600;
  });

  function convertFaceFromPixelToCameraCoordinates(face, viewportWidth, viewportHeight){
    var bottom = (1 - (face.x / viewportWidth)) * 2000 - 1000;
    var left = (face.y / viewportHeight) * 2000 - 1000;
    return {
      bottom: bottom,
      left: left
    };
  }

  suite('The face should be converted from camera to pixel coordinates and back to camera coordinates', function() {
    test('face is at the center of the viewport', function() {
      var face = {
        bounds: {
          bottom: 0,
          left: 0,
          width: 50,
          height: 50
        }
      };
      var facePixelCooordinates = this.convertFaceToPixelCoordinates(face, this.viewportWidth, this.viewportHeight);
      var faceCameraCoordinates = convertFaceFromPixelToCameraCoordinates(facePixelCooordinates, this.viewportWidth, this.viewportHeight);
      assert.ok(face.bounds.bottom === faceCameraCoordinates.bottom);
      assert.ok(face.bounds.left === faceCameraCoordinates.left);
    });

    test('face is at the top left quadrant of the viewport', function() {
      var face = {
        bounds: {
          bottom: -500,
          left: 500,
          width: 50,
          height: 50
        }
      };
      var facePixelCooordinates = this.convertFaceToPixelCoordinates(face, this.viewportWidth, this.viewportHeight);
      var faceCameraCoordinates = convertFaceFromPixelToCameraCoordinates(facePixelCooordinates, this.viewportWidth, this.viewportHeight);
      assert.ok(face.bounds.bottom === faceCameraCoordinates.bottom);
      assert.ok(face.bounds.left === faceCameraCoordinates.left);
    });

    test('face is at the top right quadrant of the viewport', function() {
      var face = {
        bounds: {
          bottom: -500,
          left: -500,
          width: 50,
          height: 50
        }
      };
      var facePixelCooordinates = this.convertFaceToPixelCoordinates(face, this.viewportWidth, this.viewportHeight);
      var faceCameraCoordinates = convertFaceFromPixelToCameraCoordinates(facePixelCooordinates, this.viewportWidth, this.viewportHeight);
      assert.ok(face.bounds.bottom === faceCameraCoordinates.bottom);
      assert.ok(face.bounds.left === faceCameraCoordinates.left);
    });

    test('face is at the bottom left quadrant of the viewport', function() {
      var face = {
        bounds: {
          bottom: 500,
          left: 500,
          width: 50,
          height: 50
        }
      };
      var facePixelCooordinates = this.convertFaceToPixelCoordinates(face, this.viewportWidth, this.viewportHeight);
      var faceCameraCoordinates = convertFaceFromPixelToCameraCoordinates(facePixelCooordinates, this.viewportWidth, this.viewportHeight);
      assert.ok(face.bounds.bottom === faceCameraCoordinates.bottom);
      assert.ok(face.bounds.left === faceCameraCoordinates.left);
    });

    test('face is at the bottom right quadrant of the viewport', function() {
      var face = {
        bounds: {
          bottom: 500,
          left: -500,
          width: 50,
          height: 50
        }
      };
      var facePixelCooordinates = this.convertFaceToPixelCoordinates(face, this.viewportWidth, this.viewportHeight);
      var faceCameraCoordinates = convertFaceFromPixelToCameraCoordinates(facePixelCooordinates, this.viewportWidth, this.viewportHeight);
      assert.ok(face.bounds.bottom === faceCameraCoordinates.bottom);
      assert.ok(face.bounds.left === faceCameraCoordinates.left);
    });

  });


});
