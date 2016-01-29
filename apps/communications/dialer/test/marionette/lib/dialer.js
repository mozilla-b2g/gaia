'use strict';

/* global module */
var KeypadView = require('./views/keypad/views.js');

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

  callLogTabItem: '#option-recents',
  callLogEditButton: '#call-log-icon-edit',
  callLogTabs: '#call-log-filter',
  callLogNoResultsContainer: '#no-result-container',
  callLogItem: '.log-item',
  callLogEditForm: '#edit-mode',
  noEntriesMessage: '#no-result-msg1',
  callLogMissedTab: '#missed-filter',
  noMissedCalls: '#no-result-msg3',

  contactsTabItem: '#option-contacts',
  contactsIframe: '#iframe-contacts',
  contactsFormHeader: '#contact-form-header',

  contactsAddIframe:'iframe[src*="form"]',
  doneButton: 'button[data-l10n-id="done"]',
  addNewContact: 'button[data-l10n-id="createNewContact"]',
  addToExistingContactMenuItem: 'button[data-l10n-id="addToExistingContact"]',
  contactNameField: '#givenName',
  contactLocator: 'li[data-uuid]:not([data-group="ice"])'
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
  
  goToContactList: function() {
    this.contactListButton.tap();
    var contacts = this.client.loader.getAppClass('contacts');
    return contacts;
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
  },

  get keypadView() {
    return new KeypadView(this.client);
  },

  get contactListButton() {
    return this.client.helper.waitForElement(Dialer.Selectors.contactsTabItem);
  }
};

module.exports = Dialer;
