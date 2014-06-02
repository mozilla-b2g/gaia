'use strict';

/* exported MockPhoneNumberActionMenu */

var MockPhoneNumberActionMenu = {
  show: function(contactId, phoneNumber, options, isMissedCall) {
      console.log(contactId, phoneNumber, options, isMissedCall);
  }
};
