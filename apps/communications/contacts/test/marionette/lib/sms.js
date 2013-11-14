/**
 * Abstraction around sms app.
 * This file can be moved to the sms app once we
 * implement sms marionette tests.
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function Sms(client) {
  this.client = client;
}

/**
 * @type String Origin of sms app
 */
Sms.URL = 'app://sms.gaiamobile.org';

Sms.Selectors = {
  listCompose: '#icon-add',
  threadAddContact: '#messages-contact-pick-button'
};

/**
 * @private
 * @param {Marionette.Client} client for selector.
 * @param {String} name of selector [its a key in Sms.Selectors].
 */
function findElement(client, name) {
  return client.findElement(Sms.Selectors[name]);
}

Sms.prototype = {
  /**
   * Launches sms app and focuses on frame.
   */
  launch: function() {
    this.client.apps.launch(Sms.URL);
    this.client.apps.switchToApp(Sms.URL);
    this.client.helper.waitForElement('body');
  },

  relaunch: function() {
    this.client.apps.close(Sms.URL);
    this.launch();
  }
};

module.exports = Sms;
