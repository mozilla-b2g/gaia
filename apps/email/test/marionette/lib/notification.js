/*jshint node: true, browser: true */

var assert = require('assert'),
    imgSelector = '#desktop-notifications-container [data-notification-id] img';

function Notification(client) {
  this.client = client;
}
module.exports = Notification;

Notification.prototype = {
  assertNoNotification: function() {
    this.getContainer().findElement('div', function(error) {
      assert.ok(!!error);
    });
  },

/*
  tapFirstNotification: function() {
    // This one does not throw an error, but it also does not end
    // up triggering the action for the
    // return this.client.findElement('#notification-toaster').tap();
  },
*/

  getContainer: function() {
    return this.client.findElement('#desktop-notifications-container');

  },

  getFirstIconUrl: function() {
    var img = this.getContainer().findElement('img');
    return img.getAttribute('src');
  }
};

require('./debug')('notification', Notification.prototype);
