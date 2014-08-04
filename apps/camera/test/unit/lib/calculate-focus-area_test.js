suite('lib/calculate-focus-area', function() {
  /*jshint maxlen:false*/
  /*global req*/
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs(['lib/calculate-focus-area'], function(calculateFocusArea) {
      self.calculateFocusArea = calculateFocusArea;
      done();
    });
  });

  function calculateAreaFromCameraToPixel(area, viewportWidth, viewportHeight){
    var normalizedArea = {
      left: (area.left + 1000) / 2000,
      right: (area.right + 1000) / 2000,
      top: 1 - (area.top + 1000) / 2000,
      bottom: 1 - (area.bottom + 1000) / 2000
    };
    return {
      left: parseFloat((normalizedArea.bottom * viewportWidth).toFixed(1)),
      right: parseFloat((normalizedArea.top * viewportWidth).toFixed(1)),
      top: parseFloat((normalizedArea.left * viewportHeight).toFixed(1)),
      bottom: parseFloat((normalizedArea.right * viewportHeight).toFixed(1))
    };
  }

  function clampAreaPixelCoordinates(area, viewportWidth, viewportHeight) {
    var clampedArea = {};
    clampedArea.left = area.left < 0 ? 0 : area.left;
    clampedArea.right = area.right > viewportWidth ? viewportWidth : area.right;
    clampedArea.top = area.top < 0 ? 0 : area.top;
    clampedArea.bottom = area.bottom > viewportHeight ? viewportHeight : area.bottom;
    return clampedArea;
  }

  function createFocusArea(x, y, sideLength, viewportWidth, viewportHeight) {
    var areaHalfSide = sideLength / 2;
    return clampAreaPixelCoordinates({
      left: x - areaHalfSide,
      right: x + areaHalfSide,
      top: y - areaHalfSide,
      bottom: y + areaHalfSide
    },viewportWidth, viewportHeight);
  }

  suite('The area should be converted from pixel coordinates to camera coordinates and back to pixel coordinates', function() {
    test('focus area is at the center of the viewport', function() {
      var x = 400;
      var y = 300;
      var viewportWidth = 800;
      var viewportHeight = 600;
      var areaSide = 50;
      var focusAreaPixelCoordinates = createFocusArea(x, y, areaSide, viewportWidth, viewportHeight);
      var focusAreaCameraCoordiantes = this.calculateFocusArea(x, y, viewportWidth, viewportHeight, areaSide);
      var focusAreaPixelCoordinatesResult = calculateAreaFromCameraToPixel(focusAreaCameraCoordiantes, viewportWidth, viewportHeight);

      assert.equal(focusAreaPixelCoordinates.left, focusAreaPixelCoordinatesResult.left);
      assert.equal(focusAreaPixelCoordinates.right, focusAreaPixelCoordinatesResult.right);
      assert.equal(focusAreaPixelCoordinates.top, focusAreaPixelCoordinatesResult.top);
      assert.equal(focusAreaPixelCoordinates.bottom, focusAreaPixelCoordinatesResult.bottom);
    });

    test('focus area is at the top left quadrant of the viewport', function() {
      var x = 200;
      var y = 150;
      var viewportWidth = 800;
      var viewportHeight = 600;
      var areaSide = 50;
      var focusAreaPixelCoordinates = createFocusArea(x, y, areaSide, viewportWidth, viewportHeight);
      var focusAreaCameraCoordiantes = this.calculateFocusArea(x, y, viewportWidth, viewportHeight, areaSide);
      var focusAreaPixelCoordinatesResult = calculateAreaFromCameraToPixel(focusAreaCameraCoordiantes, viewportWidth, viewportHeight);

      assert.equal(focusAreaPixelCoordinates.left, focusAreaPixelCoordinatesResult.left);
      assert.equal(focusAreaPixelCoordinates.right, focusAreaPixelCoordinatesResult.right);
      assert.equal(focusAreaPixelCoordinates.top, focusAreaPixelCoordinatesResult.top);
      assert.equal(focusAreaPixelCoordinates.bottom, focusAreaPixelCoordinatesResult.bottom);
    });

    test('focus area is at the top right quadrant of the viewport', function() {
      var x = 600;
      var y = 150;
      var viewportWidth = 800;
      var viewportHeight = 600;
      var areaSide = 50;
      var focusAreaPixelCoordinates = createFocusArea(x, y, areaSide, viewportWidth, viewportHeight);
      var focusAreaCameraCoordiantes = this.calculateFocusArea(x, y, viewportWidth, viewportHeight, areaSide);
      var focusAreaPixelCoordinatesResult = calculateAreaFromCameraToPixel(focusAreaCameraCoordiantes, viewportWidth, viewportHeight);

      assert.equal(focusAreaPixelCoordinates.left, focusAreaPixelCoordinatesResult.left);
      assert.equal(focusAreaPixelCoordinates.right, focusAreaPixelCoordinatesResult.right);
      assert.equal(focusAreaPixelCoordinates.top, focusAreaPixelCoordinatesResult.top);
      assert.equal(focusAreaPixelCoordinates.bottom, focusAreaPixelCoordinatesResult.bottom);
    });

    test('focus area is at the bottom left quadrant of the viewport', function() {
      var x = 200;
      var y = 450;
      var viewportWidth = 800;
      var viewportHeight = 600;
      var areaSide = 50;
      var focusAreaPixelCoordinates = createFocusArea(x, y, areaSide, viewportWidth, viewportHeight);
      var focusAreaCameraCoordiantes = this.calculateFocusArea(x, y, viewportWidth, viewportHeight, areaSide);
      var focusAreaPixelCoordinatesResult = calculateAreaFromCameraToPixel(focusAreaCameraCoordiantes, viewportWidth, viewportHeight);

      assert.equal(focusAreaPixelCoordinates.left, focusAreaPixelCoordinatesResult.left);
      assert.equal(focusAreaPixelCoordinates.right, focusAreaPixelCoordinatesResult.right);
      assert.equal(focusAreaPixelCoordinates.top, focusAreaPixelCoordinatesResult.top);
      assert.equal(focusAreaPixelCoordinates.bottom, focusAreaPixelCoordinatesResult.bottom);
    });

    test('focus area is at the bottom right quadrant of the viewport', function() {
      var x = 600;
      var y = 450;
      var viewportWidth = 800;
      var viewportHeight = 600;
      var areaSide = 50;
      var focusAreaPixelCoordinates = createFocusArea(x, y, areaSide, viewportWidth, viewportHeight);
      var focusAreaCameraCoordiantes = this.calculateFocusArea(x, y, viewportWidth, viewportHeight, areaSide);
      var focusAreaPixelCoordinatesResult = calculateAreaFromCameraToPixel(focusAreaCameraCoordiantes, viewportWidth, viewportHeight);

      assert.equal(focusAreaPixelCoordinates.left, focusAreaPixelCoordinatesResult.left);
      assert.equal(focusAreaPixelCoordinates.right, focusAreaPixelCoordinatesResult.right);
      assert.equal(focusAreaPixelCoordinates.top, focusAreaPixelCoordinatesResult.top);
      assert.equal(focusAreaPixelCoordinates.bottom, focusAreaPixelCoordinatesResult.bottom);
    });

    test('focus area exactly the size of the viewport', function() {
      var x = 300;
      var y = 300;
      var viewportWidth = 600;
      var viewportHeight = 600;
      var areaSide = 300;
      var focusAreaPixelCoordinates = createFocusArea(x, y, areaSide, viewportWidth, viewportHeight);
      var focusAreaCameraCoordiantes = this.calculateFocusArea(x, y, viewportWidth, viewportHeight, areaSide);
      var focusAreaPixelCoordinatesResult = calculateAreaFromCameraToPixel(focusAreaCameraCoordiantes, viewportWidth, viewportHeight);

      assert.equal(focusAreaPixelCoordinates.left, focusAreaPixelCoordinatesResult.left);
      assert.equal(focusAreaPixelCoordinates.right, focusAreaPixelCoordinatesResult.right);
      assert.equal(focusAreaPixelCoordinates.top, focusAreaPixelCoordinatesResult.top);
      assert.equal(focusAreaPixelCoordinates.bottom, focusAreaPixelCoordinatesResult.bottom);
    });

    test('focus area is very small', function() {
      var x = 300;
      var y = 300;
      var viewportWidth = 800;
      var viewportHeight = 600;
      var areaSide = 3;
      var focusAreaPixelCoordinates = createFocusArea(x, y, areaSide, viewportWidth, viewportHeight);
      var focusAreaCameraCoordiantes = this.calculateFocusArea(x, y, viewportWidth, viewportHeight, areaSide);
      var focusAreaPixelCoordinatesResult = calculateAreaFromCameraToPixel(focusAreaCameraCoordiantes, viewportWidth, viewportHeight);
      assert.equal(focusAreaPixelCoordinates.left, focusAreaPixelCoordinatesResult.left);
      assert.equal(focusAreaPixelCoordinates.right, focusAreaPixelCoordinatesResult.right);
      assert.equal(focusAreaPixelCoordinates.top, focusAreaPixelCoordinatesResult.top);
      assert.equal(focusAreaPixelCoordinates.bottom, focusAreaPixelCoordinatesResult.bottom);
    });

    test('focus area overflows the top side of the viewport', function() {
      var x = 300;
      var y = 0;
      var viewportWidth = 800;
      var viewportHeight = 600;
      var areaSide = 50;
      var focusAreaPixelCoordinates = createFocusArea(x, y, areaSide, viewportWidth, viewportHeight);
      var focusAreaCameraCoordiantes = this.calculateFocusArea(x, y, viewportWidth, viewportHeight, areaSide);
      var focusAreaPixelCoordinatesResult = calculateAreaFromCameraToPixel(focusAreaCameraCoordiantes, viewportWidth, viewportHeight);
      assert.equal(focusAreaPixelCoordinates.left, focusAreaPixelCoordinatesResult.left);
      assert.equal(focusAreaPixelCoordinates.right, focusAreaPixelCoordinatesResult.right);
      assert.equal(focusAreaPixelCoordinates.top, focusAreaPixelCoordinatesResult.top);
      assert.equal(focusAreaPixelCoordinates.bottom, focusAreaPixelCoordinatesResult.bottom);
    });

    test('focus area overflows the bottom side of the viewport', function() {
      var x = 300;
      var y = 600;
      var viewportWidth = 800;
      var viewportHeight = 600;
      var areaSide = 50;
      var focusAreaPixelCoordinates = createFocusArea(x, y, areaSide, viewportWidth, viewportHeight);
      var focusAreaCameraCoordiantes = this.calculateFocusArea(x, y, viewportWidth, viewportHeight, areaSide);
      var focusAreaPixelCoordinatesResult = calculateAreaFromCameraToPixel(focusAreaCameraCoordiantes, viewportWidth, viewportHeight);
      assert.equal(focusAreaPixelCoordinates.left, focusAreaPixelCoordinatesResult.left);
      assert.equal(focusAreaPixelCoordinates.right, focusAreaPixelCoordinatesResult.right);
      assert.equal(focusAreaPixelCoordinates.top, focusAreaPixelCoordinatesResult.top);
      assert.equal(focusAreaPixelCoordinates.bottom, focusAreaPixelCoordinatesResult.bottom);
    });

    test('focus area overflows the left side of the viewport', function() {
      var x = 0;
      var y = 300;
      var viewportWidth = 800;
      var viewportHeight = 600;
      var areaSide = 50;
      var focusAreaPixelCoordinates = createFocusArea(x, y, areaSide, viewportWidth, viewportHeight);
      var focusAreaCameraCoordiantes = this.calculateFocusArea(x, y, viewportWidth, viewportHeight, areaSide);
      var focusAreaPixelCoordinatesResult = calculateAreaFromCameraToPixel(focusAreaCameraCoordiantes, viewportWidth, viewportHeight);
      assert.equal(focusAreaPixelCoordinates.left, focusAreaPixelCoordinatesResult.left);
      assert.equal(focusAreaPixelCoordinates.right, focusAreaPixelCoordinatesResult.right);
      assert.equal(focusAreaPixelCoordinates.top, focusAreaPixelCoordinatesResult.top);
      assert.equal(focusAreaPixelCoordinates.bottom, focusAreaPixelCoordinatesResult.bottom);
    });

    test('focus area overflows the right side of the viewport', function() {
      var x = 800;
      var y = 300;
      var viewportWidth = 800;
      var viewportHeight = 600;
      var areaSide = 50;
      var focusAreaPixelCoordinates = createFocusArea(x, y, areaSide, viewportWidth, viewportHeight);
      var focusAreaCameraCoordiantes = this.calculateFocusArea(x, y, viewportWidth, viewportHeight, areaSide);
      var focusAreaPixelCoordinatesResult = calculateAreaFromCameraToPixel(focusAreaCameraCoordiantes, viewportWidth, viewportHeight);
      assert.equal(focusAreaPixelCoordinates.left, focusAreaPixelCoordinatesResult.left);
      assert.equal(focusAreaPixelCoordinates.right, focusAreaPixelCoordinatesResult.right);
      assert.equal(focusAreaPixelCoordinates.top, focusAreaPixelCoordinatesResult.top);
      assert.equal(focusAreaPixelCoordinates.bottom, focusAreaPixelCoordinatesResult.bottom);
    });

  });


});
