'use strict';
/* global MockNavigationStack */
/* global ConfirmDialog */
/* exported MockContacts */
/* exported COMMS_APP_ORIGIN */

var COMMS_APP_ORIGIN = location.origin;

var loadAsyncScriptsDeferred = {};
loadAsyncScriptsDeferred.promise = new Promise((resolve) => {
  loadAsyncScriptsDeferred.resolve = resolve;
});

var MockContacts = {
  getLength: function(prop) {
    return prop.length;
  },
  isEmpty: function(prop) {
    return false;
  },
  updatePhoto: function(photo, dest) {
    dest.setAttribute('backgroundImage', photo);
  },
  hideOverlay: function() {
  },
  loadFacebook: function(cb) {
    cb();
  },
  cardStateChanged: function() {
  },
  extServices: {
    importLive: function() {},
    importGmail: function() {}
  },
  navigation: new MockNavigationStack(),
  checkCancelableActivity: function() {},
  cancel: function() {},
  confirmDialog: function() {
    ConfirmDialog.show.apply(ConfirmDialog, arguments);
  },
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
  showStatus: function(status) {},
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
