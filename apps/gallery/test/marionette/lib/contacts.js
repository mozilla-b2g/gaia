var assert = require('assert');

/**
 * Abstraction around contacts app.
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function Contacts(client) {
  this.client = client;
  this.client.setSearchTimeout(10000);
}

/**
 * @type String Origin of contacts app
 */
Contacts.URL = 'app://communications.gaiamobile.org';

Contacts.config = {
  settings: {
    // disable keyboard ftu because it blocks our display
    'keyboard.ftu.enabled': false
  }
};

Contacts.Selectors = {
  body: 'body',
  bodyReady: 'body .view-body'
};

/**
 * @private
 * @param {Marionette.Client} client for selector.
 * @param {String} name of selector [its a key in Contacts.Selectors].
 */
function findElement(client, name) {
  return client.findElement(Contacts.Selectors[name]);
}

Contacts.prototype = {
  /**
   * Launches contacts app and focuses on frame.
   */
  launch: function() {
    this.client.apps.launch(Contacts.URL, 'contacts');
    this.client.apps.switchToApp(Contacts.URL, 'contacts');
    this.client.helper.waitForElement(Contacts.Selectors.bodyReady);
  }
 };

module.exports = Contacts;
