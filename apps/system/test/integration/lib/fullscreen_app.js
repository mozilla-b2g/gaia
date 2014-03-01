'use strict';

function FullScreenApp(client, origin) {
  this.client = client;
  this.origin = origin;
}

module.exports = FullScreenApp;

FullScreenApp.prototype = {
  client: null,

  launch: function() {
    this.client.apps.launch(this.origin);
    this.client.apps.switchToApp(this.origin);

    // Wait until the app has told us it's fully loaded.
    this.client.helper.waitForElement('body.loaded');
  },

  close: function() {
    this.client.apps.close(this.origin);
  }
};
