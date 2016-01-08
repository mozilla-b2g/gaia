/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

 'use strict';
/* exported MockLazyLoader */

// We need this until https://bugzilla.mozilla.org/show_bug.cgi?id=1181687 is
// fixed.

var MockLazyLoader = {
  load: function(fileArray, callback) {
    if (callback) {
      callback();
    } else {
      return Promise.resolve();
    }
  },

  getJSON: function(file) {
    return Promise.resolve({});
  }
};
