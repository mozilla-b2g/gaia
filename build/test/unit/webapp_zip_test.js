'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire');
var mockUtils = require('./mock_utils.js');
var fsPath = require('path');

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
    var GetFile = function(filePath) {
      this.path = filePath;
      this.append = function(subPath) {
        this.path += ('/' + subPath);
      };
      this.clone = function() {
        return new GetFile(this.path);
      };
      this.leafName = fsPath.basename(this.path);
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
    mockUtils.getFile = function() {
      var args = Array.prototype.slice.call(arguments);
      filePath = fsPath.join.apply(fsPath, args);
      return new GetFile(filePath);
    };

    mockUtils.createZip = function(zipPath) {
      zipFilePath = zipPath;
      return {};
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
          buildDirectoryFilePath: 'testBuildDirectoryFile',
          profileDirectoryFilePath: 'testTargetDir/testDomain',
          domain: 'testDomain'
        },
        targetDir: mockUtils.getFile('testTargetDir')
      };
      webappZip = new app.WebappZip();
    });

    test('setOptions', function() {
      webappZip.setOptions(mockOptions);
      assert.equal(zipFilePath, 'testTargetDir/testDomain/application.zip');
    });

    test('getCompression', function() {
      var pathInZip = 'pathInZip';
      webappZip.options = {
        webapp: {
          metaData: {
            external: false,
            zip: {}
          }
        }
      };
      webappZip.options.webapp.metaData.zip.mmap_files = [pathInZip];
      assert.equal(webappZip.getCompression(pathInZip), 'none');

      // we don't compress jpg file.
      pathInZip = 'pathInZip.jpg';
      delete webappZip.options.webapp.metaData;
      assert.equal(webappZip.getCompression(pathInZip), 'none');

      pathInZip = 'pathInZip.png';
      assert.equal(webappZip.getCompression(pathInZip), 'best');
    });

    test('isExcludedFromZip', function() {
      var file = mockUtils.getFile('locales');
      isFile = true;
      fileExists = true;
      webappZip.options = {
        GAIA_CONCAT_LOCALES: '1',
        webapp: {
          sourceDirectoryName: 'testSourceDirectory'
        }
      };
      webappZip.options.webapp.buildDirectoryFilePath = 'test';
      assert.equal(webappZip.isExcludedFromZip(file), true,
        'Ignore l10n files if they have been inlined or concatenated');

      file = mockUtils.getFile('locales-obj');
      webappZip.options.GAIA_CONCAT_LOCALES = '0';
      assert.equal(webappZip.isExcludedFromZip(file), true,
        'Ignore l10n files if they have been inlined or concatenated');

      file = mockUtils.getFile('testapppath/test');
      webappZip.options.webapp.buildDirectoryFilePath = 'testapppath';
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
      mockUtils.addFileToZip = function(zip, pathInZip, file, compression) {
        testResult = {
          zip: zip,
          pathInZip: pathInZip,
          file: file,
          compression: compression
        };
      };
      webappZip = new app.WebappZip();
      webappZip.options = {
        GAIA_DEFAULT_LOCALE: 'en-US-test',
        webapp: {
          buildDirectoryFilePath: 'testBuildDir'
        }
      };
      webappZip.isExcludedFromZip = function() {
        return isExcludedFromZip;
      };
      webappZip.getCompression = function() {
        return '1';
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
      isFile = true;
      fileExists = true;
      webappZip.addToZip(testFile);
      assert.equal(testResult.pathInZip, 'testFile.html');
      assert.equal(testResult.file.path,
        'testBuildDir/testFile.html.en-US-test');
    });
  });
});
