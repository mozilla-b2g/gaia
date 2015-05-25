'use strict';
var fs = require('fs'),
    path = require('path');

var TestHelper = {
  /**
   * Remove a file or a directory even inclued files.
   *
   * @param {String} filePath a file path or directory path.
   */
  removeFile: function(filePath) {
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
        TestHelper.removeFile(filePath + '/' + item);
      });
    } else {
      fs.unlinkSync(filePath);
      dirname = path.dirname(filePath);
      if (fs.readdirSync(dirname).length === 0) {
        fs.rmdirSync(dirname);
      }
    }
  }
};

module.exports = TestHelper;
