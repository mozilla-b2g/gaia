'use strict';

var assert = require('chai').assert;
var path = require('path');
var proxyquire = require('proxyquire');
var mockUtils = require('./mock_utils.js');

suite('webapp-shared.js', function() {
  var app;
  var testapp;
  var fileExists;
  var isDirectory;
  var isHidden;
  var isFile;
  var mRelativePath;
  setup(function() {
    app = proxyquire.noCallThru().load(
            '../../webapp-shared', {
              './utils': mockUtils
            });
    fileExists = true;
    isDirectory = false;
    isHidden = false;
    isFile = true;
    var getFile = function() {
      var filePath = path.join.apply(this, arguments);
      var leafName = filePath.split('/').pop();
      return {
        isHidden: function() {
          return isHidden;
        },
        clone: function() {
          return getFile(filePath);
        },

        append: function(subPath) {
          return getFile(filePath, subPath);
        },

        setFileExists: function(flag) {
          fileExists = flag || true;
        },

        exists: function() {
          return fileExists;
        },
        path: filePath,
        leafName: leafName,
        isDirectory: function() {
          return isDirectory;
        },
        isFile: function() {
          return isFile;
        }
      };
    };
    mockUtils.relativePath = function(path, subPath) {
      return mRelativePath || subPath;
    };

    mockUtils.joinPath = function() {
      var path = '';
      for (var i in arguments) {
        path += (arguments[i] + '/');
      }
      return path.slice(0, -1);
    };

    mockUtils.getFile = getFile;
    mockUtils.getFileContent = function(file) {
      return file;
    };

    mockUtils.getFileAsDataURI = function(file) {
      return file.path;
    };

    mockUtils.gaia = {
      getInstance: function(config) {
        return {
          webapps: [testapp]
        };
      }
    };
    var testBuildDirectoryFileUrl = 'testBuildDirectoryFileUrl';
    testapp = {
      buildDirectoryFileUrl: testBuildDirectoryFileUrl,
      domain: 'testDomain',
      buildDirectoryFile: mockUtils.getFile(testBuildDirectoryFileUrl),
      sourceDirectoryName: 'testSourceName'
    };
  });

  suite('setOptions, pushFileByType, filterSharedUsage, ' +
        'filterSharedCSSImport, filterFileByExtenstion, ',
    function() {
    var webappShared;
    setup(function() {
      webappShared = new app.WebappShared();

      mockUtils.resolve = function(file, baseLink) {
        var fileExist = true;
        return {
          exists: function() {
            return fileExist;
          },
          path: baseLink + '/' + file
        };
      };
    });

    test('setOptions', function () {
      testapp.buildDirectoryFilePath = 'testBuildDirectoryFileUrl';
      var options = {
        config: {
          GAIA_DISTRIBUTION_DIR: 'testDistributionDir',
          GAIA_DIR: 'testGaia',
          SETTINGS_PATH: 'testSettingsPath',
          LOCALES_FILE: 'testLocale'
        },
        gaia: 'gaia',
        webapp: testapp
      };
      webappShared.setOptions(options);
      assert.equal(webappShared.localesFile.path,
        options.config.GAIA_DIR + '/' + options.config.LOCALES_FILE);
      assert.equal(webappShared.buildDir.path,
        testapp.buildDirectoryFile.path);
    });

    test('pushFileByType', function () {
      webappShared.used = {
        js: [],
        resources: [],
        styles: [],
        unstable_styles: [],
        locales: []
      };
      webappShared.config = {};
      webappShared.pushJS = function() {};
      webappShared.pushResource = function() {};
      webappShared.copyBuildingBlock = function() {};
      webappShared.pushLocale = function() {};

      var testjs = 'testjs';
      webappShared.pushFileByType('js', testjs);
      assert.equal(webappShared.used.js[0], testjs, 'push testjs');

      webappShared.pushFileByType('js', testjs);
      assert.equal(webappShared.used.js[1], undefined, 'push testjs again');

      var resources = 'testResources';
      webappShared.pushFileByType('resources', resources);
      assert.equal(webappShared.used.resources[0], resources,
        'push resources');

      var style = 'teststyle';
      webappShared.pushFileByType('style', style + '.css');
      assert.equal(webappShared.used.styles[0], style,
        'push style');

      var unstable_styles = 'teststyle_unstable';
      webappShared.pushFileByType('style_unstable', unstable_styles + '.css');
      assert.equal(webappShared.used.unstable_styles[0], unstable_styles,
        'push unstable_styles');

      var localeName = 'date';
      webappShared.pushFileByType('locales',
        localeName + '/date.{locale}.properties');
      assert.equal(webappShared.used.locales[0], localeName,
        'push locales');
    });

    test('filterSharedUsage', function() {
      var csslink = 'link.css';
      var jslink = 'link.js';
      var content =
        'test \n <link rel="stylesheet" type="text/css" href="shared/style/' +
        csslink + '"> \n <script defer src="/shared/js/' +
        jslink + '"></script> testttt \n';
      var result = [];
      webappShared.pushFileByType = function(kind, path) {
        result.push({kind: kind, path: path});
      };
      webappShared.filterSharedUsage(content);
      assert.deepEqual(result, [
        {kind: 'style', path: csslink} ,
        {kind: 'js', path: jslink}]);
    });

    test('filterSharedCSSImport', function() {
      var csslink = 'test.css';
      var content = '@import "shared/style/' + csslink + '";\n';
      var result = [];
      webappShared.pushFileByType = function(kind, path) {
        result.push({kind: kind, path: path});
      };
      webappShared.filterSharedCSSImport(content);
      assert.deepEqual(result, [
        {kind: 'style', path: csslink}
      ]);
    });

    test('filterFileByExtenstion', function() {
      var htmlResult = webappShared.filterFileByExtenstion(
        'html', {
          isFile: function() {
            return true;
          },
          leafName: 'text.html'
        });
      assert.equal(htmlResult, true);
      var cssResult = webappShared.filterFileByExtenstion(
        'css', {
          isFile: function() {
            return true;
          },
          leafName: 'text.css'
        });
      assert.equal(cssResult, true);
      var failResult = webappShared.filterFileByExtenstion(
        'txt', {
          isFile: function() {
            return true;
          },
          leafName: 'text.js'
        });
      assert.equal(failResult, false);
    });

    teardown(function() {
      fileExists = true;
      webappShared = null;
    });
  });

  suite('customizeShared, copyShared, execute',
    function() {
    var webappShared;
    setup(function() {
      webappShared = new app.WebappShared();
    });

    test('customizeShared', function() {
      var result = [];
      var gaia_shared = {
        'js': ['test1.js'],
        'style': ['test2.css']
      };

      mockUtils.getFileContent = function() {
        return JSON.stringify(gaia_shared);
      };
      webappShared.webapp = {
        buildDirectoryFilePath: 'test'
      };
      webappShared.pushFileByType = function(kind, path) {
        result.push({kind: kind, path: path});
      };
      webappShared.customizeShared();
      assert.deepEqual(result, [
        {kind: 'js', path: gaia_shared.js[0]},
        {kind: 'style', path: gaia_shared.style[0]}
      ]);
    });

    test('copyShared', function() {
      var result = [];

      webappShared.filterFileByExtenstion = function(type, file) {
        return file.indexOf(type) !== -1;
      };
      webappShared.filterSharedUsage = function(file) {
        result.push(file);
      };
      webappShared.filterSharedCSSImport = function(file) {
        result.push(file);
      };
      webappShared.customizeShared = function() {};

      webappShared.config = {
        BUILD_APP_NAME: 'testApp'
      };
      webappShared.webapp = {
        sourceDirectoryName: 'testApp2',
        sourceDirectoryFilePath: 'test'
      };
      assert.equal(webappShared.copyShared(), undefined,
        'config.BUILD_APP_NAME is\'nt *, we only accept one webapp');

      webappShared.webapp.sourceDirectoryName =
        webappShared.config.BUILD_APP_NAME;
      mockUtils.isExternalApp = function() {
        return true;
      };
      assert.equal(webappShared.copyShared(), undefined,
        'external app');

      mockUtils.isExternalApp = function() {
        return false;
      };
      var expected = ['testfile.html', 'teststyle.css'];
      var testfiles = ['testfile.html', 'teststyle.css', 'testimg.png'];
      mockUtils.ls = function() {
        return testfiles;
      };
      webappShared.copyShared();
      assert.deepEqual(result, expected,
        'external app');
    });

    test('execute', function() {
      webappShared.setOptions = function(){};
      webappShared.copyShared = function(){};
      webappShared.execute();
    });
    teardown(function() {
      delete mockUtils.ls;
      delete mockUtils.isExternalApp;
      delete mockUtils.getFileContent;
      delete mockUtils.copyDirTo;
      delete mockUtils.copyFileTo;
    });
  });

  suite('pushLocale, pushResource, pushJS and copyBuildingBlock', function() {
    var webappShared;
    var result = [];
    var lsFiles;
    var sharedFilePath;
    setup(function() {
      webappShared = new app.WebappShared();
      sharedFilePath = 'testshared';
      webappShared.config = {
        GAIA_DIR: 'GAIA_DIR'
      };
      webappShared.gaia = {
        sharedFolder: mockUtils.getFile(sharedFilePath)
      };
      webappShared.moveToBuildDir = function(file, targetPath) {
        result.push({file: file, path: targetPath});
      };
      mockUtils.ls = function() {
        return lsFiles;
      };
    });

    test('pushLocale', function() {
      var localePath = 'testlocale';
      var lsContentFilePath = 'testfile';

      lsFiles = [
        {path: webappShared.config.GAIA_DIR + '/' + lsContentFilePath}
      ];
      webappShared.pushLocale(localePath);
      assert.equal(result[0].path, 'shared/locales/' + localePath);
      assert.equal(result[0].file.path, sharedFilePath + '/locales/' +
        localePath);
      assert.equal(result[1].path, lsContentFilePath);
    });

    test('pushResource', function() {
      var languagesPath = 'languages.json';
      webappShared.localesFile = 'testlocales';
      webappShared.pushResource(languagesPath);
      assert.equal(result[0].path, 'shared/resources/languages.json');
      assert.equal(result[0].file, webappShared.localesFile);

      result.length = 0;
      var brandingPath = 'brandingPath';
      lsFiles = [{
        leafName: brandingPath + '@2x.png',
        path: 'shared/resources/' + brandingPath +
        '@2x.png'
      }];
      webappShared.pushResource(brandingPath  + '.png');
      assert.equal(result[0].path, 'shared/resources/' + brandingPath +
        '@2x.png');

      result.length = 0;
      isDirectory = true;
      var sharedFilePath = 'testgaia/apps';
      var relativePath = '/testRelative';
      lsFiles = [{path: sharedFilePath + relativePath}];
      webappShared.gaia = {
        sharedFolder: mockUtils.getFile(sharedFilePath)
      };
      webappShared.pushResource(sharedFilePath + relativePath);
      assert.equal(result[0].path, 'shared' + relativePath);

      result.length = 0;
      isDirectory = false;
      webappShared.gaia.distributionDir = 'testdistributionDir';
      webappShared.pushResource('media/ringtones/');
      assert.equal(result[0].path, 'ringtones');
    });

    test('pushJS', function() {
      var jsFile = 'testjs.js';
      webappShared.gaia = {
        sharedFolder: mockUtils.getFile(jsFile)
      };
      webappShared.pushJS(jsFile);
      assert.equal(result[0].path, 'shared/js/' + jsFile);
    });

    test('pushElements', function() {
      var elementFile = 'testelemnt.html';
      webappShared.gaia = {
        sharedFolder: mockUtils.getFile(elementFile)
      };
      webappShared.pushElements(elementFile);
      assert.equal(result[0].path, 'shared/elements/' + elementFile);
      assert.equal(result.length, 1);

      // Test for various supported installs of component files
      // Note: this test isn't as real as I would like it to be as the exists()
      // function is stubbed always.
      elementFile = 'gaia_component/script.js';
      var testFiles = [
        'elements/gaia_component/style.css',
        'elements/gaia_component/css',
        'elements/gaia_component/js',
        'elements/gaia_component/images'
      ];

        result.length = 0;
        webappShared.gaia = {
          sharedFolder: mockUtils.getFile('')
        };
        webappShared.pushElements(elementFile);
        assert.equal(result[0].path, 'shared/elements/' + elementFile);
        assert.equal(result[1].path, 'shared/' + testFiles[0]);
        assert.equal(result[2].path, 'shared/' + testFiles[1]);
        assert.equal(result[3].path, 'shared/' + testFiles[2]);
        assert.equal(result[4].path, 'shared/' + testFiles[3]);
    });

    test('copyBuildingBlock', function() {
      var blockName = 'stable_test';
      var dirName = 'test_dir';
      lsFiles = [];
      webappShared.copyBuildingBlock(blockName, dirName);
      assert.equal(result[0].path, 'shared/' + dirName + '/' +
        blockName + '.css');

      result.length = 0;
      lsFiles = [
        {
          getRelativeDescriptor: function() {
            return blockName + '2.css';
          },
          isDirectory: function() {
            return false;
          }
        }
      ];
      mRelativePath = blockName + '2.css';
      webappShared.copyBuildingBlock(blockName, dirName);
      assert.equal(result[1].path, 'shared/' + dirName + '/' +
        blockName + '2.css');
      mRelativePath = null;
    });

    test('copySharedPage', function() {
      var path = 'import/test_page.html';
      webappShared.copyPage(path);
      assert.equal(result[0].path, 'shared/pages' + '/' + path);
    });

    teardown(function() {
      lsFiles.length = 0;
      result.length = 0;
      delete mockUtils.ls;
    });
  });
});
