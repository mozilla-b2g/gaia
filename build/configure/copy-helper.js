'use strict';

/**
 * CopyHelper
 */

var utils = require('../utils');

var CopyHelper = function(parentTarget, generator) {
  this.parentTarget = parentTarget;
  this.generator = generator;
};

CopyHelper.prototype = {

  copy: function(src, dest) {
    var srcFile = utils.getFile(src);

    if (srcFile.isFile()) {
      this.copyFile(src, dest);
    } else if (srcFile.isDirectory()) {
      this.copyDir(src, dest);
    }
  },

  copyFile: function(src, dest) {
    var cmd = '@mkdir -p ' + dest + '\n\t' + '@cp ' + src + ' $@';
    var fullDest = utils.joinPath(dest, utils.basename(src));

    this.generator.insertTask('', fullDest, [], [cmd]);
    this.generator.insertDep(fullDest, src);
    this.generator.insertDep(this.parentTarget, fullDest);
  },

  copyDir: function(src, dest) {
    var srcDir = utils.getFile(src);
    utils.ls(srcDir, true).forEach(function(file) {
      if (file.isFile()) {
        let relativeDest = utils.relativePath(src, file.path);
        relativeDest = utils.dirname(relativeDest);
        this.copyFile(file.path, utils.joinPath(dest, relativeDest));
      }
    }, this);
  }
};

module.exports = CopyHelper;
