var fs = require('fs'),
    fsPath = require('path'),
    tmpdir = require('./tmpdir');

var Profiles = {
  /**
   * Attempts to find a gaia profile from a directory and then copies it to a
   * new directory.
   *
   * @param {String} path to runtime (/Applications/B2G.App).
   * @param {Function} callback [Error err, String path].
   */
  gaia: function(path, callback) {
    var gaiaProfile = require('./gaiaprofile');
    gaiaProfile(path, function(err, basePath) {
      if (err) return callback(err);
      this.baseProfile(basePath, callback);
    }.bind(this));
  },

  /**
   * Creates a new profile by copying an existing one.
   *
   * @param {String} path to copy profile from.
   * @param {Function} callback [Error err, String path].
   */
  baseProfile: function(path, callback) {
    var traverseDir = require('traverse-directory');
    this.tmp(function(err, target) {
      var traverse = traverseDir(path, target);

      traverse.file(function(source, target, next) {
        next(traverseDir.copyfile, source, target);
      });

      traverse.directory(function(source, target, next) {
        var leaf = source.replace(path, '');

        // the / here is really important otherwise we will end up symlinking
        // the entire webapps directory is not what we want.
        if (leaf.indexOf('webapps/') !== -1) {
          next(traverseDir.symlinkdir, source, target);
          return;
        }
        next(traverseDir.copydir, source, target);
      });

      traverse.run(function() {
        if (err) return callback(err);
        callback(null, target);
      });
    });
  },

  /**
   * Verifies profile exists and returns it or an error.
   *
   * @param {Function} callback [Error err, String path].
   */
  profile: function(path, callback) {
    fs.exists(path, function(pathExists) {
      if (pathExists) return callback(null, path);

      callback(new Error('invalid profile path: "' + path + '" is not found.'));
    });
  },

  /**
   * Creates a tmpdir for profile to reside in.
   *
   * @param {Function} callback [Error err, dir].
   */
  tmp: tmpdir
};

module.exports = Profiles;
