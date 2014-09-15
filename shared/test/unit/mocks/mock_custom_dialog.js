/* exported MockCustomDialog */

'use strict';

var MockCustomDialog = {
  show: function(title, msg, cancel, confirm, element) {
    this.mShown = true;
    this.mShowedTitle = title;
    this.mShowedMsg = msg;
    this.mShowedCancel = cancel;
    this.mShowedConfirm = confirm;
    this.mShowedElement = element;
    this.mShowedScreen = document.createElement('form');

    return this.mShowedScreen;
  },

  hide: function() {
    this.mShown = false;
  },

  mShown: false,
  mShowedTitle: null,
  mShowedMsg: null,
  mShowedCancel: null,
  mShowedConfirm: null,
  mShowedElement: null,
  mShowedScreen: null,
  mTeardown: function teardown() {
    this.mShown = false;
    this.mShowedTitle = null;
    this.mShowedMsg = null;
    this.mShowedCancel = null;
    this.mShowedConfirm = null;
    this.mShowedElement = null;
    this.mShowedScreen = null;
  }
};
