'use strict';

/**
 * BuildConfig would generate all necessary data for each build backend.
 * Currently it would refer to gaia/build-config.in and customize it by each
 * app's requirement and generate a new build-config.in to each app's stage
 * folder.
 *
 * @param {string} outputFilePath - The destination for the output file.
 * @param {string} defaultConfigFilePath - The reference to generate new config
 *                                         file.
 * @constructor
 */
var BuildConfig = function() {
  this.config = {};
};

BuildConfig.prototype = {
  /**
   * Insert new config data.
   * @param {string} key - key of new config data.
   * @param {string|object} value - value of new config data.
   */
  addConfig: function(key, value) {
    if (!value) {
      return;
    }
    if (typeof value === 'object') {
      try {
        value = JSON.stringify(value).replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"');
      } catch(e) {
        throw 'value of ' + key + ' cannot be JSON.stringified sucessfully';
      }
    }
    this.config[key] = value;
  },

  /**
   * Write new config data to defaultConfigFilePath.
   * @param {string} type - the type of build backend.
   */
  getOutput: function(type) {
    switch(type) {
      case 'makefile':
        return this.outputMakefile();
    }
  },

  /**
   * Generate buildConfig data for Makefile.
   */
  outputMakefile: function() {
    var result = '';
    for (var key in this.config) {
      result += (key + '=' + this.config[key] + '\n');
    }
    return result;
  }
};

module.exports = BuildConfig;
