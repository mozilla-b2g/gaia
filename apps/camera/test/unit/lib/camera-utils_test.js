/*jshint maxlen:false*/
/*global req*/
'use strict';

suite('utils/camera-utils', function() {
  var CameraUtils;

  suiteSetup(function(done) {
    var self = this;

    this.modules = {};

    req([
      'lib/camera-utils'
    ], function(_CameraUtils) {
      CameraUtils = self.modules.CameraUtils = _CameraUtils;

      done();
    });
  });

  setup(function() {

  });

  suite('scaleSizeToFitViewport', function() {
    setup(function() {

    });

    test('Should scale image size to *FIT* viewport ' +
         'preserving aspect ratio', function() {
      var viewportSize, imageSize, outputSize;

      // Case where image size exactly matches viewport size
      viewportSize = {
        width: 720,
        height: 1280
      };
      imageSize = {
        width: 720,
        height: 1280
      };
      outputSize = CameraUtils.scaleSizeToFitViewport(viewportSize, imageSize);
      assert.equal(outputSize.width, 720);
      assert.equal(outputSize.height, 1280);

      // Case where image size has larger width, smaller height than viewport
      viewportSize = {
        width: 720,
        height: 1280
      };
      imageSize = {
        width: 800,
        height: 1280
      };
      outputSize = CameraUtils.scaleSizeToFitViewport(viewportSize, imageSize);
      assert.equal(outputSize.width, 720);
      assert.equal(outputSize.height, 1152);

      // Case where image size has larger height, smaller width than viewport
      viewportSize = {
        width: 720,
        height: 1280
      };
      imageSize = {
        width: 720,
        height: 1440
      };
      outputSize = CameraUtils.scaleSizeToFitViewport(viewportSize, imageSize);
      assert.equal(outputSize.width, 640);
      assert.equal(outputSize.height, 1280);

      // Case where image size has larger width, larger height than viewport
      // (different aspect ratio)
      viewportSize = {
        width: 600,
        height: 800
      };
      imageSize = {
        width: 720,
        height: 1152
      };
      outputSize = CameraUtils.scaleSizeToFitViewport(viewportSize, imageSize);
      assert.equal(outputSize.width, 500);
      assert.equal(outputSize.height, 800);

      // Case where image size has larger width, larger height than viewport
      // (same aspect ratio)
      viewportSize = {
        width: 720,
        height: 1280
      };
      imageSize = {
        width: 1080,
        height: 1920
      };
      outputSize = CameraUtils.scaleSizeToFitViewport(viewportSize, imageSize);
      assert.equal(outputSize.width, 720);
      assert.equal(outputSize.height, 1280);

      // Case where image size has smaller width, smaller height than viewport
      // (different aspect ratio)
      viewportSize = {
        width: 720,
        height: 1152
      };
      imageSize = {
        width: 600,
        height: 800
      };
      outputSize = CameraUtils.scaleSizeToFitViewport(viewportSize, imageSize);
      assert.equal(outputSize.width, 720);
      assert.equal(outputSize.height, 960);

      // Case where image size has smaller width, smaller height than viewport
      // (same aspect ratio)
      viewportSize = {
        width: 1080,
        height: 1920
      };
      imageSize = {
        width: 720,
        height: 1280
      };
      outputSize = CameraUtils.scaleSizeToFitViewport(viewportSize, imageSize);
      assert.equal(outputSize.width, 1080);
      assert.equal(outputSize.height, 1920);
    });
  });

  suite('scaleSizeToFillViewport', function() {
    setup(function() {});

    test('Should scale image size to *FILL* viewport ' +
         'preserving aspect ratio', function() {
      var viewportSize, imageSize, outputSize;

      // Case where image size exactly matches viewport size
      viewportSize = {
        width: 720,
        height: 1280
      };
      imageSize = {
        width: 720,
        height: 1280
      };
      outputSize = CameraUtils.scaleSizeToFillViewport(viewportSize, imageSize);
      assert.equal(outputSize.width, 720);
      assert.equal(outputSize.height, 1280);

      // Case where image size has larger width, smaller height than viewport
      viewportSize = {
        width: 720,
        height: 1280
      };
      imageSize = {
        width: 800,
        height: 1280
      };
      outputSize = CameraUtils.scaleSizeToFillViewport(viewportSize, imageSize);
      assert.equal(outputSize.width, 800);
      assert.equal(outputSize.height, 1280);

      // Case where image size has larger height, smaller width than viewport
      viewportSize = {
        width: 720,
        height: 1280
      };
      imageSize = {
        width: 720,
        height: 1440
      };
      outputSize = CameraUtils.scaleSizeToFillViewport(viewportSize, imageSize);
      assert.equal(outputSize.width, 720);
      assert.equal(outputSize.height, 1440);

      // Case where image size has larger width, larger height than viewport
      // (different aspect ratio)
      viewportSize = {
        width: 600,
        height: 800
      };
      imageSize = {
        width: 720,
        height: 1152
      };
      outputSize = CameraUtils.scaleSizeToFillViewport(viewportSize, imageSize);
      assert.equal(outputSize.width, 600);
      assert.equal(outputSize.height, 960);

      // Case where image size has larger width, larger height than viewport
      // (same aspect ratio)
      viewportSize = {
        width: 720,
        height: 1280
      };
      imageSize = {
        width: 1080,
        height: 1920
      };
      outputSize = CameraUtils.scaleSizeToFillViewport(viewportSize, imageSize);
      assert.equal(outputSize.width, 720);
      assert.equal(outputSize.height, 1280);

      // Case where image size has smaller width, smaller height than viewport
      // (different aspect ratio)
      viewportSize = {
        width: 720,
        height: 1152
      };
      imageSize = {
        width: 600,
        height: 800
      };
      outputSize = CameraUtils.scaleSizeToFillViewport(viewportSize, imageSize);
      assert.equal(outputSize.width, 864);
      assert.equal(outputSize.height, 1152);

      // Case where image size has smaller width, smaller height than viewport
      // (same aspect ratio)
      viewportSize = {
        width: 1080,
        height: 1920
      };
      imageSize = {
        width: 720,
        height: 1280
      };
      outputSize = CameraUtils.scaleSizeToFillViewport(viewportSize, imageSize);
      assert.equal(outputSize.width, 1080);
      assert.equal(outputSize.height, 1920);
    });
  });

  suite('getOptimalPreviewSize', function() {
    setup(function() {});

    test('Should select optimal preview size to ' +
         'match picture size preserving aspect ratio', function() {
      var pictureSize, previewSizes, optimalPreviewSize;

      // Hamachi test case
      pictureSize = {
        width: 480,
        height: 320
      };

      previewSizes = [
        { width:  640,
          height: 480  },
        { width:  576,
          height: 432  },
        { width:  480,
          height: 320  },
        { width:  432,
          height: 240  },
        { width:  384,
          height: 288  },
        { width:  352,
          height: 288  },
        { width:  320,
          height: 240  },
        { width:  240,
          height: 160  },
        { width:  176,
          height: 144  }
      ];

      optimalPreviewSize = CameraUtils.getOptimalPreviewSize(previewSizes,
                                                             pictureSize,
                                                             pictureSize);
      assert.equal(optimalPreviewSize.width, 480);
      assert.equal(optimalPreviewSize.height, 320);

      // Helix test case
      pictureSize = {
        width: 800,
        height: 480
      };

      previewSizes = [
        { width:  1280,
          height: 720  },
        { width:  864,
          height: 480  },
        { width:  800,
          height: 480  },
        { width:  768,
          height: 432  },
        { width:  720,
          height: 480  },
        { width:  640,
          height: 480  },
        { width:  576,
          height: 432  },
        { width:  480,
          height: 320  },
        { width:  432,
          height: 240  },
        { width:  384,
          height: 288  },
        { width:  352,
          height: 288  },
        { width:  320,
          height: 240  },
        { width:  240,
          height: 160  },
        { width:  176,
          height: 144  }
      ];

      optimalPreviewSize = CameraUtils.getOptimalPreviewSize(previewSizes,
                                                             pictureSize,
                                                             pictureSize);
      assert.equal(optimalPreviewSize.width, 800);
      assert.equal(optimalPreviewSize.height, 480);

      // Nexus 4 test case
      pictureSize = {
        width: 1280,
        height: 720
      };

      previewSizes = [
        { width:  1280,
          height: 720  },
        { width:  800,
          height: 480  },
        { width:  768,
          height: 432  },
        { width:  720,
          height: 480  },
        { width:  640,
          height: 480  },
        { width:  576,
          height: 432  },
        { width:  480,
          height: 320  },
        { width:  384,
          height: 288  },
        { width:  352,
          height: 288  },
        { width:  320,
          height: 240  },
        { width:  240,
          height: 160  },
        { width:  176,
          height: 144  }
      ];

      optimalPreviewSize = CameraUtils.getOptimalPreviewSize(previewSizes,
                                                             pictureSize,
                                                             pictureSize);
      assert.equal(optimalPreviewSize.width, 1280);
      assert.equal(optimalPreviewSize.height, 720);
    });
  });
});
