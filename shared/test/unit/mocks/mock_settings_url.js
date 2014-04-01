'use strict';

function MockSettingsURL() {
  this._url = null;
  this._isBlob = false;
}

MockSettingsURL.prototype = {
  get: function msu_get() {
    return this._url;
  },

  set: function msu_set(value) {
    return this._url;
  },

  mTeardown: function msu_mTeardown() {
  }
};
