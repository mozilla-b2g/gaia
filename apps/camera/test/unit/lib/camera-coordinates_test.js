suite('lib/camera-coordinates', function() {
  /*jshint maxlen:false*/
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs(['lib/camera-coordinates'], function(cameraCoordinates) {
      // alias
      self.faceToCamera = cameraCoordinates.faceToCamera;
      self.faceToPixels = cameraCoordinates.faceToPixels;
      self.areaToCamera = cameraCoordinates.private.areaToCamera;
      self.areaToPixels = cameraCoordinates.private.areaToPixels;
      self.mirrorAreaCamera = cameraCoordinates.private.mirrorAreaCamera;
      self.mirrorAreaPixels = cameraCoordinates.private.mirrorAreaPixels;
      self.rotateArea = cameraCoordinates.private.rotateArea;
      self.sizeToCamera = cameraCoordinates.private.sizeToCamera;
      self.sizeToPixels = cameraCoordinates.private.sizeToPixels;
      self.toCamera = cameraCoordinates.private.toCamera;
      self.toPixels = cameraCoordinates.private.toPixels;
      self.rotatePoint = cameraCoordinates.private.rotatePoint;

      self.equalAreas = function(area1, area2) {
        var equal = area1.top === area2.top &&
        area1.left === area2.left &&
        area1.bottom === area2.bottom &&
        area1.right === area2.right &&
        area1.width === area2.width &&
        area1.height === area2.height;
        if (!equal) {
          console.log('Areas are not equal: ' +
          JSON.stringify(area1) + ' /= ' + JSON.stringify(area2));
        }
        return equal;
      };
      done();
    });
    this.viewportWidth = 800;
    this.viewportHeight = 600;
  });

  suite('#faceToCamera', function() {
    suite('The face should be converted from pixel coordinates to camera and back to pixels', function() {

      test('face is at the center of the viewport', function() {
        var face = {
          top: 200,
          left: 300,
          bottom: 400,
          right: 600,
          height: 200,
          width: 300
        };
        var faceCameraCoordinates = this.faceToCamera(face, this.viewportWidth, this.viewportHeight, 0);
        var facePixelCooordinates = this.faceToPixels(faceCameraCoordinates, this.viewportWidth, this.viewportHeight, 0);
        assert.ok(this.equalAreas(face, facePixelCooordinates));
      });

      test('face is at the top left quadrant of the viewport', function() {
        var face = {
          top: 0,
          left: 0,
          bottom: 230,
          right: 230,
          height: 230,
          width: 230
        };
        var faceCameraCoordinates = this.faceToCamera(face, this.viewportWidth, this.viewportHeight, 0);
        var facePixelCooordinates = this.faceToPixels(faceCameraCoordinates, this.viewportWidth, this.viewportHeight, 0);
        assert.ok(this.equalAreas(face, facePixelCooordinates));
      });

      test('face is at the top right quadrant of the viewport', function() {
        var face = {
          top: 50,
          left: 500,
          bottom: 80,
          right: 530,
          height: 30,
          width: 30
        };
        var faceCameraCoordinates = this.faceToCamera(face, this.viewportWidth, this.viewportHeight, 0);
        var facePixelCooordinates = this.faceToPixels(faceCameraCoordinates, this.viewportWidth, this.viewportHeight, 0);
        assert.ok(this.equalAreas(face, facePixelCooordinates));
      });

      test('face is at the bottom left quadrant of the viewport', function() {
        var face = {
          top: 400,
          left: 200,
          bottom: 475,
          right: 275,
          height: 75,
          width: 75
        };
        var faceCameraCoordinates = this.faceToCamera(face, this.viewportWidth, this.viewportHeight, 0);
        var facePixelCooordinates = this.faceToPixels(faceCameraCoordinates, this.viewportWidth, this.viewportHeight, 0);
        assert.ok(this.equalAreas(face, facePixelCooordinates));
      });

      test('face is at the bottom right quadrant of the viewport', function() {
        var face = {
          top: 400,
          left: 500,
          bottom: 500,
          right: 600,
          height: 100,
          width: 100
        };
        var faceCameraCoordinates = this.faceToCamera(face, this.viewportWidth, this.viewportHeight, 0);
        var facePixelCooordinates = this.faceToPixels(faceCameraCoordinates, this.viewportWidth, this.viewportHeight, 0);
        assert.ok(this.equalAreas(face, facePixelCooordinates));
      });

    });
  });

  suite('#faceToPixels', function() {
    suite('The face should be converted from camera to pixel coordinates and back to camera coordinates', function() {

      test('face is at the center of the viewport', function() {
        // var face = {
        //   top: -25,
        //   left: -25,
        //   bottom: 25,
        //   right: 25,
        //   height: 50,
        //   width: 50
        // };
        var face = {
          top: -50,
          left: -50,
          bottom: 50,
          right: 50,
          height: 100,
          width: 100
        };
        var facePixelCooordinates = this.faceToPixels(face, this.viewportWidth, this.viewportHeight, 0);
        var faceCameraCoordinates = this.faceToCamera(facePixelCooordinates, this.viewportWidth, this.viewportHeight, 0);
        assert.ok(this.equalAreas(face, faceCameraCoordinates));
      });

      test('face is at the top left quadrant of the viewport', function() {
        var face = {
          top: -1000,
          left: -1000,
          bottom: -950,
          right: -950,
          height: 50,
          width: 50
        };
        var facePixelCooordinates = this.faceToPixels(face, this.viewportWidth, this.viewportHeight, 0);
        var faceCameraCoordinates = this.faceToCamera(facePixelCooordinates, this.viewportWidth, this.viewportHeight, 0);
        assert.ok(this.equalAreas(face, faceCameraCoordinates));
      });

      test('face is at the top right quadrant of the viewport', function() {
        var face = {
          top: -500,
          left: 500,
          bottom: -450,
          right: 550,
          height: 50,
          width: 50
        };
        var facePixelCooordinates = this.faceToPixels(face, this.viewportWidth, this.viewportHeight, 0);
        var faceCameraCoordinates = this.faceToCamera(facePixelCooordinates, this.viewportWidth, this.viewportHeight, 0);
        assert.ok(this.equalAreas(face, faceCameraCoordinates));
      });

      test('face is at the bottom left quadrant of the viewport', function() {
        var face = {
          top: 500,
          left: -500,
          bottom: 550,
          right: -450,
          height: 50,
          width: 50
        };
        var facePixelCooordinates = this.faceToPixels(face, this.viewportWidth, this.viewportHeight, 0);
        var faceCameraCoordinates = this.faceToCamera(facePixelCooordinates, this.viewportWidth, this.viewportHeight, 0);
        assert.ok(this.equalAreas(face, faceCameraCoordinates));
      });

      test('face is at the bottom right quadrant of the viewport', function() {
        var face = {
          top: 500,
          left: 500,
          bottom: 550,
          right: 550,
          height: 50,
          width: 50
        };
        var facePixelCooordinates = this.faceToPixels(face, this.viewportWidth, this.viewportHeight, 0);
        var faceCameraCoordinates = this.faceToCamera(facePixelCooordinates, this.viewportWidth, this.viewportHeight, 0);
        assert.ok(this.equalAreas(face, faceCameraCoordinates));
      });

    });
  });

  suite('#areaToCamera', function() {
    suite('The area should be converted from pixel coordinates to camera and back to pixels', function() {

      test('area is at the center of the viewport', function() {
        var area = {
          top: 200,
          left: 300,
          bottom: 400,
          right: 600,
          height: 200,
          width: 300
        };
        var areaCamera = this.areaToCamera(area, this.viewportWidth, this.viewportHeight);
        var areaPixels = this.areaToPixels(areaCamera, this.viewportWidth, this.viewportHeight);
        assert.ok(this.equalAreas(area, areaPixels));
      });

      test('area is at the top left quadrant of the viewport', function() {
        var area = {
          top: 0,
          left: 0,
          bottom: 230,
          right: 230,
          height: 230,
          width: 230
        };
        var areaCamera = this.areaToCamera(area, this.viewportWidth, this.viewportHeight);
        var areaPixels = this.areaToPixels(areaCamera, this.viewportWidth, this.viewportHeight);
        assert.ok(this.equalAreas(area, areaPixels));
      });

      test('area is at the top right quadrant of the viewport', function() {
        var area = {
          top: 50,
          left: 500,
          bottom: 80,
          right: 530,
          height: 30,
          width: 30
        };
        var areaCamera = this.areaToCamera(area, this.viewportWidth, this.viewportHeight);
        var areaPixels = this.areaToPixels(areaCamera, this.viewportWidth, this.viewportHeight);
        assert.ok(this.equalAreas(area, areaPixels));
      });

      test('area is at the bottom left quadrant of the viewport', function() {
        var area = {
          top: 400,
          left: 200,
          bottom: 475,
          right: 275,
          height: 75,
          width: 75
        };
        var areaCamera = this.areaToCamera(area, this.viewportWidth, this.viewportHeight);
        var areaPixels = this.areaToPixels(areaCamera, this.viewportWidth, this.viewportHeight);
        assert.ok(this.equalAreas(area, areaPixels));
      });

      test('area is at the bottom right quadrant of the viewport', function() {
        var area = {
          top: 400,
          left: 500,
          bottom: 500,
          right: 600,
          height: 100,
          width: 100
        };
        var areaCamera = this.areaToCamera(area, this.viewportWidth, this.viewportHeight);
        var areaPixels = this.areaToPixels(areaCamera, this.viewportWidth, this.viewportHeight);
        assert.ok(this.equalAreas(area, areaPixels));
      });

    });
  });

  suite('#areaToPixels', function() {
    suite('The area should be converted from camera to pixel coordinates and back to camera coordinates', function() {
      test('area is at the center of the viewport', function() {
        var area = {
          top: -50,
          left: -50,
          bottom: 50,
          right: 50,
          height: 100,
          width: 100
        };
        var areaPixels = this.areaToPixels(area, this.viewportWidth, this.viewportHeight);
        var areaCamera = this.areaToCamera(areaPixels, this.viewportWidth, this.viewportHeight);
        assert.ok(this.equalAreas(area, areaCamera));
      });

      test('area is at the top left quadrant of the viewport', function() {
        var area = {
          top: -50,
          left: -50,
          bottom: 50,
          right: 50,
          height: 100,
          width: 100
        };
        var areaPixels = this.areaToPixels(area, this.viewportWidth, this.viewportHeight);
        var areaCamera = this.areaToCamera(areaPixels, this.viewportWidth, this.viewportHeight);
        assert.ok(this.equalAreas(area, areaCamera));
      });

      test('area is at the top right quadrant of the viewport', function() {
        var area = {
          top: -50,
          left: -50,
          bottom: 50,
          right: 50,
          height: 100,
          width: 100
        };
        var areaPixels = this.areaToPixels(area, this.viewportWidth, this.viewportHeight);
        var areaCamera = this.areaToCamera(areaPixels, this.viewportWidth, this.viewportHeight);
        assert.ok(this.equalAreas(area, areaCamera));
      });

      test('area is at the bottom left quadrant of the viewport', function() {
        var area = {
          top: -50,
          left: -50,
          bottom: 50,
          right: 50,
          height: 100,
          width: 100
        };
        var areaPixels = this.areaToPixels(area, this.viewportWidth, this.viewportHeight);
        var areaCamera = this.areaToCamera(areaPixels, this.viewportWidth, this.viewportHeight);
        assert.ok(this.equalAreas(area, areaCamera));
      });

      test('area is at the bottom right quadrant of the viewport', function() {
        var area = {
          top: -50,
          left: -50,
          bottom: 50,
          right: 50,
          height: 100,
          width: 100
        };
        var areaPixels = this.areaToPixels(area, this.viewportWidth, this.viewportHeight);
        var areaCamera = this.areaToCamera(areaPixels, this.viewportWidth, this.viewportHeight);
        assert.ok(this.equalAreas(area, areaCamera));
      });

    });
  });

  suite('#mirrorAreaCamera', function() {
    suite('The area should be properly mirrored', function() {
      test('area is at the center of the viewport', function() {
        var area = {
          top: -50,
          left: -50,
          bottom: 50,
          right: 50,
          height: 100,
          width: 100
        };
        var mirroredArea = this.mirrorAreaCamera(area);
        var doubledMirrorArea = this.mirrorAreaCamera(mirroredArea);
        assert.ok(this.equalAreas(area, doubledMirrorArea));
      });

      test('area is at the top left quadrant of the viewport', function() {
        var area = {
          top: -100,
          left: -100,
          bottom: -50,
          right: -50,
          height: 50,
          width: 50
        };
        var mirroredArea = this.mirrorAreaCamera(area);
        var doubledMirrorArea = this.mirrorAreaCamera(mirroredArea);
        assert.ok(this.equalAreas(area, doubledMirrorArea));
      });

      test('area is at the top right quadrant of the viewport', function() {
        var area = {
          top: -100,
          left: 300,
          bottom: -50,
          right: 350,
          height: 50,
          width: 50
        };
        var mirroredArea = this.mirrorAreaCamera(area);
        var doubledMirrorArea = this.mirrorAreaCamera(mirroredArea);
        assert.ok(this.equalAreas(area, doubledMirrorArea));
      });

      test('area is at the bottom left quadrant of the viewport', function() {
        var area = {
          top: 100,
          left: -200,
          bottom: 200,
          right: -100,
          height: 100,
          width: 100
        };
        var mirroredArea = this.mirrorAreaCamera(area);
        var doubledMirrorArea = this.mirrorAreaCamera(mirroredArea);
        assert.ok(this.equalAreas(area, doubledMirrorArea));
      });

      test('area is at the bottom right quadrant of the viewport', function() {
        var area = {
          top: 800,
          left: 800,
          bottom: 900,
          right: 900,
          height: 100,
          width: 100
        };
        var mirroredArea = this.mirrorAreaCamera(area);
        var doubledMirrorArea = this.mirrorAreaCamera(mirroredArea);
        assert.ok(this.equalAreas(area, doubledMirrorArea));
      });

    });
  });

  suite('#mirrorAreaPixels', function() {
    suite('The area should be properly mirrored', function() {
      test('area is at the center of the viewport', function() {
        var area = {
          top: 100,
          left: 300,
          bottom: 200,
          right: 400,
          height: 100,
          width: 100
        };
        var mirroredArea = this.mirrorAreaPixels(area, this.viewportWidth);
        var doubledMirrorArea = this.mirrorAreaPixels(mirroredArea, this.viewportWidth);
        assert.ok(this.equalAreas(area, doubledMirrorArea));
      });
    });
  });

  suite('#rotateArea', function() {
    suite('The area should be properly rotated', function() {
      test('area rotates 0 degrees', function() {
        var area = {
          top: -50,
          left: -50,
          bottom: 50,
          right: 50,
          height: 100,
          width: 100
        };
        var expectedResult = {
          top: -50,
          left: -50,
          bottom: 50,
          right: 50,
          height: 100,
          width: 100
        };
        var rotatedArea = this.rotateArea(area, 0);
        assert.ok(this.equalAreas(rotatedArea, expectedResult));
      });

      test('area rotates 90 degrees', function() {
        var area = {
          top: -50,
          left: -50,
          bottom: 50,
          right: 50,
          height: 100,
          width: 100
        };
        var expectedResult = {
          top: -50,
          left: -50,
          bottom: 50,
          right: 50,
          height: 100,
          width: 100
        };
        var rotatedArea = this.rotateArea(area, 90);
        assert.ok(this.equalAreas(rotatedArea, expectedResult));
      });

      test('area rotates 180 degrees', function() {
        var area = {
          top: -50,
          left: -50,
          bottom: 50,
          right: 50,
          height: 100,
          width: 100
        };
        var expectedResult = {
          top: -50,
          left: -50,
          bottom: 50,
          right: 50,
          height: 100,
          width: 100
        };
        var rotatedArea = this.rotateArea(area, 180);
        assert.ok(this.equalAreas(rotatedArea, expectedResult));
      });

      test('area rotates 270 degrees', function() {
        var area = {
          top: -50,
          left: -50,
          bottom: 50,
          right: 50,
          height: 100,
          width: 100
        };
        var expectedResult = {
          top: -50,
          left: -50,
          bottom: 50,
          right: 50,
          height: 100,
          width: 100
        };
        var rotatedArea = this.rotateArea(area, 270);
        assert.ok(this.equalAreas(rotatedArea, expectedResult));
      });

    });
  });

  suite('#sizeToCamera', function() {
    test('The size should be converted from pixels to camera coordinates and back to pixels', function() {
      var width = 50;
      var height = 100;
      var sizeCamera = this.sizeToCamera(width, height, this.viewportWidth, this.viewportHeight);
      var sizePixels = this.sizeToPixels(sizeCamera.width, sizeCamera.height, this.viewportWidth, this.viewportHeight);
      assert.ok(sizePixels.width === width);
      assert.ok(sizePixels.height === height);
    });
  });

  suite('#sizeToPixels', function() {
    test('The size should be converted from camera coordinates to pixels and back to camera', function() {
      var width = 50;
      var height = 100;
      var sizePixels = this.sizeToPixels(width, height, this.viewportWidth, this.viewportHeight);
      var sizeCamera = this.sizeToCamera(sizePixels.width, sizePixels.height, this.viewportWidth, this.viewportHeight);
      assert.ok(sizeCamera.width === width);
      assert.ok(sizeCamera.height === height);
    });
  });

  suite('#toCamera', function() {
    test('The coordinate should be transformed from pixels to camera coordinates', function() {
      var x = 50;
      var y = 100;
      var camera = this.toCamera(x, y, this.viewportWidth, this.viewportHeight);
      var pixels = this.toPixels(camera.x, camera.y, this.viewportWidth, this.viewportHeight);
      assert.ok(pixels.x === x);
      assert.ok(pixels.y === y);
    });
  });

  suite('#toPixels', function() {
    test('The coordinate should be transformed from camera coordinates to pixels', function() {
      var x = 50;
      var y = 100;
      var pixels = this.toPixels(x, y, this.viewportWidth, this.viewportHeight);
      var camera = this.toCamera(pixels.x, pixels.y, this.viewportWidth, this.viewportHeight);
      assert.ok(camera.x === x);
      assert.ok(camera.y === y);
    });
  });

  suite('#rotatePoint', function() {
    test('The point coordinates should rotate 0 degrees', function() {
      var x = 50;
      var y = 100;
      var point = this.rotatePoint(x, y, 0);
      assert.ok(x === point.x);
      assert.ok(y === point.y);
    });

    test('The point coordinates should rotate 90 degrees', function() {
      var x = 760;
      var y = 134;
      var point = this.rotatePoint(x, y, 90);
      assert.ok(x === point.y);
      assert.ok(y === -point.x);
    });

    test('The point coordinates should rotate 180 degrees', function() {
      var x = 34;
      var y = 100;
      var point = this.rotatePoint(x, y, 180);
      assert.ok(x === -point.x);
      assert.ok(y === -point.y);
    });

    test('The point coordinates should rotate 270 degrees', function() {
      var x = 200;
      var y = 200;
      var point = this.rotatePoint(x, y, 270);
      assert.ok(x === -point.y);
      assert.ok(y === point.x);
    });

    test('Angle should be clamped to 0 degrees', function() {
      var x = 0;
      var y = 240;
      var point1 = this.rotatePoint(x, y, 0);
      var point2 = this.rotatePoint(x, y, -20);
      assert.ok(point1.x === point2.x);
      assert.ok(point1.y === point2.y);
    });

    test('Angle should be clamped to 90 degrees', function() {
      var x = 123;
      var y = -321;
      var point1 = this.rotatePoint(x, y, 90);
      var point2 = this.rotatePoint(x, y, -260);
      assert.ok(point1.x === point2.x);
      assert.ok(point1.y === point2.y);
    });

    test('Angle should be clamped to 90 degrees', function() {
      var x = 123;
      var y = 321;
      var point1 = this.rotatePoint(x, y, 90);
      var point2 = this.rotatePoint(x, y, 123);
      assert.ok(point1.x === point2.x);
      assert.ok(point1.y === point2.y);
    });

    test('Angle should be clamped to 180 degrees', function() {
      var x = -100;
      var y = 100;
      var point1 = this.rotatePoint(x, y, 180);
      var point2 = this.rotatePoint(x, y, 140);
      assert.ok(point1.x === point2.x);
      assert.ok(point1.y === point2.y);
    });

    test('Angle should be clamped to 270 degrees', function() {
      var x = -500;
      var y = -500;
      var point1 = this.rotatePoint(x, y, 230);
      var point2 = this.rotatePoint(x, y, 270);
      assert.ok(point1.x === point2.x);
      assert.ok(point1.y === point2.y);
    });

  });

});