'use strict';

/* global module */
var KeypadView = require('./views/keypad/views.js');
var TabsView = require('./views/tabs/view.js');

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
  profile: {
    settings: {
      'devtools.overlay': true,
      'hud.reflows': true
    },
    prefs: {
      'devtools.debugger.forbid-certified-apps': false
    }
  },
  desiredCapabilities: {
    'raisesAccessibilityExceptions': false
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

  contactsTabItem: '#option-contacts',
  callLogTabItem: '#option-recents',
  callLogTabs: '#call-log-filter',
  callLogEditForm: '#edit-mode',

  addToExistingContactMenuItem: 'button[data-l10n-id="addToExistingContact"]'
};

Dialer.prototype = {
  /**
   * Launches dialer app and focuses on frame.
   */
  launch: function() {
    this.client.apps.launch(Dialer.URL, 'dialer');
    this.switchTo();
    this.client.helper.waitForElement('body');
  },

  relaunch: function() {
    this.client.apps.close(Dialer.URL, 'dialer');
    this.launch();
  },

  switchTo: function() {
    this.client.switchToFrame();
    // switchToApp already waits for the app to be displayed
    this.client.apps.switchToApp(Dialer.URL, 'dialer');
  },

  get phoneNumber() {
    return this.client.helper.waitForElement(Dialer.Selectors.phoneNumber)
                             .getAttribute('value');
  },

  get keypadView() {
    return new KeypadView(this.client);
  },

  get tabs() {
    return new TabsView(this.client);
  }
};

module.exports = Dialer;
