'use strict';

var assert = require('chai').assert;
var path = require('path');
var proxyquire = require('proxyquire');
var mockUtils =
  require('./mock_utils.js');

suite('webapp-shared.js', function() {
  var app;
  var testapp;
  var fileExists;
  var isDirectory;
  var isHidden;
  var isFile;
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
        leafName: filePath,
        isDirectory: function() {
          return isDirectory;
        },
        isFile: function() {
          return isFile;
        },
        getRelativeDescriptor: function() {
          return filePath;
        }
      };
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
        'filterHTML, ',
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
      testapp.buildDirectoryFile = {
        parent: {
          path: 'testBuild'
        }
      };
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

      var locales = 'testlocales';
      webappShared.config.GAIA_INLINE_LOCALES = 'zh-TW';
      webappShared.pushFileByType('locales', locales + '.obj');
      assert.equal(webappShared.used.locales[0], locales,
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

    test('filterHTML', function() {
      var htmlResult = webappShared.filterHTML({
        isFile: function() {
          return true;
        },
        leafName: 'text.html'
      });
      assert.equal(htmlResult, true);
      var notHtmlResult = webappShared.filterHTML({
        isFile: function() {
          return true;
        },
        leafName: 'text.txt'
      });
      assert.equal(notHtmlResult, false);
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
        buildDirectoryFile: mockUtils.getFile('test')
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
      var result;
      webappShared.filterHTML = function(file) {
        return file.indexOf('.html') !== -1;
      };
      webappShared.filterSharedUsage = function(file) {
        result = file;
      };
      webappShared.customizeShared = function() {};

      webappShared.config = {
        BUILD_APP_NAME: 'testApp'
      };
      webappShared.webapp = {
        sourceDirectoryName: 'testApp2'
      };
      assert.equal(webappShared.copyShared(), undefined,
        'config.BUILD_APP_NAME isnot *, we only accept one webapp');

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
      var expected = 'testfile.html';
      var testfiles = [expected, 'testimg.png'];
      mockUtils.ls = function() {
        return testfiles;
      };
      webappShared.copyShared();
      assert.equal(result, expected,
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
      assert.equal(result[0].file.path, sharedFilePath);
      assert.equal(result[1].path, 'shared/locales/' + localePath + '.ini');
      assert.equal(result[1].file.path, sharedFilePath);
      assert.equal(result[2].path, lsContentFilePath);
    });

    test('pushResource', function() {
      var languagesPath = 'languages.json';
      webappShared.localesFile = 'testlocales';
      webappShared.pushResource(languagesPath);
      assert.equal(result[0].path, 'shared/resources/languages.json');
      assert.equal(result[0].file, webappShared.localesFile);

      result.length = 0;
      var brandingPath = 'brandingPath';
      lsFiles = [{leafName: brandingPath + '@2x.png'}];
      webappShared.gaia = {
        sharedFolder: mockUtils.getFile(brandingPath + '.png')
      };
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
        'elements/gaia_component/images/myimg.png',
        'elements/gaia_component/js/myfile.js'
      ];

      testFiles.forEach(function(testFile) {
        result.length = 0;
        webappShared.gaia = {
          sharedFolder: mockUtils.getFile(testFile)
        };
        webappShared.pushElements(elementFile);
        assert.equal(result[0].path, 'shared/elements/' + elementFile);
        assert.equal(result[1].path, 'shared/' + testFile);
      });
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
      webappShared.copyBuildingBlock(blockName, dirName);
      assert.equal(result[1].path, 'shared/' + dirName + '/' +
        blockName + '2.css');
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
