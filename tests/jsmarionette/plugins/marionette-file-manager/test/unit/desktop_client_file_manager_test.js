'use strict';
var DEVICE_STORAGE_PATH = __dirname + '/devicestorage',
    TEST_FILES_PATH = '../test_files',
    TEST_FILE_NAME = 'fxos.png',
    PICTURES_TYPE = 'pictures';
var assert = require('assert'),
    sinon = require('sinon'),
    fs = require('fs'),
    path = require('path'),
    testHelper = require('../lib/test_helper'),
    DeviceStorage =
      require('../../lib/desktop_client_device_storage'),
    FileManager =
      require('../../lib/desktop_client_file_manager'),
    subject = {};

suite('DesktopClientFileManager', function() {
  var deviceStorage = {};

  setup(function() {
    // Create the device storage.
    if (!fs.existsSync(DEVICE_STORAGE_PATH)) {
      fs.mkdirSync(DEVICE_STORAGE_PATH);
    }

    deviceStorage = new DeviceStorage({});
    sinon.stub(deviceStorage, 'getDeviceStoragePath', function() {
      return DEVICE_STORAGE_PATH;
    });
    sinon.stub(deviceStorage, 'getMediaFilePath', function(type) {
      return path.join(DEVICE_STORAGE_PATH, type);
    });

    subject = new FileManager(deviceStorage);
  });

  teardown(function() {
    deviceStorage.getDeviceStoragePath.restore();
    deviceStorage.getMediaFilePath.restore();
    if (fs.existsSync(DEVICE_STORAGE_PATH)) {
      fs.rmdirSync(DEVICE_STORAGE_PATH);
    }
  });

  suite('#add', function() {
    teardown(function() {
      testHelper.removeFile(path.join(DEVICE_STORAGE_PATH, PICTURES_TYPE));
    });

    test('should add a file in the pictures directory', function() {
      subject.add({
        type: PICTURES_TYPE,
        filePath: path.join(__dirname, TEST_FILES_PATH, TEST_FILE_NAME)
      });

      assert.ok(
        fs.existsSync(path.join(
          DEVICE_STORAGE_PATH, PICTURES_TYPE, TEST_FILE_NAME
        ))
      );
    });

    test('should add files in the pictures directory', function() {
      var TEST_FILE_1 = 'test_file_1.png',
          TEST_FILE_2 = 'test_file_2.png';
      var fileList = [];

      subject.add([
        {
          type: PICTURES_TYPE,
          filePath: path.join(__dirname, TEST_FILES_PATH, TEST_FILE_NAME),
          filename: TEST_FILE_1
        },
        {
          type: PICTURES_TYPE,
          filePath: path.join(__dirname, TEST_FILES_PATH, TEST_FILE_NAME),
          filename: TEST_FILE_2
        }
      ]);

      fileList = fs.readdirSync(deviceStorage.getMediaFilePath(PICTURES_TYPE));
      assert.ok(fileList.indexOf(TEST_FILE_1) !== -1);
      assert.ok(fileList.indexOf(TEST_FILE_2) !== -1);
    });

    test('should add all files of a directory ' +
         'in the pictures directory', function() {
      var fileList = [];
      subject.add({
        type: PICTURES_TYPE,
        dirPath: path.join(__dirname, TEST_FILES_PATH)
      });
      fileList = fs.readdirSync(deviceStorage.getMediaFilePath(PICTURES_TYPE));
      assert.ok(fileList.indexOf('fxos.png') !== -1);
      assert.ok(fileList.indexOf('hello_world.json') !== -1);
    });
  });

  suite('#remove', function() {
    setup(function() {
      subject.add({
        type: PICTURES_TYPE,
        filePath: path.join(__dirname, TEST_FILES_PATH, TEST_FILE_NAME)
      });
    });

    test('should remove a file in the videos directory', function() {
      subject.remove({
        type: PICTURES_TYPE,
        filename: TEST_FILE_NAME
      });

      assert.ok(!fs.existsSync(path.join(
        DEVICE_STORAGE_PATH, PICTURES_TYPE, TEST_FILE_NAME
      )));
    });
  });

  suite('#removeAllFiles', function() {
    test('should have device storage directory', function() {
      subject.removeAllFiles();
      assert.ok(fs.existsSync(DEVICE_STORAGE_PATH));
    });

    test('should work when no file in device storage', function() {
      subject.removeAllFiles();
      assert.ok(fs.readdirSync(DEVICE_STORAGE_PATH).length === 0);
    });

    test('should remove all files in device storage', function() {
      subject.add({
        type: PICTURES_TYPE,
        filePath: path.join(__dirname, TEST_FILES_PATH, TEST_FILE_NAME)
      });

      subject.removeAllFiles();
      assert.ok(fs.readdirSync(DEVICE_STORAGE_PATH).length === 0);
    });
  });
});
