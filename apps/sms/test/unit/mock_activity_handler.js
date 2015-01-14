/*exported MockActivityHandler */
'use strict';

var MockActivityHandler = {
  init: function() {},
  isInActivity: function() {},
  leaveActivity: function() {},
  handleMessageNotification: () => Promise.resolve(),
  displayUnsentConfirmation: function() {},
  launchComposer: function() {},
  triggerNewMessage: function() {},
  toView: () => Promise.resolve(),
  onSmsReceived: function() {},
  onNotification: function() {}
};
