var fs = require('fs'),
    path = require('path');

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
   * @param {callback} callback function.
   */
  prepareTestSuite: function(mediaType, client, callback) {

    // Using the following prefs mounts a temp diretory as deviceStorage:
    // 'device.storage.enabled': true,
    // 'device.storage.testing': true,
    // 'device.storage.prompt.testing':true
    // See moz-central/dom/devicestorage/nsDeviceStorage.cpp for details.
    if (this.mediaDir) {
      setup(mediaType, this.mediaDir, callback);
    } else {
      getMediaDir(mediaType, client, function(err, mediaDir) {
        checkError(err);
        this.mediaDir = mediaDir;
        setup(mediaType, this.mediaDir, callback);
      });
    }
  },

  copyFileSynch: function(source, target) {
    try {
      fs.mkdirSync('/tmp/device-storage-testing/videos');
      console.log('TestCommon: Synch copying from Source: ', source);
      console.log('TestCommon: Synch copying to Destination: ', target);
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
    } catch (e) {
      console.log('TestCommon: Exception occured in synch copying file: ', e);
    }
  }
};
module.exports = TestCommon;

/**
 * Empties the media directory and copies a new test media file to it.
 * @param {String} mediaType Pictures/Videos/Music.
 * @param {mediaDir} mediaDir The path to the temporary director for
 * media files.
 * @param {callback} callback function.
 */
function setup(mediaType, mediaDir, callback) {
  fs.readdir(mediaDir, function(err, files) {
    checkError(err);
    copyTestMedia(mediaType, callback);
  });
}

/**
 * Deletes a single file.
 * @param {file} file File to be deleted.
 * @param {callback} callback function.
 */
function deleteFile(file, callback) {
  err = fs.unlinkSync(path.join(mediaDir, file));
  if (err) {
    console.log('TestCommon: Exception occured while deleting file');
    callback(err);
    return;
  }
}

/**
 * Copies the test media file to the media directory.
 * @param {String} mediaType Pictures/Videos/Music.
 * @param {callback} callback function.
 */
function copyTestMedia(mediaType, callback) {
  switch (mediaType) {
    case 'videos':
      //Check for media video file if it exists
     mediaExists(path.join(mediaDir, 'elephants-dream.webm'), function(exists) {
       if (!exists) {
        copyTestVideo(callback);
       }
       else
        callback();
     });
      break;
    default:
      break;
  }
}

/**
 * Copies the test video to the media directory.
 * @param {callback} callback function.
 */
function copyTestVideo(callback) {
  var sourceFile =
  path.resolve('test_media/Movies/elephants-dream.webm');
  var destinationFile = path.join(mediaDir, 'elephants-dream.webm');
  copyFile(sourceFile, destinationFile, callback);
}


/**
 * Very simple file copying.
 * @param {String} source Path to source file.
 * @param {String} target Path for the new file (copy).
 * @param {callback} callback function.
 */
function copyFile(source, target, callback) {
  try {
    console.log('TestCommon : Video Source: ', source);
    console.log('TestCommon : Video Destination: ', target);

    var readStream = fs.createReadStream(source),
      writeStream = fs.createWriteStream(target);

    readStream.pipe(writeStream);
    readStream.once('end', callback);
  } catch (e) {
    console.log('TestCommon: Exception occured while copying file: ', e);
  }
}

 function mediaExists(path, callback)
 {
   fs.exists(path, function(exists) {
     console.log(exists ? 'TestCommon: media file is there' :
    'TestCommon: no media file exist');
     callback(exists);
   });
 }

/**
 * Determines the directory that is used to look for media files.
 * The function guarantees that the media path actually exists.
 * @param {String} mediaType Pictures/Videos/Music.
 * @param {Marionette.Client} client Marionette client in the Chrome context.
 * @param {callback} callback path to media directory for a specified type.
 */
function getMediaDir(mediaType, client, callback) {
  getTmpDir(client, function(err, tmpDir) {
    checkError(err, callback);

    var deviceStorageDir = path.join(tmpDir, 'device-storage-testing');
    createDir(deviceStorageDir, function(err) {
      checkError(err);

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

      createDir(mediaDir, function(err) {
        checkError(err);
        callback(null, mediaDir);
      });
    });
  });
}

/**
 * Checks if a directory exists and creates it in case it doesn't.
 * @param {String} path Path to the directory the needs checking/creating.
 * @param {callback} callback function.
 */
function createDir(path, callback) {
  fs.exists(path, function(exists) {
    if (!exists)
      fs.mkdirSync(path);
    callback();
  });
}

/**
 * Determines the temporary directory that is used to look for media files.
 * @param {Marionette.Client} client Marionette client in the Chrome context.
 * @param {callback} callback getMediaDir().
 */
function getTmpDir(client, callback) {
  var chrome = client.scope({context: 'chrome'});

  var tmpDir = chrome.executeScript(function() {
      var directoryService =
        Components.classes['@mozilla.org/file/directory_service;1']
        .getService(Ci.nsIProperties);
      var f = directoryService.get('TmpD', Ci.nsIFile);
      return f.path;
    });
  callback(null, tmpDir);
}

/**
 * Utility method to do error checking to comply with node.js style guidelines.
 * @param {err} err Error.
 * @param {callback} callback function.
 */
function checkError(err, callback) {
  if (err) {
    callback(err);
    return;
  }
}
