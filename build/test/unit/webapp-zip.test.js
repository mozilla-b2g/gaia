'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire');
var mockUtils =
  require('./mock_utils.js');

suite('webapp-zip.js', function() {
  var app;
  var mockOptions;
  var zipFilePath;
  var zipMode;
  var fileExists = false;
  var filePath;
  var isFile = false;
  var isDirectory = false;
  var isHidden = false;

  setup(function() {
    app = proxyquire.noCallThru().load(
            '../../webapp-zip', {
              './utils': mockUtils
            });
    var GetFile = function(path) {
      this.path = path;
      this.append = function(subPath) {
        this.path += ('/' + subPath);
      };
      this.clone = function() {
        return new GetFile(this.path);
      };
      this.leafName = this.path;
      this.parent = this;
      this.exists = function() {
        return fileExists;
      };
      this.isHidden = function() {
        return isHidden;
      };
      this.isFile = function() {
        return isFile;
      };
      this.isDirectory = function() {
        return isDirectory;
      };
    };
    mockUtils.getFile = function(path) {
      filePath = path;
      return new GetFile(path);
    };

    mockUtils.createZip = function() {
      return {
        open: function(file, mode) {
          zipFilePath = file.path;
          zipMode = mode;
        }
      };
    };

    mockUtils.getCompression = function(type) {
      return type;
    };

    mockUtils.ensureFolderExists = function() {
    };
  });

  teardown(function() {
    app = null;
    mockOptions = null;
    zipFilePath = null;
    zipMode = null;
    filePath = null;
    fileExists = false;
    isFile = false;
    isDirectory = false;
    isHidden = false;
  });

  suite('setOptions, getCompression, and isExcludeFromZip',
    function() {
    var mockOptions;
    var webappZip;
    setup(function() {
      mockOptions = {
        webapp: {
          buildDirectoryFile: mockUtils.getFile('testBuildDirectoryFile'),
          domain: 'testDomain'
        },
        targetDir: mockUtils.getFile('testTargetDir')
      };
      webappZip = new app.WebappZip();
    });

    test('setOptions', function() {
      webappZip.setOptions(mockOptions);
      assert.equal(zipFilePath, 'testTargetDir/testDomain/application.zip');
      assert.equal(zipMode, 0x04 | 0x08 | 0x20);
    });

    test('getCompression', function() {
      var pathInZip = 'pathInZip';
      webappZip.webapp = {
        metaData: {
          external: false,
          zip: {
          }
        }
      };
      webappZip.webapp.metaData.zip.mmap_files = [pathInZip];
      assert.equal(webappZip.getCompression(pathInZip), 'none');

      // we don't compress jpg file.
      pathInZip = 'pathInZip.jpg';
      delete webappZip.webapp.metaData;
      assert.equal(webappZip.getCompression(pathInZip), 'none');

      pathInZip = 'pathInZip.png';
      assert.equal(webappZip.getCompression(pathInZip), 'best');
    });

    test('isExcludedFromZip', function() {
      var file = mockUtils.getFile('locales');
      isFile = true;
      fileExists = true;
      webappZip.config = {};

      webappZip.config.GAIA_CONCAT_LOCALES = '1';
      webappZip.buildDir = mockUtils.getFile('test');
      assert.equal(webappZip.isExcludedFromZip(file), true,
        'Ignore l10n files if they have been inlined or concatenated');

      file = mockUtils.getFile('locales-obj');
      webappZip.config.GAIA_CONCAT_LOCALES = '0';
      assert.equal(webappZip.isExcludedFromZip(file), true,
        'Ignore l10n files if they have been inlined or concatenated');

      file = mockUtils.getFile('testapppath/test');
      webappZip.buildDir = mockUtils.getFile('testapppath');
      assert.equal(webappZip.isExcludedFromZip(file), true,
        'Ignore test file');
      file = mockUtils.getFile('testapppath/.git');
      assert.equal(webappZip.isExcludedFromZip(file), true,
        'Ignore .git file');
      file = mockUtils.getFile('testapppath/.unknown');
      assert.equal(webappZip.isExcludedFromZip(file), false,
        'other cases');

      fileExists = false;
      file = mockUtils.getFile('testapppath/.unknown');
      assert.equal(webappZip.isExcludedFromZip(file), true,
        'file not exists');
      fileExists = true;
      isHidden = true;
      file = mockUtils.getFile('testapppath/.unknown');
      assert.equal(webappZip.isExcludedFromZip(file), true,
        'file is hidden');
    });
  });

  suite('addToZip', function() {
    var webappZip;
    var isExcludedFromZip;
    var testResult;
    setup(function() {
      fileExists = true;
      isExcludedFromZip = false;
      mockUtils.addEntryContentWithTime = function(zip, pathInZip, l10nFile,
        time, needCompression) {
        testResult = {
          zip: zip,
          pathInZip: pathInZip,
          l10nFile: l10nFile,
          needCompression: needCompression
        };
      };
      webappZip = new app.WebappZip();
      webappZip.buildDir = mockUtils.getFile('testBuildDir');
      webappZip.getImagePathByResolution = function(file, pathInZip) {
        return pathInZip + '_bestResolution';
      };
      webappZip.isExcludedFromZip = function() {
        return isExcludedFromZip;
      };
      webappZip.getCompression = function() {
        return '1';
      };
      webappZip.config = {
        GAIA_DEFAULT_LOCALE: 'en-US-test'
      };
      webappZip.zipFile = {
        hasEntry: function(pathInZip) {
          return false;
        },
      };
    });

    teardown(function() {
      testResult = null;
    });
    test('file is hiddenr or is set excluded from zip', function() {
      var testFile = mockUtils.getFile('testfile');
      isHidden = true;
      isExcludedFromZip = false;
      assert.equal(webappZip.addToZip(testFile), undefined, 'file is hidden');

      isHidden = false;
      isExcludedFromZip = true;
      assert.equal(webappZip.addToZip(testFile), undefined,
        'file is not hidden, but from excluded list');
    });

    test('add localize html file', function() {
      var testFile = mockUtils.getFile('testBuildDir/testFile.html');
      // testFile_bestResolution
      isFile = true;
      fileExists = true;
      webappZip.addToZip(testFile);
      assert.equal(testResult.pathInZip, 'testFile.html');
      assert.equal(testResult.l10nFile.path,
        'testBuildDir/testFile.html/testBuildDir/testFile.html.en-US-test');

    });
  });
});
