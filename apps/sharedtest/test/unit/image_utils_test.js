'use strict';

/* global ImageUtils */

require('/shared/js/image_utils.js');

suite('ImageUtils', function() {

  const testImages = [
    {
      type: 'image/jpeg',
      width: 25,
      height: 24,
      base64: '/9j/4AAQSkZJRgABAQEASABIAAD/4ge4SUNDX1BST0ZJTEUAAQEAAAeoYXBwbAIgAABtbnRyUkdCIFhZWiAH2QACABkACwAaAAthY3NwQVBQTAAAAABhcHBsAAAAAAAAAAAAAAAAAAAAAAAA9tYAAQAAAADTLWFwcGwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAtkZXNjAAABCAAAAG9kc2NtAAABeAAABWxjcHJ0AAAG5AAAADh3dHB0AAAHHAAAABRyWFlaAAAHMAAAABRnWFlaAAAHRAAAABRiWFlaAAAHWAAAABRyVFJDAAAHbAAAAA5jaGFkAAAHfAAAACxiVFJDAAAHbAAAAA5nVFJDAAAHbAAAAA5kZXNjAAAAAAAAABRHZW5lcmljIFJHQiBQcm9maWxlAAAAAAAAAAAAAAAUR2VuZXJpYyBSR0IgUHJvZmlsZQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAbWx1YwAAAAAAAAAeAAAADHNrU0sAAAAoAAABeGhySFIAAAAoAAABoGNhRVMAAAAkAAAByHB0QlIAAAAmAAAB7HVrVUEAAAAqAAACEmZyRlUAAAAoAAACPHpoVFcAAAAWAAACZGl0SVQAAAAoAAACem5iTk8AAAAmAAAComtvS1IAAAAWAAACyGNzQ1oAAAAiAAAC3mhlSUwAAAAeAAADAGRlREUAAAAsAAADHmh1SFUAAAAoAAADSnN2U0UAAAAmAAAConpoQ04AAAAWAAADcmphSlAAAAAaAAADiHJvUk8AAAAkAAADomVsR1IAAAAiAAADxnB0UE8AAAAmAAAD6G5sTkwAAAAoAAAEDmVzRVMAAAAmAAAD6HRoVEgAAAAkAAAENnRyVFIAAAAiAAAEWmZpRkkAAAAoAAAEfHBsUEwAAAAsAAAEpHJ1UlUAAAAiAAAE0GFyRUcAAAAmAAAE8mVuVVMAAAAmAAAFGGRhREsAAAAuAAAFPgBWAWEAZQBvAGIAZQBjAG4A/QAgAFIARwBCACAAcAByAG8AZgBpAGwARwBlAG4AZQByAGkBDQBrAGkAIABSAEcAQgAgAHAAcgBvAGYAaQBsAFAAZQByAGYAaQBsACAAUgBHAEIAIABnAGUAbgDoAHIAaQBjAFAAZQByAGYAaQBsACAAUgBHAEIAIABHAGUAbgDpAHIAaQBjAG8EFwQwBDMEMAQ7BEwEPQQ4BDkAIAQ/BEAEPgREBDAEOQQ7ACAAUgBHAEIAUAByAG8AZgBpAGwAIABnAOkAbgDpAHIAaQBxAHUAZQAgAFIAVgBCkBp1KAAgAFIARwBCACCCcl9pY8+P8ABQAHIAbwBmAGkAbABvACAAUgBHAEIAIABnAGUAbgBlAHIAaQBjAG8ARwBlAG4AZQByAGkAcwBrACAAUgBHAEIALQBwAHIAbwBmAGkAbMd8vBgAIABSAEcAQgAg1QS4XNMMx3wATwBiAGUAYwBuAP0AIABSAEcAQgAgAHAAcgBvAGYAaQBsBeQF6AXVBeQF2QXcACAAUgBHAEIAIAXbBdwF3AXZAEEAbABsAGcAZQBtAGUAaQBuAGUAcwAgAFIARwBCAC0AUAByAG8AZgBpAGwAwQBsAHQAYQBsAOEAbgBvAHMAIABSAEcAQgAgAHAAcgBvAGYAaQBsZm6QGgAgAFIARwBCACBjz4/wZYdO9k4AgiwAIABSAEcAQgAgMNcw7TDVMKEwpDDrAFAAcgBvAGYAaQBsACAAUgBHAEIAIABnAGUAbgBlAHIAaQBjA5MDtQO9A7kDugPMACADwAPBA78DxgOvA7sAIABSAEcAQgBQAGUAcgBmAGkAbAAgAFIARwBCACAAZwBlAG4A6QByAGkAYwBvAEEAbABnAGUAbQBlAGUAbgAgAFIARwBCAC0AcAByAG8AZgBpAGUAbA5CDhsOIw5EDh8OJQ5MACAAUgBHAEIAIA4XDjEOSA4nDkQOGwBHAGUAbgBlAGwAIABSAEcAQgAgAFAAcgBvAGYAaQBsAGkAWQBsAGUAaQBuAGUAbgAgAFIARwBCAC0AcAByAG8AZgBpAGkAbABpAFUAbgBpAHcAZQByAHMAYQBsAG4AeQAgAHAAcgBvAGYAaQBsACAAUgBHAEIEHgQxBEkEOAQ5ACAEPwRABD4ERAQ4BDsETAAgAFIARwBCBkUGRAZBACAGKgY5BjEGSgZBACAAUgBHAEIAIAYnBkQGOQYnBkUARwBlAG4AZQByAGkAYwAgAFIARwBCACAAUAByAG8AZgBpAGwAZQBHAGUAbgBlAHIAZQBsACAAUgBHAEIALQBiAGUAcwBrAHIAaQB2AGUAbABzAGV0ZXh0AAAAAENvcHlyaWdodCAyMDA3IEFwcGxlIEluYy4sIGFsbCByaWdodHMgcmVzZXJ2ZWQuAFhZWiAAAAAAAADzUgABAAAAARbPWFlaIAAAAAAAAHRNAAA97gAAA9BYWVogAAAAAAAAWnUAAKxzAAAXNFhZWiAAAAAAAAAoGgAAFZ8AALg2Y3VydgAAAAAAAAABAc0AAHNmMzIAAAAAAAEMQgAABd7///MmAAAHkgAA/ZH///ui///9owAAA9wAAMBs/+EAnkV4aWYAAE1NACoAAAAIAAYBEgADAAAAAQABAAABGgAFAAAAAQAAAFYBGwAFAAAAAQAAAF4BKAADAAAAAQACAAABMQACAAAAEQAAAGaHaQAEAAAAAQAAAHgAAAAAAAAASAAAAAEAAABIAAAAAUFkb2JlIEltYWdlUmVhZHkAAAACoAIABAAAAAEAAAAZoAMABAAAAAEAAAAYAAAAAP/bAEMAIBYYHBgUIBwaHCQiICYwUDQwLCwwYkZKOlB0Znp4cmZwboCQuJyAiK6KbnCg2qKuvsTO0M58muLy4MjwuMrOxv/bAEMBIiQkMCowXjQ0XsaEcITGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxv/AABEIABgAGQMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8/T19vf4+fr/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2gAMAwEAAhEDEQA/ANu5m8iEyYzjoPWsuXU5YzuJHrjHFaF/C01qyp94cgetc5JGJDtOFJ4OQcikpcstdi/Z88dNzqIZBLGrjuM1JVWxD+SGcbc4CjvirVEW2tSWrMrOblXYqoYZOAfSmZuASxhRienHSiimIlJm38Zxnpip6KKAP//Z'  // jshint ignore:line
    },
    {
      type: 'image/png',
      width: 25,
      height: 24,
      base64: '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'  // jshint ignore:line
    },
    {
      type: 'image/gif',
      width: 25,
      height: 24,
      base64: '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'  // jshint ignore:line
    },
    {
      type: 'image/bmp',
      width: 25,
      height: 24,
      base64: 'Qk1WBwAAAAAAADYAAAAoAAAAGQAAABgAAAABABgAAAAAACAHAAATCwAAEwsAAAAAAAAAAAAAAAAA////////////////////////////////////////////////////////////////////////////////////////////////AP///0c5OUBAQAAAAEY+PkBAQFUrK0BAQEU9PUQ8PEBAQEY6OkRAPEBAOkNDNkY+Pkc9Pf///0M/P0BAQEBAQERAPEY+Pv///wAAAAD///9DPT1DPj7///9CPjxEPj5DPz9CPT1CPzxDQD1EPz1CPj5DPz1CPT1CPjxDPjxHPT1EQDxEPj5DPj5CPz9AQEBDPj5EPj7///8A////Qj87Qj48QTw8Qz89Qj09QT09Qz49Qz09RD49Qz89Qj48Qj87Qz09Qz09Qz48////RD4+////Qz09Qj09RDw8Qj48QTs7////AP///0M8PEM+PUM9PUI8PEM/PUI+PEQ9PUE9PUM9PUM+PEM+PkM9PUI/PEI9PUM+PkNDQ0I9PUU7O0E8PEM+PkI+PkBAQP///wAAAAD///9CPT1DPjxDPj5CPT1HOTn///9AQED///9EPj5CPT9COkoAAP8AAP////////////9EPj5DPj5EPj5CPT1DPj5EPT1GRkb///8A////////Szw8QEBAQjk5QEBA////////////////SkoggIAA////////////////////////REQzVSsr////SUk3Q0ND////////AP///////////////////////wAAAAAAqgBAAAAAAAAAMgoAXBcNaBAKVg4AOwAAAP///0BAv////////0BAQP///////////////wD///8AAABVVVVVVVVVVVX///8AAGYAAAAMAD8XEHobGJAcH5sdJKQcJaMcJqMeIIoYAEgAAAAkJEmAgID///+AgICAgID///////8A////////////////////AAD/////Fw5xHBaRHyOsHyuyHzK4Hze9HzvCHz3EIznAHyyhFCKM////////AAAA////////////////AP///////////////wAAv////x0Xlx0bnCAosR8yth06wRxDyxxIzB1Lyx1X0x5a1B9JzSA6uiIxrP///wAAgP///////////////wD///////////8AAID///////8dIaIgKrYeNLkePsMgRMIqPJ8xLGkuKWMpP5Uha84gctgkWM4lNKAhC5D///8AAID///////////8A////////////MzOZ////HCiqHimrHjS7Hj7DH0TGID+1JSmEMwA9PAAAPAAAL0VjGaLcGpjdI2bFJBuy////QEC/////////////AP///////wAA/wAAgP///x8zsyA1wR09wR9CwxlPzCFUxS1TuhxnxDVmm0whIz0NAC+WuyHL8Ra37Rh84P///wCAv////////////wD///////8AgP////////8eOrsgPcshRcUYPr4tP7BeNVdmMCdeVG9eUmZWJyJIAAA7Z3o02/cq5P4plMn///////8AAP////////8A////////AID/////////HkPFIEPQIU3IHE/GKkmsZExihC4AhSsAeSUAajEjVgAAdnp5d+36cO//SpK2////////AP//////////AP///////wD//////////x5PzSFL1x9QyCRczAd42j5+x5JiX51RKJNKMII9JnQnAI1aUHrN14r6/0y33v///////wAAAP///////wD///////////8AQL////8dVdUeT84iU8smZM8jfdAlaMdeer6iaEuuXRGcVjKYRBWMQyOL1d1r/P8A6vz///8zzMz///////////8A////////////AEC/////IjOqIES+AFTaAGjZAIzheXSTrHBTu3w4w3oct28upEwAwJmNv///ZN7wANbr////Vaqq////////////AP///////////wCA/////1VVqg5Ev3JgoIxogGGDq3ycpNaPBNmRI9COLsF6HrNlIszHv7Td7Wedx////////////////////////wD///////////////////////8AY+/BlHXRhiLXiTDGnGjaoFbmoUfin0TfljDYo3HOx7mfpsL///////8AAP////////////////8A/////////////////////////////////9eu5KVb56BC5aRT5ahb46VW36BV57qG/+Nx////////AAD/////////////////////AP///////////////////////wCA/7+AgP//////////0fO/eu22bfO7dv//tv///////8zMzP///////////////////////////wD/////////////////////////////////qlWqVQD///////////////////+/v4D/qqr///////////////////////////////8A'  // jshint ignore:line
    }
  ];

  suite('MIME type constants', function() {
    test('JPEG', function() { assert.equal(ImageUtils.JPEG, 'image/jpeg'); });
    test('PNG', function() { assert.equal(ImageUtils.PNG, 'image/png'); });
    test('GIF', function() { assert.equal(ImageUtils.GIF, 'image/gif'); });
    test('BMP', function() { assert.equal(ImageUtils.BMP, 'image/bmp'); });
  });


  suite('getSizeAndType', function() {

    function makeBlobFromString(binaryString, type) {
      var buffer = new ArrayBuffer(binaryString.length);
      var bytes = new Uint8Array(buffer);
      for (var i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new Blob([buffer], { type: type });
    }

    suiteSetup(function() {
      // Create blobs for each of the test images
      testImages.forEach(function(image) {
        image.blob = makeBlobFromString(atob(image.base64), image.type);
      });
    });

    test('rejects string argument', function(done) {
      ImageUtils.getSizeAndType('data:foo').then(null, function() { done(); });
    });

    test('rejects numeric argument', function(done) {
      ImageUtils.getSizeAndType(1).then(null, function() { done(); });
    });

    test('rejects object argument', function(done) {
      ImageUtils.getSizeAndType({size:100}).then(null, function() { done(); });
    });

    // Test that we can get the width and height of each test image
    testImages.forEach(function(image) {
      test(image.type, function(done) {
        ImageUtils.getSizeAndType(image.blob).then(function resolve(data) {
          try {
            assert.equal(data.type, image.type);
            assert.equal(data.width, image.width);
            assert.equal(data.height, image.height);
            done();
          }
          catch (e) {
            done(e);
          }
        }, function reject(e) { done(new Error(e)); });
      });
    });

    // Test that we can get the size of a JPEG file even if it has a large
    // EXIF metadata segment before the segments that hold image size.
    test('jpeg with large EXIF segments', function(done) {
      // Splice some fake EXIF data in at the start of the JPEG file
      // to force the image size data to be beyond the 32kb boundary
      var jpeg = testImages[0];
      var exif = new ArrayBuffer(40 * 1024);
      var view = new DataView(exif);
      view.setUint8(0, 0xFF);
      view.setUint8(1, 0xE0); // APP0 segment for EXIF
      view.setUint16(2, (40 * 1024) - 2);
      var newblob = new Blob([jpeg.blob.slice(0, 2),
                              exif, exif, jpeg.blob.slice(2)],
                             { type: 'image/jpeg' });
      ImageUtils.getSizeAndType(newblob).then(
        function resolve(data) {
          try {
            assert.equal(data.type, jpeg.type);
            assert.equal(data.width, jpeg.width);
            assert.equal(data.height, jpeg.height);
            done();
          }
          catch (e) {
            done(e);
          }
        },
        function reject(e) {
          done(new Error(e));
        }
      );
    });

    test('reject zero-length blob', function(done) {
      var empty = new Blob([''], { type: 'image/jpeg' });
      ImageUtils.getSizeAndType(empty).then(
        function resolve() {
          done(new Error('failed to reject an empty blob'));
        },
        function reject() {
          done();
        }
      );
    });

    test('reject any blob < 16 bytes', function(done) {
      var empty = new Blob(['0123456789012345'], { type: 'image/jpeg' });
      ImageUtils.getSizeAndType(empty).then(
        function resolve() {
          done(new Error('failed to reject a short blob'));
        },
        function reject() {
          done();
        }
      );
    });


    // Test that if we truncate the test images we can't get their size
    testImages.forEach(function(image) {
      // We can't meaningfully test truncated gif files
      if (image.type === 'image/gif') {
        return;
      }

      test('reject truncated ' + image.type, function(done) {
        var truncated = image.blob.slice(0, 20);
        ImageUtils.getSizeAndType(truncated).then(
          function resolve(data) {
            done(new Error('failed to reject a truncated blob'));
          },
          function reject() {
            done();
          }
        );
      });
    });

    // Here are some files that are not image files and should be rejected
    var bogusFiles = [
      'This is a text file not an image file. It does not have a size',
      'GIF85a This is not a gif: the header is not correct',
      '\xff\xd8 Not a jpeg file because it does not have segments',
      'BM not really a BMP file since. File length data is not correct',
      '\x89PNG\r\n\x1a\n Not a PNG file: does not have an ihdr segment'
    ];

    bogusFiles.forEach(function(file, index) {
      test('Reject bogus file ' + index, function(done) {
        var bogus = makeBlobFromString(file, 'text/plain');
        ImageUtils.getSizeAndType(bogus).then(
          function resolve(data) {
            done(new Error('failed to reject bogus text:' + file));
          },
          function reject() {
            done();
          }
        );
      });
    });

  });

  suite('Downsample tests', function() {
    test('Check API', function() {
      assert.typeOf(ImageUtils.Downsample, 'object');
      assert.typeOf(ImageUtils.Downsample.sizeAtLeast, 'function');
      assert.typeOf(ImageUtils.Downsample.sizeNoMoreThan, 'function');
      assert.typeOf(ImageUtils.Downsample.areaAtLeast, 'function');
      assert.typeOf(ImageUtils.Downsample.areaNoMoreThan, 'function');
      assert.typeOf(ImageUtils.Downsample.MAX_SIZE_REDUCTION, 'number');
      assert.typeOf(ImageUtils.Downsample.MAX_AREA_REDUCTION, 'number');
      assert.typeOf(ImageUtils.Downsample.NONE, 'object');
      assert.equal(ImageUtils.Downsample.NONE.dimensionScale, 1);
      assert.equal(ImageUtils.Downsample.NONE.areaScale, 1);
      assert.equal(ImageUtils.Downsample.NONE.toString(), '');
    });

    var scales = [
      10, 2, 1,
      1 / 8, 2 / 8, 3 / 8, 4 / 8, 5 / 8, 6 / 8, 7 / 8,
      0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1,
      0.09, 0.08, 0.07, 0.06, 0.05, 0.04, 0.03, 0.02, 0.01
    ];

    // This is the same function we use in downsample.js
    function round(x) {
      return Math.round(x * 100) / 100;
    }

    test('sizeAtLeast', function() {
      var min = 1 / ImageUtils.Downsample.MAX_SIZE_REDUCTION;
      scales.forEach(function(scale) {
        var ds = ImageUtils.Downsample.sizeAtLeast(scale);
        assert.operator(ds.dimensionScale, '<=', round(Math.max(scale, min)));
        assert.equal(ds.scale(100), ds.dimensionScale * 100);
        assert.ok(ds === ImageUtils.Downsample.NONE ||
                  ds.toString()[0] === '#');
      });
    });

    test('areaAtLeast', function() {
      var min = 1 / ImageUtils.Downsample.MAX_AREA_REDUCTION;
      scales.forEach(function(scale) {
        var ds = ImageUtils.Downsample.areaAtLeast(scale);
        assert.operator(ds.areaScale, '<=', round(Math.max(scale, min)));

        ds = ImageUtils.Downsample.areaAtLeast(scale * scale);
        assert.operator(ds.areaScale, '<=',
                        round(Math.max(scale * scale, min)));
        assert.equal(ds.scale(100), ds.dimensionScale * 100);
        assert.ok(ds === ImageUtils.Downsample.NONE ||
                  ds.toString()[0] === '#');
      });
    });

    test('sizeNoMoreThan', function() {
      scales.forEach(function(scale) {
        var ds = ImageUtils.Downsample.sizeNoMoreThan(scale);
        assert.operator(ds.dimensionScale, '>=', round(Math.min(scale, 1)));
        assert.equal(ds.scale(100), ds.dimensionScale * 100);
        assert.ok(ds === ImageUtils.Downsample.NONE ||
                  ds.toString()[0] === '#');
      });
    });

    test('areaNoMoreThan', function() {
      scales.forEach(function(scale) {
        var ds = ImageUtils.Downsample.areaNoMoreThan(scale);
        assert.operator(ds.areaScale, '>=', round(Math.min(scale, 1)));

        ds = ImageUtils.Downsample.areaNoMoreThan(scale * scale);
        assert.operator(ds.areaScale, '>=', round(Math.min(scale * scale, 1)));
        assert.equal(ds.scale(100), ds.dimensionScale * 100);
        assert.ok(ds === ImageUtils.Downsample.NONE ||
                  ds.toString()[0] === '#');
      });
    });

    test('max reduction amounts', function() {
      var ds = ImageUtils.Downsample.sizeNoMoreThan(0);
      assert.equal(ds.dimensionScale,
                   round(1 / ImageUtils.Downsample.MAX_SIZE_REDUCTION));
      assert.equal(ds.areaScale,
                   round(1 / ImageUtils.Downsample.MAX_AREA_REDUCTION));
    });
  });


  function runResizeAndCropToCoverTests(imageWidth, imageHeight, imageType) {
    var suitename = 'resizeAndCropToCover ' + imageType + ' ' +
      imageWidth + 'x' + imageHeight;
    suite(suitename, function() {
      const W = imageWidth, H = imageHeight;  // The size of the test image
      const inputImageType = imageType;

      suiteSetup(function(done) {
        // We begin by creating a special image where each pixel value
        // encodes the coordinates of that pixel. This allows us to inspect
        // the pixels in the output image to verify that cropping
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

        // Create an encoded version of the input image
        var self = this;
        canvas.toBlob(function(blob) {
          self.inputBlob = blob;
          done();
        }, inputImageType);
      });

      // Decode the image blob and verify that its size is as expected and
      // that its upper-left pixel has red and green values near r0 and g0
      // and that its lower-right pixel has values near r1 and g1. We do a
      // fuzzy match because jpeg is a lossy format and because sometimes
      // we're working with downsampled or upscaled images.
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
            var imageData = context.getImageData(0, 0,
                                                 canvas.width, canvas.height);
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

      test('test images created', function(done) {
        assert.instanceOf(this.inputBlob, Blob, 'got Blob');
        assert.equal(this.inputBlob.type, inputImageType);
        verifyImage(this.inputBlob, W, H, 0, 0, W - 1, H - 1, 4, done);
      });

      test('throw for invalid input', function() {
        var self = this;
        assert.throws(function() {
          ImageUtils.cropAndResizeToCover();
        }, 'no arguments');
        assert.throws(function() {
          ImageUtils.cropAndResizeToCover('not a blob');
        }, 'not a blob');
        assert.throws(function() {
          ImageUtils.cropAndResizeToCover(self.inputBlob);
        }, 'no dimensions');
        assert.throws(function() {
          ImageUtils.cropAndResizeToCover(self.inputBlob, 0, 10);
        }, 'zero width');
        assert.throws(function() {
          ImageUtils.cropAndResizeToCover(self.inputBlob, 10, 0);
        }, 'zero height');
        assert.throws(function() {
          ImageUtils.cropAndResizeToCover(self.inputBlob, -10, 10);
        }, 'negative width');
        assert.throws(function() {
          ImageUtils.cropAndResizeToCover(self.inputBlob, 10, -10);
        }, 'negative height');
        assert.throws(function() {
          ImageUtils.cropAndResizeToCover(self.inputBlob, Infinity, 10);
        }, 'infinite width');
        assert.throws(function() {
          ImageUtils.cropAndResizeToCover(self.inputBlob, 10, Infinity);
        }, 'infinite height');
        assert.throws(function() {
          ImageUtils.cropAndResizeToCover(self.inputBlob, {}, 10);
        }, 'NaN width');
        assert.throws(function() {
          ImageUtils.cropAndResizeToCover(self.inputBlob, 10, {});
        }, 'NaN height');
      });

      // Verify that if the output size is the same as the input size then
      // the output blob is the same as the input blob
      test('input returned if no resize needed', function(done) {
        var self = this;
        ImageUtils.resizeAndCropToCover(this.inputBlob, W, H).then(
          function resolve(outputBlob) {
            try {
              assert.equal(self.inputBlob, outputBlob);
              done();
            }
            catch (ex) {
              done(ex);
            }
          });
      });

      test('unspecified output type', function(done) {
        var self = this;
        ImageUtils.resizeAndCropToCover(this.inputBlob, 10, 10)
          .then(function resolve(outputBlob) {
            assert.equal(outputBlob.type, self.inputBlob.type);
            done();
          });
      });

      test('jpeg output type', function(done) {
        ImageUtils.resizeAndCropToCover(this.inputBlob, 10, 10, ImageUtils.JPEG)
          .then(function resolve(outputBlob) {
            assert.equal(outputBlob.type, ImageUtils.JPEG);
            done();
          });
      });

      test('png output type', function(done) {
        ImageUtils.resizeAndCropToCover(this.inputBlob, 10, 10, ImageUtils.PNG)
          .then(function resolve(outputBlob) {
            assert.equal(outputBlob.type, ImageUtils.PNG);
            done();
          });
      });

      test('shrink no crop', function(done) {
        ImageUtils.resizeAndCropToCover(this.inputBlob, W / 3, H / 3)
          .then(function resolve(outputBlob) {
            verifyImage(outputBlob, Math.round(W / 3), Math.round(H / 3),
                        0, 0, W, H, 4, done);
          });
      });

      test('enlarge no crop', function(done) {
        ImageUtils.resizeAndCropToCover(this.inputBlob, W * 3, H * 3)
          .then(function resolve(outputBlob) {
            verifyImage(outputBlob, W * 3, H * 3, 0, 0, W, H, 4, done);
          });
      });

      var delta = 100;

      test('reduce height', function(done) {
        ImageUtils.resizeAndCropToCover(this.inputBlob, W, H - delta)
          .then(function resolve(outputBlob) {
            verifyImage(outputBlob, W, H - delta,
                        0, delta / 2, W, H - delta / 2, 4, done);
          });
      });

      test('reduce width', function(done) {
        ImageUtils.resizeAndCropToCover(this.inputBlob, W - delta, H)
          .then(function resolve(outputBlob) {
            verifyImage(outputBlob, W - delta, H,
                        delta / 2, 0, W - delta / 2, H, 4, done);
          });
      });

      test('enlarge height', function(done) {
        ImageUtils.resizeAndCropToCover(this.inputBlob, W, H + delta)
          .then(function resolve(outputBlob) {
            var ratio = (H + delta) / H;
            var margin = ((ratio - 1) * W) / (2 * ratio);
            verifyImage(outputBlob, W, H + delta,
                        margin, 0, W - margin, H,
                        4, done);
          });
      });

      test('enlarge width', function(done) {
        ImageUtils.resizeAndCropToCover(this.inputBlob, W + delta, H)
          .then(function resolve(outputBlob) {
            var ratio = (W + delta) / W;
            var margin = ((ratio - 1) * H) / (2 * ratio);
            verifyImage(outputBlob, W + delta, H,
                        0, margin, W, H - margin,
                        4, done);
          });
      });

      suite('#-moz-samplesize', function() {
        setup(function() {
          this.spy = sinon.spy(ImageUtils.Downsample, 'sizeNoMoreThan');
        });
        teardown(function() {
          this.spy.restore();
        });

        if (inputImageType === 'image/jpeg') {
          test('uses it at half size', function() {
            ImageUtils.resizeAndCropToCover(this.inputBlob, W / 2, H / 2)
              .then(function resolve(outputBlob) {
                assert.okay(this.spy.calledOnce);
                assert.equal(this.spy.returnValues[0].toString(),
                             '#-moz-samplesize=2');
              });
          });

          test('uses it at third size', function() {
            ImageUtils.resizeAndCropToCover(this.inputBlob, W / 3, H / 3)
              .then(function resolve(outputBlob) {
                assert.okay(this.spy.calledOnce);
                assert.equal(this.spy.returnValues[0].toString(),
                             '#-moz-samplesize=3');
              });
          });
          test('uses it at fifth size', function() {
            ImageUtils.resizeAndCropToCover(this.inputBlob, W / 5, H / 5)
              .then(function resolve(outputBlob) {
                assert.okay(this.spy.calledOnce);
                assert.equal(this.spy.returnValues[0].toString(),
                             '#-moz-samplesize=4');
              });
          });

          test('does not use at three quarters size', function() {
            ImageUtils.resizeAndCropToCover(this.inputBlob, W * 0.75, H * 0.75)
              .then(function resolve(outputBlob) {
                assert.okay(this.spy.calledOnce);
                assert.equal(this.spy.returnValues[0].toString(),
                             '');
              });
          });
        }
        else {
          test('does not use for non-jpeg', function() {
            ImageUtils.resizeAndCropToCover(this.inputBlob, W / 2, H / 2)
              .then(function resolve(outputBlob) {
                assert.okay(this.spy.notCalled);
              });
          });
        }
      });
    });
  }


  // We run the resizeAndCropToCover test suite six times for for three
  // different input image sizes and two different input image types
  ([
    [240, 180],   // 4x3
    [180, 240],   // 3x4
    [250, 250]   // square
  ]).forEach(function(size) {
    runResizeAndCropToCoverTests(size[0], size[1], 'image/jpeg');
    runResizeAndCropToCoverTests(size[0], size[1], 'image/png');
  });
});
