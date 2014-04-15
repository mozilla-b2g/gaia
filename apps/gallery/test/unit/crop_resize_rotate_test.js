'use strict';

/* global BlobView */
/* global parseJPEGMetadata */
/* global getImageSize */
/* global cropResizeRotate */

require('/shared/js/blobview.js');
require('/shared/js/media/jpeg_metadata_parser.js');
require('/shared/js/media/image_size.js');
require('/shared/js/media/crop_resize_rotate.js');

suite('cropResizeRotate', function() {
  const W = 240, H = 180;  // The size of the test image

  suiteSetup(function(done) {
    // We begin by creating a special image where each pixel value
    // encodes the coordinates of that pixel. This allows us to inspect
    // the pixels in the output image to verify that cropping and rotation
    // was done correctly.
    var canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    var context = canvas.getContext('2d');
    var imageData = context.createImageData(W, H);
    var pixels = imageData.data;

    for (var x = 0; x < canvas.width; x++) {
      for (var y = 0; y < canvas.height; y++) {
        var offset = (x + y * canvas.width) * 4;
        pixels[offset] = x;   // Encode x coordinate as red value
        pixels[offset + 1] = y; // Encode y coodrdinate as green value
        imageData.data[offset + 3] = 255; // Make it opaque
      }
    }

    context.putImageData(imageData, 0, 0);

    var self = this;
    canvas.toBlob(function(blob) {
      self.jpegBlob = blob;
      done();
    }, 'image/jpeg');
  });

  // Decode the image blob and verify that its size is as expected and
  // that its upper-left pixel has red and green values near r0 and g0
  // and that its lower-right pixel has values near r1 and g1. We do a
  // fuzzy match because jpeg is a lossy format and because sometimes
  // we're working with downsampled images.
  function verifyImage(blob, expectedWidth, expectedHeight,
                       r0, g0, r1, g1, tolerance, callback) {
    var image = new Image();
    var url = URL.createObjectURL(blob);
    image.src = url;
    image.onerror = function() {
      callback(Error('failed to load image from blob'));
    };

    image.onload = function() {
      try {
        assert.equal(image.width, expectedWidth, 'image width');
        assert.equal(image.height, expectedHeight, 'image height');

        var canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        var context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
        var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        var pixels = imageData.data;

        isNear(pixels[0], r0, 'red component of upper-left');
        isNear(pixels[1], g0, 'green component of upper-left');

        var offset = 4 * (image.width * image.height - 1);
        isNear(pixels[offset], r1,
               'red component of lower right');
        isNear(pixels[offset + 1], g1,
               'green component of lower right');

        image.src = '';
        URL.revokeObjectURL(url);
        canvas.width = 0;
        callback();
      }
      catch (e) {
        callback(e);
      }
    };

    // Return true if x is close enough to the target
    function isNear(x, target, message) {
      if (target - tolerance <= x && x <= target + tolerance) {
        return;
      }
      throw Error(message + ' ' + x + ' is not near ' + target);
    }
  }

  test('prerequsite modules loaded', function() {
    assert.isDefined(BlobView);
    assert.typeOf(parseJPEGMetadata, 'function');
    assert.typeOf(getImageSize, 'function');
    assert.typeOf(cropResizeRotate, 'function');
  });

  test('test image created successfully', function(done) {
    assert.instanceOf(this.jpegBlob, Blob, 'got jpegBlob');
    verifyImage(this.jpegBlob, W, H, 0, 0, W - 1, H - 1, 2, done);
  });

  function testInvalidCropRegion(left, top, width, height) {
    var invalidRegion = {
      left: left, top: top, width: width, height: height
    };
    var testTitle = 'get error for invalid crop region ' +
      left + ' ' + top + ' ' + width + ' ' + height;
    test(testTitle, function(done) {
      cropResizeRotate(this.jpegBlob, invalidRegion,
                       function(error, blob) {
                         if (error) {
                           done();
                         }
                         else {
                           done(Error('did not get expected error'));
                         }
                       });
    });
  }

  testInvalidCropRegion(-1, 0, 100, 100);
  testInvalidCropRegion(0, -1, 100, 100);
  testInvalidCropRegion(0, 0, 250, 100);
  testInvalidCropRegion(0, 0, 100, 181);
  testInvalidCropRegion(100, 100, 150, 100);
  testInvalidCropRegion(100, 100, 100, 90);

  function testInvalidOutputSize(size) {
    var testTitle = 'get error for invalid outputSize ' + JSON.stringify(size);
    test(testTitle, function(done) {
      cropResizeRotate(this.jpegBlob, null, size,
                       function(error, blob) {
                         if (error) {
                           done();
                         }
                         else {
                           done(Error('did not get expected error'));
                         }
                       });
    });
  }

  testInvalidOutputSize(0);
  testInvalidOutputSize(-2);
  testInvalidOutputSize({width: -1, height: 10});
  testInvalidOutputSize({width: 0, height: 10});
  testInvalidOutputSize({width: 10, height: -1});
  testInvalidOutputSize({width: 10, height: 0});
  testInvalidOutputSize({width: 10});
  testInvalidOutputSize({});

  function testInvalidOutputType(type) {
    var testTitle = 'get error for invalid outputType ' + type;
    test(testTitle, function(done) {
      cropResizeRotate(this.jpegBlob, null, null, type,
                       function(error, blob) {
                         if (error) {
                           done();
                         }
                         else {
                           done(Error('did not get expected error'));
                         }
                       });
    });
  }

  testInvalidOutputType('image/*');
  testInvalidOutputType('image/gif');

  //
  // Test that valid output types work
  //

  function testValidOutputType(type) {
    var testTitle = 'outputType ' + type;
    test(testTitle, function(done) {
      cropResizeRotate(this.jpegBlob, null, null, type, gotBlob);
      function gotBlob(error, blob) {
        try {
          assert.isNull(error);
          assert.instanceOf(blob, Blob);
          assert.equal(blob.type, type || 'image/jpeg');
          done();
        }
        catch (e) {
          done(e);
        }
      }
    });
  }
  testValidOutputType(null);
  testValidOutputType('image/jpeg');
  testValidOutputType('image/png');

  //
  // Test that with no arguments the input blob is used unmodified
  //
  test('blob unmodified for no-op', function(done) {
    var original = this.jpegBlob;
    cropResizeRotate(original, function(error, blob) {
      try {
        assert.isNull(error);
        assert.instanceOf(blob, Blob);
        assert.equal(blob, original);
        done();
      }
      catch (e) {
        done(e);
      }
    });
  });

  //
  // Test cropping alone
  //

  function testCrop(left, top, width, height) {
    var cropRegion = {
      left: left, top: top, width: width, height: height
    };
    var testTitle = 'Crop region: ' +
      left + ' ' + top + ' ' + width + ' ' + height;
    test(testTitle, function(done) {
      cropResizeRotate(this.jpegBlob, cropRegion, function(error, blob) {
        try {
          assert.isNull(error);
          assert.instanceOf(blob, Blob);
          verifyImage(blob, width, height, left, top,
                      left + width - 1, top + height - 1, 2, done);
        }
        catch (e) {
          done(e);
        }
      });
    });
  }

  testCrop(0, 0, W, H);
  testCrop(0, 0, 50, 50);
  testCrop(0, 50, 50, 50);
  testCrop(50, 0, 50, 50);
  testCrop(50, 50, 50, 50);
  testCrop(100, 100, 140, 80);
  testCrop(1, 1, 1, 1);

  //
  // Test resizing alone
  //

  function testResize(width, height) {
    var testTitle = 'Resize image to: ' + width + 'x' + height;
    test(testTitle, function(done) {
      var outputSize = { width: width, height: height };
      var tolerance = Math.max(W / width, H / height) * 2;

      // If the aspect ratio of the output size doesn't match the image
      // then we get an implict crop region, and we have to figure that out
      var cropX = 0, cropY = 0, cropW = W, cropH = H;
      var scaleX = width / W;
      var scaleY = height / H;
      if (scaleX < scaleY) {
        cropW = width / scaleY;
        cropX = (W - cropW) / 2;
      }
      else {
        cropH = height / scaleX;
        cropY = (H - cropH) / 2;
      }

      cropResizeRotate(this.jpegBlob, null, outputSize, function(error, blob) {
        try {
          assert.isNull(error);
          assert.instanceOf(blob, Blob);
          verifyImage(blob, width, height,
                      cropX, cropY, cropX + cropW - 1, cropY + cropH - 1,
                      tolerance, done);
        }
        catch (e) {
          done(e);
        }
      });
    });
  }

  // resize to the same aspect ratio
  testResize(40, 30);
  testResize(80, 60);
  testResize(160, 120);
  testResize(200, 150);

  // resize to different aspect ratios
  testResize(100, 100);
  testResize(200, 100);

  //
  // Test resizing to a specified maximum number of pixels
  //
  function testResizeMaxPixels(max, factor) {
    var testTitle = 'Resize image fewer pixels than: ' + max;
    test(testTitle, function(done) {
      var tolerance = factor;

      var expectedWidth = Math.round(W / factor);
      var expectedHeight = Math.round(H / factor);

      cropResizeRotate(this.jpegBlob, null, max, function(error, blob) {
        try {
          assert.isNull(error);
          assert.instanceOf(blob, Blob);
          verifyImage(blob, expectedWidth, expectedHeight,
                      0, 0, W - 1, H - 1,
                      tolerance, done);
        }
        catch (e) {
          done(e);
        }
      });
    });
  }

  testResizeMaxPixels(1000000, 1);   // no resize
  testResizeMaxPixels(W * H, 1); // no resize
  testResizeMaxPixels(W * H / 2, 2);
  testResizeMaxPixels(W * H / 3, 2);
  testResizeMaxPixels(W * H / 4, 2);
  testResizeMaxPixels(W * H / 5, 3);
  testResizeMaxPixels(W * H / 9, 3);
  testResizeMaxPixels(W * H / 10, 4);
  testResizeMaxPixels(W * H / 16, 4);

  //
  // Test rotation and mirroring alone
  // Our JPEG blob does not have real EXIF orientation data, so we
  // pass a fake metadata object to claim that it does and expect
  // it to be rotated appropriately
  //

  function testRotate(rotation, mirrored, width, height, r0, g0, r1, g1) {
    var testTitle = 'Rotation: ' + rotation;
    if (mirrored) {
      testTitle += ', mirrored';
    }

    test(testTitle, function(done) {
      var metadata = {
        width: W,
        height: H,
        rotation: rotation,
        mirrored: mirrored
      };

      cropResizeRotate(this.jpegBlob, null, null, null, metadata, gotBlob);

      function gotBlob(error, blob) {
        try {
          assert.isNull(error);
          assert.instanceOf(blob, Blob);
          verifyImage(blob, width, height, r0, g0, r1, g1, 2, done);
        }
        catch (e) {
          done(e);
        }
      }
    });
  }

  testRotate(0, false, W, H, 0, 0, W - 1, H - 1);
  testRotate(0, true, W, H, W - 1, 0, 0, H - 1);
  testRotate(90, false, H, W, 0, H - 1, W - 1, 0);
  testRotate(90, true, H, W, 0, 0, W - 1, H - 1);
  testRotate(H, false, W, H, W - 1, H - 1, 0, 0);
  testRotate(H, true, W, H, 0, H - 1, W - 1, 0);
  testRotate(270, false, H, W, W - 1, 0, 0, H - 1);
  testRotate(270, true, H, W, W - 1, H - 1, 0, 0);


  //
  // Test rotation and mirroring along with cropping
  //

  function testCropAndRotate(left, top, width, height, rotation, mirrored,
                             r0, g0, r1, g1) {
    var testTitle = 'Crop and rotate: ' + left + ' ' + top + ' ' +
      width + ' ' + height + ' ' + rotation + ' ' + mirrored;

    test(testTitle, function(done) {
      var cropRegion = {
        left: left,
        top: top,
        width: width,
        height: height
      };
      var metadata = {
        width: W,
        height: H,
        rotation: rotation,
        mirrored: mirrored
      };

      cropResizeRotate(this.jpegBlob, cropRegion, null, null, metadata,
                       gotBlob);

      function gotBlob(error, blob) {
        try {
          assert.isNull(error);
          assert.instanceOf(blob, Blob);
          verifyImage(blob, width, height, r0, g0, r1, g1, 2, done);
        }
        catch (e) {
          done(e);
        }
      }
    });
  }

  // We use a 150x100 crop region with left corner at (25,25) for all of these.
  // This crop region is in the rotated coordinate system
  testCropAndRotate(25, 25, 150, 100, 0, false, 25, 25, 174, 124);
  testCropAndRotate(25, 25, 150, 100, 0, true, 214, 25, 65, 124);
  testCropAndRotate(25, 25, 150, 100, 180, false, 215, 155, 65, 55);


});
