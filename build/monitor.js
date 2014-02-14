/*jslint node: true */
'use strict';

(function() {

  /**
   * Options:
   *    - directories: array of directory paths want to watch;
   *                   will overwrite the default ones.
   *
   * @param {string} gaiaPath - absolute path of the Gaia directory.
   * @param {object} options
   * @constructor
   */
  var Monitor = function(gaiaPath, options) {
    options = options || {};
    var dirs = options.directories ?
      options.directories : this.configs.directories;
    this.configs.directories = this.resolveDirectories(dirs);

    // To make the sep for regexp.
    var originalSep = require('path').sep,
        sep = originalSep === '\\' ? '\\\\' : originalSep;
    this.configs.sep = sep;
    this.configs.gaiaPath = gaiaPath;

    // For parsing file path.
    this.configs.parseRegExp = new RegExp('^(.*?)[' + sep +
      '](.*?)[' + sep + '].*$');
  };
  Monitor.prototype = {
    states: {
      making: false   // To prevent infinite making
                      // because of the new changes added by the make.
    },
    configs: {
      sep: '',        // To keep a sep of file path to construct regexp.
      gaiaPath: '',   // The absolute path of the Gaia directory.
      parseRegExp: null,
      directories: ['.']
    }
  };

  /**
   * Convert relative paths to absolute path.
   * If they're already absolute path, it's idempotent.
   *
   * @param {[string]} dirs - the array of directories
   * @this {Monitor}
   * @memberof Monitor
   */
  Monitor.prototype.resolveDirectories = function(dirs) {
    var path = require('path');
    return dirs.map(function(dpath) {
      return path.resolve(dpath);
    });
  };

  /**
   * Parse the path of changed file, and get its directory and appName.
   *
   * @param string - the path
   * @return {[string]} - [directory, appName]
   * @this {Monitor}
   * @memberof Monitor
   */
  Monitor.prototype.parsePath = function(filePath) {
    var sep = this.configs.sep,
        fpath = filePath.replace(this.configs.gaiaPath + sep, ''),
        matched = fpath.match(this.configs.parseRegExp).slice(1,3);
    if (null === matched) {
      throw new Error('Parsed invalid path: ' + filePath);
    }
    return matched;
  };

  /**
   * Invoke the make command to remake the changed parts.
   *
   * @param {string} appName - the app name
   * @this {Monitor}
   * @memberof Monitor
   */
  Monitor.prototype.invokeMake = function(appName) {
    if (this.states.making) {
      return;
    }
    this.states.making = true;
    process.env.APP = appName;
    var spawn = require('child_process').spawn,
        make  = spawn('make', [], {env: process.env});

    make.stdout.on('data', (function (data) {
      console.log(data.toString());
    }).bind(this));

    make.stderr.on('data', (function (data) {
      console.log(data.toString());
    }).bind(this));

    make.on('close', (function (code) {
      console.log('## Monitor make for "' + process.env.APP +
        '" was done with code "' + code + '"');
      this.states.making = false;
    }).bind(this));
  };

  /**
   * Ignore some file changes.
   * Expand this function to filter more changes.
   *
   * @this {Monitor}
   * @memberof Monitor
   */
  Monitor.prototype.ignoreFilter = function(path) {
    var result = this.localObjFilter(path) && true;
    return result;
  };

  /**
   * Because localization would cause file changes 'after'
   * the current make session ended, so it would cause infinite make.
   *
   * @return {boolean} - false if ignored.
   * @this {Monitor}
   * @memberof Monitor
   */
  Monitor.prototype.localObjFilter = function(path) {
      var regexp = new RegExp('locales-obj[ ' + this.configs.sep + ' ]'),
          isNotIgnored = null === path.match(regexp);
      return isNotIgnored;
    };

  /**
   * Watch the directories.
   *
   * @this {Monitor}
   * @memberof Monitor
   */
  Monitor.prototype.watch = function() {
    var watch = require('watch'),
        opts = {'filter': this.ignoreFilter.bind(this)},
        changeHandler = function(fpath) {
          // Because locale-objs were not been
          // created while we apply the filter.
          if (this.localObjFilter(fpath)) {
            this.invokeMake(this.parsePath(fpath)[1]);
          }
        };
    this.configs.directories.forEach((function(dirname) {
      watch.createMonitor(dirname, opts, (function (monitor) {
          monitor.on('created', changeHandler.bind(this));
          monitor.on('changed',  changeHandler.bind(this));
          monitor.on('removed',  changeHandler.bind(this));
        }).bind(this));
    }).bind(this));
  };
  exports.Monitor = Monitor;
})();
