/* global module, __dirname */
'use strict';

var fs = require('fs');

/**
 * MockManager is in charge of finding and injecting the mock files. They can be
 * located either at the app level in apps/$APP/test/marionette/mocks/ or at the
 * global level in shared/test/integration
 * @param {Marionette.Client} client Marionette client to use.
 * @param {String} app App folder to look into
 * @constructor
*/
function MockManager(client, app) {
  this.client = client;
  this.potentialDirs = [
    __dirname + '/../../../apps/' + app + '/test/marionette/mocks/',
    __dirname + '/' // points to shared/test/integration/
  ];
}

MockManager.prototype = {
  inject: function(mocks) {
    mocks = Array.isArray(mocks) ? mocks : [mocks];
    mocks.forEach(function(mockName) {
      this._injectSingle(mockName);
    }, this);
  },

  _injectSingle: function(mockName) {
    var fileName = 'mock_' + mockName + '.js';
    var filePath = this._findFilePath(fileName);
    this.client.contentScript.inject(filePath);
  },

  _findFilePath: function(fileName) {
    var filePath = null;
    var i = 0;
    while(!filePath && i < this.potentialDirs.length) {
      try {
        this._raiseErrorIfFileIsNotAccessible(this.potentialDirs[i] + fileName);
        filePath = this.potentialDirs[i] + fileName;
      } catch(e) {
        i++;
      }
    }

    if(!filePath) {
      throw new Error(fileName + ' was not found');
    }

    return filePath;
  },

  _raiseErrorIfFileIsNotAccessible: function(filePath) {
    fs.accessSync(filePath);
  }
};

module.exports = MockManager;
