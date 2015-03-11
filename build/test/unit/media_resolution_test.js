'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire');
var mockUtils = require('./mock_utils.js');

suite('media-resolution.js', function() {
  var app;
  var isFileExists;

  setup(function() {
    app = proxyquire.noCallThru().load(
      '../../media-resolution', {
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

  suite('pickMediaByResolution', function() {
    var mediaResolution;

    setup(function() {
      mediaResolution = new app.MediaResolution();
    });

    test('pickMediaByResolution, when scanned file is 2x and ' +
      'GAIA_DEV_PIXELS_PER_PX is 1', function() {
        var filePath = 'test@2x.png';
        var file = mockUtils.getFile(filePath);
        mediaResolution.options = {};
        mediaResolution.options.GAIA_DEV_PIXELS_PER_PX = '1';
        mediaResolution.pickMediaByResolution(file);

        assert.equal(file.isRemoved, true);
      });

    test('pickMediaByResolution, when scanned file is default and ' +
      'GAIA_DEV_PIXELS_PER_PX is 1', function() {
        var filePath = 'test.png';
        var file = mockUtils.getFile(filePath);
        mediaResolution.options = {};
        mediaResolution.options.GAIA_DEV_PIXELS_PER_PX = '1';
        mediaResolution.pickMediaByResolution(file);

        assert.equal(file.isRemoved, false);
      });

    test('pickMediaByResolution, when scanned file is default and ' +
      'GAIA_DEV_PIXELS_PER_PX is 2 and @2x file exists', function() {
        var filePath = 'test.png';
        var file = mockUtils.getFile(filePath);
        mediaResolution.options = {};
        mediaResolution.options.GAIA_DEV_PIXELS_PER_PX = '2';
        mediaResolution.pickMediaByResolution(file);

        // hidpi file which meet GAIA_DEV_PIXELS_PER_PX exists.
        isFileExists = true;
        assert.equal(file.isRemoved, false);
      });

    test('pickMediaByResolution, when scanned file is default and ' +
      'GAIA_DEV_PIXELS_PER_PX is 2 and @2x file doenot exist', function() {
        var filePath = 'test.png';
        var file = mockUtils.getFile(filePath);
        mediaResolution.options = {};
        mediaResolution.options.GAIA_DEV_PIXELS_PER_PX = '2';
        mediaResolution.pickMediaByResolution(file);

        isFileExists = false;
        assert.equal(file.isRemoved, false);
      });

    test('pickMediaByResolution, when scanned file has video extension and ' +
      'GAIA_DEV_PIXELS_PER_PX is 2 and @2x file exists', function() {
        var filePath = 'test.mp4';
        var file = mockUtils.getFile(filePath);
        mediaResolution.options = {};
        mediaResolution.options.GAIA_DEV_PIXELS_PER_PX = '2';
        mediaResolution.pickMediaByResolution(file);

        // hidpi file which meet GAIA_DEV_PIXELS_PER_PX exists.
        isFileExists = true;
        assert.equal(file.isRemoved, false);
      });
  });
});
