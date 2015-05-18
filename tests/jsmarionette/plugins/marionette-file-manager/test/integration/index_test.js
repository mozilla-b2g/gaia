'use strict';
var assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    testHelper = require('../lib/test_helper');

var TEST_FILES_PATH = '../test_files',
    TEXT_FILE_NAME = 'hello_world.json',
    IMAGE_FILE_NAME = 'fxos.png',
    PICTURES_TYPE = 'pictures',
    TEXT_TYPE = 'text',
    DS_FILE_PATH = path.join(TEXT_TYPE, TEXT_FILE_NAME),
    TEST_FILE_PATH = path.join(__dirname, TEST_FILES_PATH, TEXT_FILE_NAME);

marionette('MarionetteFileManager', function() {
  var deviceStoragePath = '';

  var client = marionette.client({
    prefs: {
      'device.storage.enabled': true,
      'device.storage.testing': true,
      'device.storage.prompt.testing': true
    }
  });
  marionette.plugin('fileManager', require('../../index'));

  setup(function() {
    deviceStoragePath =
      client.fileManager.deviceStorage.getDeviceStoragePath();

    client.fileManager.add({
      type: PICTURES_TYPE,
      filePath: path.join(__dirname, TEST_FILES_PATH, IMAGE_FILE_NAME)
    });
  });

  teardown(function() {
    testHelper.removeFile(deviceStoragePath);
  });

  suite('#add', function() {
    test('should get the file from device storage', function() {
      client.fileManager.add({
        type: TEXT_TYPE,
        filePath: path.join(__dirname, TEST_FILES_PATH, TEXT_FILE_NAME)
      });

      client.executeAsyncScript(
        getFileFromDeviceStorage,
        [DS_FILE_PATH],
        function(error, value) {
          var expectedContent = fs.readFileSync(TEST_FILE_PATH).toString();
          assert.deepEqual(value.file.toString(), expectedContent);
        }
      );
    });
  });

  suite('#remove', function() {
    test('should get the file from device storage', function() {
      client.fileManager.remove({
        type: PICTURES_TYPE,
        filename: IMAGE_FILE_NAME
      });

      client.executeAsyncScript(
        getFilesFromDeviceStorageByType,
        ['pictures'],
        function(error, value) {
          assert.ok(value.files.length === 0);
        }
      );
    });
  });

  suite('#removeAllFiles', function() {
    test('should show the "No photos or videos" message', function() {
      client.fileManager.add({
        type: PICTURES_TYPE,
        filePath: path.join(__dirname, TEST_FILES_PATH, IMAGE_FILE_NAME),
        filename: 'test_file.png'
      });
      client.fileManager.removeAllFiles();

      client.executeAsyncScript(
        getFilesFromDeviceStorageByType,
        ['pictures'],
        function(error, value) {
          assert.ok(value.files.length === 0);
        }
      );
    });

    test('could add file after do removeAllFiles', function() {
      client.fileManager.removeAllFiles();
      client.fileManager.add({
        type: TEXT_TYPE,
        filePath: path.join(__dirname, TEST_FILES_PATH, TEXT_FILE_NAME)
      });

      client.executeAsyncScript(
        getFileFromDeviceStorage,
        [DS_FILE_PATH],
        function(error, value) {
          var expectedContent = fs.readFileSync(TEST_FILE_PATH).toString();
          assert.deepEqual(value.file.toString(), expectedContent);
        }
      );
    });
  });

  function getFileFromDeviceStorage(filePath) {
    var sdcard = navigator.getDeviceStorage('sdcard'),
        request = sdcard.get(filePath);
    request.onsuccess = function() {
      var fileReader = new FileReader();
      fileReader.readAsText(this.result);

      fileReader.onloadend = function() {
        marionetteScriptFinished({ file: fileReader.result });
      };
    };
  }

  function getFilesFromDeviceStorageByType(type) {
    var storage = navigator.getDeviceStorage(type),
        request = storage.enumerate(),
        files = [];

    request.onsuccess = function() {
      var file = this.result;

      if (file) {
        files.push(file.name);
        this.continue();
      } else {
        marionetteScriptFinished({ files: files });
      }
    };
  }
});
