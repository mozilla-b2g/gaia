const TESTING_DIRECTORY = 'device-storage-testing';
var path = require('path'),
    fs = require('fs');

/**
 * Device storage helper.
 *
 * Currently the type includes:
 * - DesktopClient
 * TODO: We could have one for device host.
 *       The type name could be called "Device".
 *
 * @constructor
 * @param {Object} client Marionette client to use.
 */
function DesktopClientDeviceStorage(client) {
  this.client = client;
}

DesktopClientDeviceStorage.prototype = {
  /**
   * Get the path to the directory contain the specified type of files.
   * If the the specificed type directory is not existed yet,
   * the function will create it.
   *
   * @param {String} type the media type, like "pictures", "music", or "videos".
   * @return {String} path to the directory of the specified type files.
   */
  getMediaFilePath: function(type) {
    var filePath;
    filePath = path.join(this.getDeviceStoragePath(), type);
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(filePath);
    }
    return filePath;
  },

  /**
   * Get device storage path.
   * The device-storage-testing directory is also created by FF.
   *
   * @return {String} path to device storage directory.
   */
  getDeviceStoragePath: function() {
    return path.join(this._getTemporaryPath(), TESTING_DIRECTORY);
  },

  /**
   * Determines the temporary directory that
   * is created by FF because of the prefs.
   *
   * @return {String} path to temporary directory.
   */
  _getTemporaryPath: function() {
    var chrome = this.client.scope({ context: 'chrome' }),
        tmpDir;

    tmpDir = chrome.executeScript(function() {
      var directoryService =
            Components.classes['@mozilla.org/file/directory_service;1'].
            getService(Ci.nsIProperties);
      return directoryService.get('TmpD', Ci.nsIFile).path;
    });

    return tmpDir;
  }
};

module.exports = DesktopClientDeviceStorage;
