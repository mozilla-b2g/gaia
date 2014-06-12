'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire');
var mockUtils =
  require('./mock_utils.js');

suite('image-resolution.js', function() {
  var app;
  var isFileExists;
  setup(function() {
    app = proxyquire.noCallThru().load(
            '../../image-resolution', {
              './utils': mockUtils
            });

    var GetFile = function(path) {
      this.path = path;
      this.isRemoved = false;
    };
    GetFile.prototype = {
      remove: function() {
        this.isRemoved = true;
      },
      get parent() {
        return mockUtils.getFile(this.path + '_parent');
      },
      exists: function() {
        return isFileExists;
      }
    };

    mockUtils.getFile = function(path) {
      return new GetFile(path);
    };
  });

  teardown(function() {
    app = null;
    isFileExists = null;
  });

  suite('pickImageByResolution', function() {
    var imageResolution;
    setup(function() {
      imageResolution = new app.ImageResolution();
    });

    test('pickImageByResolution, when scanned file is 2x and ' +
      'GAIA_DEV_PIXELS_PER_PX is 1', function() {
        var filePath = 'test@2x.png';

        var file = mockUtils.getFile(filePath);
        imageResolution.config = {};

        imageResolution.config.GAIA_DEV_PIXELS_PER_PX = '1';
        imageResolution.pickImageByResolution(file);

        assert.equal(file.isRemoved, true);
      });

    test('pickImageByResolution, when scanned file is default and ' +
      'GAIA_DEV_PIXELS_PER_PX is 1', function() {
        var filePath = 'test.png';

        var file = mockUtils.getFile(filePath);
        imageResolution.config = {};

        imageResolution.config.GAIA_DEV_PIXELS_PER_PX = '1';
        imageResolution.pickImageByResolution(file);

        assert.equal(file.isRemoved, false);
      });

    test('pickImageByResolution, when scanned file is default and ' +
      'GAIA_DEV_PIXELS_PER_PX is 2 and @2x file exists', function() {
        var filePath = 'test.png';

        var file = mockUtils.getFile(filePath);
        imageResolution.config = {};

        imageResolution.config.GAIA_DEV_PIXELS_PER_PX = '2';
        imageResolution.pickImageByResolution(file);

        // hidpi file which meet GAIA_DEV_PIXELS_PER_PX exists.
        isFileExists = true;
        assert.equal(file.isRemoved, false);
      });

    test('pickImageByResolution, when scanned file is default and ' +
      'GAIA_DEV_PIXELS_PER_PX is 2 and @2x file doenot exist', function() {
        var filePath = 'test.png';

        var file = mockUtils.getFile(filePath);
        imageResolution.config = {};

        imageResolution.config.GAIA_DEV_PIXELS_PER_PX = '2';
        imageResolution.pickImageByResolution(file);

        isFileExists = false;
        assert.equal(file.isRemoved, false);
      });
  });
});
