/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

'use strict';

/* exported MockasyncStorage */

var MockasyncStorage = {
    mItems: {},

    setItem: function(key, value, callback) {
      this.mItems[key] = value;
      if (typeof callback === 'function') {
        callback();
      }
    },

    getItem: function(key, callback) {
      var value = this.mItems[key];
      // use '|| null' will turn a 'false' to null
      if (value === undefined) {
        value = null;
      }
      if (typeof callback === 'function') {
        callback(value);
      }
    },

    removeItem: function(key, callback) {
      if (key in this.mItems) {
        delete this.mItems[key];
      }

      if (typeof callback === 'function') {
        callback();
      }
    },

    mTeardown: function() {
      this.mItems = {};
    }
};
