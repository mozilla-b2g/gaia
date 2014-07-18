'use strict';

/* global suite, require, test, setup, teardown, __dirname */

suite('copy.js', function() {
var sep = require('path').sep,
    pathBuild = __dirname + sep + '..' + sep + '..' + sep,
    pathLib = pathBuild + sep + 'lib',
    pathTestLib = pathBuild + sep + 'test' + sep + 'lib',
    assert = require('chai').assert,
    proxyquire = require('proxyquire'),
    fe = require(pathTestLib + sep + 'fe' + sep + 'exports.js'),
    mockUtils = {
      fileExists: function(path) {
        return fe.instance.files[path] || fe.instance.directories[path];
      }
    },
    Copy = proxyquire.noCallThru().load(pathLib + sep + 'copy.js', {
      utils: mockUtils
    });

  setup(function() {
    var foobar = fe.instance().directory('/foo/bar');
    fe.instance().directory('/mozilla/b2g');
    fe.instance().file(foobar, 'charlie.json', {'delta': 3.14});
  });

  teardown(function() {
    fe.instance().destroy();
  });

  test('it should throw error when there\'re errors before we do copy',
  function() {
    var failNoSource = new Copy('/foo/bar/chai.js', '/mozilla/b2g'),
        failNoDestination = new Copy('/foo/bar/charlie.json', '/mozilla/b3g');

    assert.throws(failNoSource.assertExists);
    assert.throws(failNoDestination.assertExists);
  });
});

