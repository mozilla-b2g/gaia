'use strict';
/* exported MockHeaderUI */

/* globals ActivityHandler, MainNavigation */

var MockHeaderUI = {
  _lastCustomHeaderCallback: null,

  init: function() {},

  setupActionableHeader: function() {},

  setCancelableHeader: function(cb, titleId) {},

  setNormalHeader: function() {},

  setupCancelableHeader: function(alternativeTitle) {},

  handleCancel: function() {
    //If in an activity, cancel it
    if (ActivityHandler.currentlyHandling) {
      ActivityHandler.postCancel();
      MainNavigation.home();
    } else {
      MainNavigation.back();
    }
  },

  updateSelectCountTitle: function(count) {},

  hideAddButton: function() {},

  updateHeader: function() {}
};
