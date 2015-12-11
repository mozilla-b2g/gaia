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

  injectMockCallLogEntry: function(entry) {
    this.client.executeScript(function() {
      window.wrappedJSObject.CallLogDBManager.add(entry);
    });
    this.client.helper.waitForElement(Dialer.selectors.callLogItem);
  },

  enterEditMode: function() {
    this.client.findElement(Dialer.selectors.callLogEditButton).tap();
    this.client.helper.waitForElement(Dialer.selectors.callLogEditForm);
  },

  get phoneNumber() {
    return this.client.helper.waitForElement(Dialer.Selectors.phoneNumber)
                             .getAttribute('value');
  }
};

module.exports = Dialer;
