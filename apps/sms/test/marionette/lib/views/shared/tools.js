/* global module, require */
'use strict';

var assert = require('chai').assert;

var ASSETS_DIR = './apps/sms/test/marionette/assets/';

module.exports = {
  assertElementFocused: function(element, message) {
    assert.isTrue(
      element.scriptWith(function(el) {
        return document.activeElement === el;
      }),
      message
    );
  },

  /**
   * @param {String} assertName The file name, relative to the asset directory.
   * @returns {String} The file content in base64 form.
   */
  loadAsset: function(assetName) {
    var fileName = ASSETS_DIR + assetName;
    return require('fs').readFileSync(fileName, { encoding: 'base64' });
  }
};
