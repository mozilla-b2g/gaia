/**
 * Abstraction around dialer app.
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

Dialer.config = {
  settings: {
    'ftu.manifestURL': null,
    'lockscreen.enabled': false
  },
  prefs: {
    'dom.w3c_touch_events.enabled': 1,
    'devtools.debugger.forbid-certified-apps': false
  }
};

Dialer.Selectors = {
  phoneNumber: '#phone-number-view',

  keypadView: '#keyboard-view',
  del: '#keypad-delete',
  zero: '.keypad-key[data-value="0"]',
  one: '.keypad-key[data-value="1"]',
  two: '.keypad-key[data-value="2"]',
  three: '.keypad-key[data-value="3"]',

  callLogTabItem: '#option-recents',
  callLogTabs: '#call-log-filter',

  contactsTabItem: '#option-contacts',
  contactsIframe: '#iframe-contacts'
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
