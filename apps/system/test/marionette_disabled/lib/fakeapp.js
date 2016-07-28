'use strict';

function FakeApp(client, origin) {
  this.client = client;
  this.origin = origin;
}

module.exports = FakeApp;

FakeApp.prototype = {
  client: null,

  get iframe() {
    return this.getAppIframe(this.origin);
  },

  launch: function() {
    this.client.apps.launch(this.origin);

    this.client.apps.switchToApp(this.origin);
    // Wait until the app has told us it's fully loaded.
    this.client.helper.waitForElement('body.loaded');

    this.client.switchToFrame();
  },

  getAppIframe: function(url) {
    return this.client.findElement('iframe[src*="' + url + '"]');
  },

  close: function() {
    this.client.apps.close(this.origin);
  }
};
