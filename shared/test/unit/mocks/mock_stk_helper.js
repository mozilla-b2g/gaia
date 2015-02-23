/* exported MockSTKHelper */
'use strict';

var MockSTKHelper = {
  getIconCanvas: function(icon) {
    return document.createElement('canvas');
  },
  getMessageText: function(stkMessage, defaultMessage, defaultMessageArgs) {},
  isIconSelfExplanatory: function(stkMessage) {},
  getFirstIconRawData: function(stkItem) {}
};
