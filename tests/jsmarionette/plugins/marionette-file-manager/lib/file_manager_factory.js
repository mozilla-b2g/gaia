'use strict';
/**
 * Generate the file manager for each type of host.
 * Currently the type includes:
 * - DesktopClient
 * TODO: We could have one for device host.
 *       The type name could be called "Device".
 */
var FileManagerFactory = {
  /**
   * Generate a instance of file manager.
   *
   * @return {Object} instance of file manager.
   */
  generate: function(deviceStorage, type) {
    return FileManagerFactory[type](deviceStorage);
  }
};

/**
 * Generate the DesktopClient instance.
 *
 * @param {Object} deviceStorage desktop client deviceStorage.
 * @return {Object} instance of DesktopClientFileManager.
 */
FileManagerFactory.DesktopClient = function(deviceStorage) {
  var DesktopClient = require('./desktop_client_file_manager');
  return new DesktopClient(deviceStorage);
};

module.exports = FileManagerFactory;
