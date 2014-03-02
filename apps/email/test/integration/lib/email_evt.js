/*jshint node: true, browser: true */

function EmailEvt(client) {
  this.client = client;
}
module.exports = EmailEvt;

EmailEvt.prototype = {
  /**
   * Calls evt.emit('notification') in the email app.
   * @param  {String} url the imageURL to use for the fake
   * notification data.
   */
  emitNotificationWithUrl: function(url) {
    var client = this.client;
    return client.executeScript(function(url) {
      var evt = window.wrappedJSObject.require('evt');

      evt.emit('notification', {
        clicked: true,
        imageURL: url
      });

      return true;
    }, [url]);
  }
};

require('./debug')('email_evt', EmailEvt.prototype);
