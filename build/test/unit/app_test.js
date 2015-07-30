'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire');
var mockUtils = require('./mock_utils.js');

suite('app.js', function() {
  var app;
  var files = [];
  var copied = false;
  var existed = false;
  var stageDir = '/path/to/build_stage';
  var applist = ['app1', 'app2', 'app3'];
  var options = {
    rebuildAppDirs: ['/path/to/app1', '/path/to/app2', '/path/to/app3'],
    STAGE_DIR: stageDir
  };

  setup(function() {
    mockUtils.getFile = function() {
      var path = Array.prototype.slice.call(arguments, 0).join('/');
      var file = {
        path: path,
        leafName: path.split('/').pop(),
        exists: function() { return existed; }
      };
      files.push(file);
      return file;
    };

    mockUtils.copyToStage = function() {
      copied = true;
    };

    mockUtils.ensureFolderExists = function() {
      return true;
    };

    mockUtils.NodeHelper = function() {
      this.require = require;
    };

    var stubs = {
      'utils': mockUtils,
      'rebuild': {},
      './post-app': { execute: function() {} }
    };
    app = proxyquire.noCallThru().load('../../app', stubs);
  });

  test('BUILD_APP_NAME = *', function() {
    options.BUILD_APP_NAME = '*';
    app.buildApps(options);

    applist.forEach(function(appName, i) {
      var baseIdx = i * applist.length;
      assert.equal(files[baseIdx].path, '/path/to/' + appName,
        '1st file which access in app.js should be app absolute dir');
      assert.equal(files[baseIdx + 1].path, stageDir + '/' + appName,
        '2nd file which access in app.js should be app dir in build_stage');
      assert.equal(files[baseIdx + 2].path,
        '/path/to/' + appName + '/build/build.js',
        '3rd file which access in app.js should be build script in app dir');
    });
  });

  test('BUILD_APP_NAME = app1', function() {
    var appName = 'app1';
    options.BUILD_APP_NAME = appName;
    app.buildApps(options);
    assert.equal(files[0].path, '/path/to/' + appName,
      '1st file which access in app.js should be app absolute dir');
    assert.equal(files[1].path, stageDir + '/' + appName,
      '2nd file which access in app.js should be app dir in build_stage');
    assert.equal(files[2].path,
      '/path/to/' + appName + '/build/build.js',
      '3rd file which access in app.js should be build script in app dir');
  });

  teardown(function() {
    files = [];
  });
});
