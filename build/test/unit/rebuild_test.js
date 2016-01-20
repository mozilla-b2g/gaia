'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire');
var mockUtils = require('./mock_utils.js');

suite('rebuild.js', function() {
  var rebuild;
  var appDirs = ['path/to/app1'];
  var files = [
    { path: 'path/to/app1/app1.js', lastModifiedTime: 1 },
    { path: 'path/to/app1/test/app1_test.js', lastModifiedTime: 2 },
    { path: 'path/to/app1/.jshintrc', lastModifiedTime: 3 },
    { path: '.gitignore', lastModifiedTime: 4 }
  ];
  var config = {
    'rebuildBlacklist': []
  };

  setup(function() {
    var stubs = {
      './utils': mockUtils,
      './config/build-config.json': config
    };
    rebuild = proxyquire.noCallThru().load('../../rebuild', stubs);

    mockUtils.getFile = function() {
      var path = Array.prototype.slice.call(arguments, 0).join('/');
      return {
        path: path,
        leafName: path.split('/').pop(),
        exists: function() { return true; },
        isDirectory: function() { return true; }
      };
    };

    mockUtils.ls = function() {
      return files;
    };

    mockUtils.relativePath = function(from, to) {
      return to.slice(from.length + 1);
    };

    mockUtils.getFileContent = function() {
      return '';
    };
  });

  test('getTimestamp', function() {
    var expected = {
      'path/to/app1': {
        'app1.js': 1,
        'test/app1_test.js': 2
      }
    };
    assert.deepEqual(expected, rebuild.getTimestamp(appDirs));
  });

  test('isFileWatched', function() {
    var expected = [
      { path: 'path/to/app1/app1.js', lastModifiedTime: 1 },
      { path: 'path/to/app1/test/app1_test.js', lastModifiedTime: 2 }
    ];
    assert.deepEqual(expected, files.filter(rebuild.isFileWatched));
  });

  test('dirChanged', function() {
    var prev = {
      'path/to/app1/file1': 1,
      'path/to/app1/file2': 2,
      'path/to/app1/file3': 3
    };
    var current = {
      'path/to/app1/file1': 5,
      'path/to/app1/file2': 2,
      'path/to/app1/file3': 3
    };
    assert.equal(false, rebuild.dirChanged(prev, prev, 'app1'));
    assert.equal(true, rebuild.dirChanged(prev, current, 'app1'));
  });
});
