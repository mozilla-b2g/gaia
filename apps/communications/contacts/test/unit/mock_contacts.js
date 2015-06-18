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
  hideOverlay: function() {
  },
  loadFacebook: function(cb) {
    cb();
  },
  cardStateChanged: function() {
  },
  checkCancelableActivity: function() {},
  cancel: function() {},
  utility: function(view, callback, type) {
    callback();
  },
  view: function(view, callback) {
    callback();
  },
  showOverlay: function(title, id) {
    return {
      'setClass': function(clazz) {},
      'setHeaderMsg': function(msg) {},
      'setTotal': function(total) {},
      'update': function() {}
    };
  },
  updateSelectCountTitle: function(count) {},
  goBack: function(cb) {
    if (typeof cb === 'function') {
      cb();
    }
  },
  setCurrent: function(ct) {

  },
  setCancelableHeader: function() {},
  get asyncScriptsLoaded() {
    loadAsyncScriptsDeferred.resolve();
    return loadAsyncScriptsDeferred.promise;
  }
};
