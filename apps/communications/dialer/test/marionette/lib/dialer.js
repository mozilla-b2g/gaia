'use strict';

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
    'devtools.overlay': true,
    'hud.reflows': true
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
  keypadCallBarAddContact: '#keypad-callbar-add-contact',

  callLogTabItem: '#option-recents',
  callLogEditButton: '#call-log-icon-edit',
  callLogTabs: '#call-log-filter',
  callLogNoResultsContainer: '#no-result-container',
  callLogItem: '.log-item',
  callLogEditForm: '#edit-mode',

  contactsTabItem: '#option-contacts',
  contactsIframe: '#iframe-contacts',

  addToExistingContactMenuItem: 'button[data-l10n-id="addToExistingContact"]'
};

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
