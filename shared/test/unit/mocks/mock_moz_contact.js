console.time("mock_moz_contact.js");
/* exported MockmozContact */

'use strict';

var MockmozContact = function(obj) {
  if (!obj) {
    return;
  }
  var self = this;
  Object.keys(obj).forEach(function(k) {
    self[k] = obj[k];
  });
};
console.timeEnd("mock_moz_contact.js");
