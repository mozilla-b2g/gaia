/* exported MockNavigatorMozChromeNotifications */

'use strict';

var MockNavigatorMozChromeNotifications = {
  mNumber: 1,

  mozResendAllNotifications: function(callback) {
    callback(this.mNumber);
  }
};
