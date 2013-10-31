/**
 * Abstraction around dialer app.
 * This file can be moved to the dialer app once we
 * implement dialer marionette tests.
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function Dialer(client) {
  this.client = client;
}

/**
 * @type String Origin of dialer app
 */
Dialer.URL = 'app://communications.gaiamobile.org';

Dialer.Selectors = {
};

/**
 * @private
 * @param {Marionette.Client} client for selector.
 * @param {String} name of selector [its a key in Dialer.Selectors].
 */
function findElement(client, name) {
  return client.findElement(Dialer.Selectors[name]);
}

Dialer.prototype = {
  /**
   * Launches dialer app and focuses on frame.
   */
  launch: function() {
    this.client.apps.launch(Dialer.URL, 'dialer');
    this.client.apps.switchToApp(Dialer.URL, 'dialer');
    this.client.helper.waitForElement('body');
  },

  relaunch: function() {
    this.client.apps.close(Dialer.URL, 'dialer');
    this.launch();
  }
};

module.exports = Dialer;
