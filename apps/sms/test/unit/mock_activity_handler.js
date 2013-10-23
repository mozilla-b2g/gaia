/*exported MockActivityHandler */
'use strict';

var MockActivityHandler = {
  currentActivity: { new: null },

  init: function() {},
  global: function() {},
  resetActivity: function() {},
  handleMessageNotification: function() {},
  displayUnsentConfirmation: function() {},
  launchComposer: function() {},
  triggerNewMessage: function() {},
  toView: function() {},
  onSmsReceived: function() {},
  onNotification: function() {},
  mTeardown: function mah_mTeardown() {
    this.currentActivity = { new: null };
  }
};
