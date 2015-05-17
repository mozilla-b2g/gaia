'use strict';
var fs = require('fs');
var path = require('path');

/**
 * The file manager for desktop client.
 *
 * @constructor
 * @param {DeviceStorageFactory.DeviceStorage} deviceStorage
 *        the implementation of the device storage.
 */
function DesktopClientFileManager(deviceStorage) {
  this.deviceStorage = deviceStorage;
}

DesktopClientFileManager.prototype = {
  // TODO: Support blob param.
  /**
   * Add files by specified type.
   * The param is structured as
   * { type: 'videos', filePath: 'path/to/file', filename: 'filename' }.
   * { type: 'videos', dirPath: 'path/to/folder' }.
   *
   * @param {Array|Object} file would like to add.
   */
  add: function(files) {
    var that = this;
    if (!Array.isArray(files)) {
      files = [files];
    }

    files.forEach(function(file) {
      var dirPath = file.dirPath;
      var type = file.type;
      if (file.filePath) {
        that._addFile(file);
      } else {
        fs.readdirSync(dirPath).forEach(function(filename) {
          that._addFile({
            type: type,
            filePath: path.join(dirPath, filename)
          });
        });
      }
    });
  },

  _addFile: function(file) {
    var filename = file.filename || path.basename(file.filePath);
    var targetPath = this.deviceStorage.getMediaFilePath(file.type);
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath);
    }
    this._copyFile(file.filePath, path.join(targetPath, filename));
  },

  /**
   * Remove files by specified type.
   * The param is structured as
   * { type: 'videos', filename: 'filename' }.
   *
   * @param {Array|Object} files would like to remove.
   */
  remove: function(files) {
    var filePaths;
    if (Array.isArray(files)) {
      filePaths = files;
    } else {
      filePaths = [files];
    }

    filePaths.forEach(function(file) {
      var filePath = this.deviceStorage.getMediaFilePath(file.type);
      fs.unlinkSync(path.join(filePath, file.filename));
      // Remove the directory if no file in it.
      if (fs.readdirSync(filePath).length === 0) {
        fs.rmdirSync(filePath);
      }
    }.bind(this));
  },

  /**
   * Remove all files and directories in device storage.
   */
  removeAllFiles: function() {
    var deviceStoragePath = this.deviceStorage.getDeviceStoragePath(),
        fileList = [];

    if (fs.existsSync(deviceStoragePath)) {
      fileList = fs.readdirSync(deviceStoragePath);
      fileList.forEach(function(item) {
        this._removeFile(path.join(deviceStoragePath, item));
      }.bind(this));
    }
  },

  /**
   * Remove a file or a directory even inclued files.
   *
   * @param {String} filePath a file path or directory path.
   */
  _removeFile: function(filePath) {
    var fileList = [],
        fileNumber = 0,
        dirname = '';

    if (fs.statSync(filePath).isDirectory()) {
      fileList = fs.readdirSync(filePath);
      fileNumber = fileList.length;

      if (fileNumber === 0) {
        fs.rmdirSync(filePath);
      }

      fileList.forEach(function(item) {
        this._removeFile(path.join(filePath, item));
      }.bind(this));
    } else {
      fs.unlinkSync(filePath);
      dirname = path.dirname(filePath);
      if (fs.readdirSync(dirname).length === 0) {
        fs.rmdirSync(dirname);
      }
    }
  },

  /**
   * Copy a single file to a specified path.
   *
   * @param {String} source the path of the source file.
   * @param {String} target the path you would like to copy to.
   */
  _copyFile: function(source, target) {
    var BUF_LENGTH = 64 * 1024,
        buffer = new Buffer(BUF_LENGTH),
        fdr = fs.openSync(source, 'r'),
        fdw = fs.openSync(target, 'w'),
        bytesRead = 1,
        position = 0;

    while (bytesRead > 0) {
      bytesRead = fs.readSync(fdr, buffer, 0, BUF_LENGTH, position);
      fs.writeSync(fdw, buffer, 0, bytesRead);
      position += bytesRead;
    }
    fs.closeSync(fdr);
    fs.closeSync(fdw);
  }
};

module.exports = DesktopClientFileManager;
