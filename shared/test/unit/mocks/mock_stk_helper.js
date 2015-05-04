/* exported MockSTKHelper */
'use strict';

var MockSTKHelper = {
  getIconCanvas: function(icon) {
    return document.createElement('canvas');
  },
  getMessageText: function(stkMessage, defaultMessage, defaultMessageArgs) {
    var text;
     if (stkMessage === 'string' || stkMessage instanceof String) {
       text = stkMessage;
     } else {
       text = stkMessage ? stkMessage.text : '';
     }
     if (!text) {
       text = defaultMessage;
     }
     return text;
  },
  isIconSelfExplanatory: function(stkMessage) {},
  getFirstIconRawData: function(stkItem) {}
};
