'use strict';
/* exported MockContacts */
/* exported COMMS_APP_ORIGIN */

var COMMS_APP_ORIGIN = location.origin;

var loadAsyncScriptsDeferred = {};
loadAsyncScriptsDeferred.promise = new Promise((resolve) => {
  loadAsyncScriptsDeferred.resolve = resolve;
});

var MockContacts = {
  isEmpty: function(prop) {
    return false;
  },
  loadFacebook: function(cb) {
    cb();
  },
  cardStateChanged: function() {
  },
  cancel: function() {},
  utility: function(view, callback, type) {
    callback();
  },
  view: function(view, callback) {
    callback();
  },
  goBack: function(cb) {
    if (typeof cb === 'function') {
      cb();
    }
  },
  setCurrent: function(ct) {

  },
  get asyncScriptsLoaded() {
    loadAsyncScriptsDeferred.resolve();
    return loadAsyncScriptsDeferred.promise;
  },
  showForm: function() {}
};
