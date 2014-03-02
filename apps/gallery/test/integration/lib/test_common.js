var fs = require('fs'),
    path = require('path');

var mediaDir, client;
/**
* @fileoverview Contains some useful functions for preparing the test suit.
Most notably copies the test media to the media directory.
*/
 var TestCommon = {

  // Cache the location of the diretory that contains the media files
  mediaDir: null,

  /**
  * Find the media directoy and copies a single test file to it
  * in prepartion to run the test suite.
  */
  prepareTestSuite: function(mediaType, _client) {

    client = _client;
    // Using the following prefs mounts a temp diretory as deviceStorage:
    // 'device.storage.enabled': true,
    // 'device.storage.testing': true,
    // 'device.storage.prompt.testing':true
    // See moz-central/dom/devicestorage/nsDeviceStorage.cpp for details.
    if (!mediaDir)
      mediaDir = getMediaDir(mediaType);

    setup(mediaType, mediaDir);
  }
};
module.exports = TestCommon;

/**
* Empties the media directory and copies a new test media file to it.
* @param {String} mediaType Pictures/Videos/Music.
* @param {mediaDir} mediaDir The path to the temporary director for
* media files.
*/
function setup(mediaType, mediaDir) {
  files = fs.readdirSync(mediaDir);

  // Delete all other files and copy our test file.
  for (var i = 0; i < files.length; i++)
    deleteFile(files[i]);

  copyTestMedia(mediaType);
}

/**
* Deletes a single file.
* @param {file} file File to be deleted.
*/
function deleteFile(file) {
  var a = fs.unlinkSync(path.join(mediaDir, file));
}

/**
* Copies the test media file to the media directory.
* @param {String} mediaType Pictures/Videos/Music.
*/
function copyTestMedia(mediaType) {
  switch (mediaType) {
    case 'videos':
      copyTestVideo();
      break;
    case 'pictures':
      copyTestPicture();
      break;
    case 'music':
    default:
      break;
  }
}

/**
 * Copies the test picture to the media directory.
 */
function copyTestPicture() {
  // Image credit:
  // www.mozilla.org/en-US/styleguide/identity/firefoxos/branding/
  var sourceFile =
  path.resolve('test_media/Pictures/firefoxOS.png');
  var destinationFile = path.join(mediaDir, 'firefoxOS.png');
  copyFile(sourceFile, destinationFile);
}

/**
* Copies the test video to the media directory.
*/
function copyTestVideo() {
  var sourceFile =
  path.resolve('test_media/Movies/elephants-dream.webm');
  var destinationFile = path.join(mediaDir, 'elephants-dream.webm');
  copyFile(sourceFile, destinationFile);
}

/**
* Synchronous file copying.
* @param {String} source Path to source file.
* @param {String} target Path for the new file (copy).
*/
function copyFile(source, target) {

  var BUF_LENGTH = 64 * 1024;
  var buff = new Buffer(BUF_LENGTH);
  var fdr = fs.openSync(source, 'r');
  var fdw = fs.openSync(target, 'w');
  var bytesRead = 1;
  var pos = 0;
  while (bytesRead > 0) {
    bytesRead = fs.readSync(fdr, buff, 0, BUF_LENGTH, pos);
    fs.writeSync(fdw, buff, 0, bytesRead);
    pos += bytesRead;
  }
  fs.closeSync(fdr);
  fs.closeSync(fdw);
}

/**
* Determines the directory that is used to look for media files.
* The function guarantees that the media path actually exists.
* @param {String} mediaType Pictures/Videos/Music.
* @param {Marionette.Client} client Marionette client in the Chrome context.
*/
function getMediaDir(mediaType, client) {
  deviceStorageDir = getDeviceStorageDirectory(client);
  createDir(deviceStorageDir);

  var mediaDir;
  switch (mediaType) {
    case 'pictures':
    case 'videos':
    case 'music':
      mediaDir = path.join(deviceStorageDir, mediaType);
      break;
    default:
      mediaDir = deviceStorageDir;
      break;
  }

  createDir(mediaDir);
  return mediaDir;
}

/**
* Determines the device storage directory.
* @return {String} path to device storage directory
*/
function getDeviceStorageDirectory(client) {
  var tmpDir = getTemporaryDirectory(client);
  return path.join(tmpDir, 'device-storage-testing');
}

/**
* Checks if a directory exists and creates it in case it doesn't.
* @param {String} path Path to the directory the needs checking/creating.
*/
function createDir(path) {
  if (!fs.existsSync(path))
    fs.mkdirSync(path);
}

/**
* Determines the temporary directory that is created by FF because of the prefs.
* @return {String} path to temporary directory
*/
function getTemporaryDirectory() {
  var chrome = client.scope({context: 'chrome'});

  var tmpDir = chrome.executeScript(function() {
      var directoryService =
  Components.classes['@mozilla.org/file/directory_service;1']
  .getService(Ci.nsIProperties);
      var f = directoryService.get('TmpD', Ci.nsIFile);
      return f.path;
    });
  return tmpDir;
}
