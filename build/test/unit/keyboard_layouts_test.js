'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire');
var mockUtils = require('./mock_utils.js');

suite('keyboard-layouts.js', function() {
  var app;
  var config = {
    KEYBOARD_LAYOUTS_PATH: 'test_keyboard_layouts.json'
  };

  var defaultManifestURL = 'app://keyboard.gaiamobile.org/manifest.webapp';
  var webappsMapping = {
    keyboard: {
      manifestURL: defaultManifestURL
    }
  };

  var result;

  suiteSetup(function() {
    app = proxyquire.noCallThru().load(
      '../../keyboard-layouts', {
      './utils': mockUtils
    });
    mockUtils.writeContent = function(file, content) {
      result = content;
    };

    mockUtils.resolve = function(fileName, dir) {
      return {
        exists: function() {
          return true;
        },
        path: dir + '/' + fileName
      };
    };

    mockUtils.getJSON = function() {
      return {
          'layout': {
            'en-US': [
              {'layoutId': 'en', 'app': ['apps', 'keyboard']}
            ],
            'zh-TW': [
              {'layoutId': 'zhuyin', 'app': ['apps', 'keyboard']},
              {'layoutId': 'en', 'app': ['apps', 'keyboard']}
            ],
            'es': [
              {'layoutId': 'es', 'app': ['apps', 'keyboard']}
            ]
          },
          'langIndependentLayouts':
            [{'layoutId': 'number', 'app': ['apps', 'keyboard']}]
          ,
          'fallbackLayouts':
            [{'layoutId': 'preload', 'app': ['apps', 'keyboard']}]
      };
    };

    mockUtils.getFileContent = function() {
      return '';
    };
  });

  test('Check the generated keyboard_layouts.json', function() {
    var preloadSet = ['en', 'zhuyin', 'es'];
    app.genDefaultLayouts(config, webappsMapping, preloadSet);

    var expectedResult = {
      'layout': {
        'en-US': [{'layoutId': 'en', 'appManifestURL': defaultManifestURL}],
        'zh-TW': [{'layoutId': 'zhuyin', 'appManifestURL': defaultManifestURL},
                 {'layoutId': 'en', 'appManifestURL': defaultManifestURL}],
        'es': [{'layoutId': 'es', 'appManifestURL': defaultManifestURL}],
      },
      'langIndependentLayouts':
        [{'layoutId': 'number', 'appManifestURL': defaultManifestURL}]
    };

    assert.equal(result, JSON.stringify(expectedResult, null, 2));
  });

  test('Check the generatedkeyboard_layouts.json with a minimal' +
       ' preloaded layout set', function() {

    var preloadSet = ['en'];
    app.genDefaultLayouts(config, webappsMapping, preloadSet);

    var expectedResult = {
      'layout': {
        'en-US': [{'layoutId': 'en', 'appManifestURL': defaultManifestURL}],
        'zh-TW': [{'layoutId': 'en', 'appManifestURL': defaultManifestURL}],
        'es': [{'layoutId': 'preload', 'appManifestURL': defaultManifestURL}]
      },
      'langIndependentLayouts':
        [{'layoutId': 'number', 'appManifestURL': defaultManifestURL}]
    };

    assert.equal(result, JSON.stringify(expectedResult, null, 2));
  });
});
