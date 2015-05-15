'use strict';
var assert = require('assert'),
    fs = require('fs'),
    testHelper = require('../lib/test_helper'),
    DesktopClientDeviceStorage =
      require('../../lib/desktop_client_device_storage');

suite('DesktopClientDeviceStorage', function() {
  var subject;
  var client = marionette.client({
    prefs: {
      'device.storage.enabled': true,
      'device.storage.testing': true,
      'device.storage.prompt.testing': true
    }
  });

  setup(function() {
    subject = new DesktopClientDeviceStorage(client);
  });

  suite('#_getTemporaryPath', function() {
    test('should get temporary path', function() {
      var path = subject._getTemporaryPath();
      assert.ok(fs.existsSync(path));
    });
  });

  suite('#getDeviceStoragePath', function() {
    test('should get device storage path', function() {
      var path = subject.getDeviceStoragePath();
      assert.ok(fs.existsSync(path));
    });
  });

  suite('#getMediaFilePath', function() {
    var path;

    teardown(function() {
      testHelper.removeFile(path);
    });

    test('should get videos file path', function() {
      const PICTURES_TYPE = 'pictures';
      path = subject.getMediaFilePath(PICTURES_TYPE);
      assert.ok(path.indexOf(PICTURES_TYPE) !== -1);
      assert.ok(fs.existsSync(path));
    });
  });
});
