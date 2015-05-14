'use strict';
var fileManagerFactory = require('./lib/file_manager_factory'),
    deviceStorageFactory = require('./lib/device_storage_factory');

/**
 * A marionette plugin for managing(add, remove) files in device storage.
 * The options param is structured as { tpye: 'DesktopClient' }.
 *
 * @constructor
 * @param {Marionette.Client} client marionette client to use.
 * @param {Object} options setup the file manager.
 */
function MarionetteFileManager(client, options) {
  var type = '';

  this.client = client;
  this.options = options || { type: 'DesktopClient' };
  type = this.options.type || 'DesktopClient';

  this.deviceStorage = deviceStorageFactory.generate(client, type);
  this.fileManager = fileManagerFactory.generate(this.deviceStorage, type);
}

MarionetteFileManager.prototype = {
  /**
   * Add files.
   *
   * @param {String|Array} files the path of files.
   */
  add: function(files) {
    this.fileManager.add(files);
  },

  /**
   * Remove files.
   *
   * @param {String|Array} files the path of files.
   */
  remove: function(files) {
    this.fileManager.remove(files);
  },

  /**
   * Clean all files in device storage.
   */
  removeAllFiles: function() {
    this.fileManager.removeAllFiles();
  }
};

MarionetteFileManager.setup = function(client, options) {
  return new MarionetteFileManager(client, options);
};

module.exports = MarionetteFileManager;
