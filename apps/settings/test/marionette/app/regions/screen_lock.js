/* global require, module */
'use strict';
var Base = require('../base');

/**
 * Abstraction around settings screenLock panel
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function ScreenLockPanel(client) {

  // Call the Base constructor to initiate base class.
  Base.call(this, client, null, ScreenLockPanel.Selectors);

}

module.exports = ScreenLockPanel;

ScreenLockPanel.Selectors = {
  'screenLockLabel': 'label[data-l10n-id="lockScreen"]',
  'screenLockCheckbox': '.lockscreen-enable',
  'header': 'gaia-header',
  'passcodeLockLabel': 'label[data-l10n-id="passcode-lock"]',
  'passcodeInput': '.passcode-input',
  'passcodeCheckbox': '.passcode-enable',
  'passcodeIsNotMatchedLabel': 'div[data-l10n-id="passcode-doesnt-match"]',
  'passcodeIncorrectLabel': 'div[data-l10n-id="incorrect-passcode"]',
  'passcodeCreateButton': 'button[type="submit"]',
  'passcodeEditButton': '.passcode-edit',
  'passcodeChangeButton': 'button[type="submit"]',
  'passcodePanel': '#screenLock-passcode',
  'screenLockHeaderLabel': 'h1[data-l10n-id="screenLock-header"]'
};

ScreenLockPanel.prototype = {

  __proto__: Base.prototype,

  isScreenLockEnabled: function() {
    return this.client.settings.get('lockscreen.enabled');
  },

  isScreenLockChecked: function() {
    return this.findElement('screenLockCheckbox').getAttribute('checked');
  },

  isPasscodeLockEnabled: function() {
    return this.client.settings.get('lockscreen.passcode-lock.enabled');
  },

  isPasscodeChecked: function() {
    return this.findElement('passcodeCheckbox').getAttribute('checked');
  },

  isPasscodeNotMatched: function() {
    return this.findElement('passcodeIsNotMatchedLabel').displayed();
  },

  isPasscodeIncorrect: function() {
    return this.findElement('passcodeIncorrectLabel').displayed();
  },

  isPasscodePanelVisible: function() {
    return this.findElement('passcodePanel').displayed();
  },

  isScreenLockHeaderLabelVisible: function() {
    return this.findElement('screenLockHeaderLabel').displayed();
  },

  enableScreenLock: function() {
    this.waitForElement('screenLockLabel').tap();
    this.client.waitFor(function() {
      return this.isScreenLockEnabled();
    }.bind(this));
  },

  setupScreenLock: function() {
    // make sure we are at the root panel at first
    if (this.isPasscodePanelVisible()) {
      this.tapBackButton();
    }

    // we have to make sure screenLock is disabled by default
    if (!this.isScreenLockEnabled()) {
      return;
    }

    // if we have passcode by default, then there is a popup
    // when disabling screenLock, in this way, we have to
    // type the correct code to disable passcodeLock at first
    if (this.isPasscodeLockEnabled()) {
      var code = this.getPasscode();
      this.togglePasscodeLock();
      this.typePasscode(code);
    }

    // then we can disable screenLock
    this.toggleScreenLock();
  },

  toggleScreenLock: function() {
    this.waitForElement('screenLockLabel').tap();
  },

  togglePasscodeLock: function() {
    this.waitForElement('passcodeLockLabel').tap();
  },

  _typePasscode: function(keys) {
    this.waitForElement('passcodeInput').sendKeys(keys);
  },

  typePasscode: function(key1, key2) {
    if (key1) {
      this._typePasscode(key1);
      if (key2) {
        this._typePasscode(key2);
      }
    }
  },

  tapBackButton: function() {
    this.waitForElement('header').tap(25, 25);
  },

  tapCreatePasscode: function() {
    this.waitForElement('passcodeCreateButton').tap();

    // we have to make sure transition is done
    this.client.waitFor(function() {
      return this.isScreenLockHeaderLabelVisible();
    }.bind(this));
  },

  tapEditPasscode: function(keys) {
    this.waitForElement('passcodeEditButton').tap();
    if (keys) {
      this._typePasscode(keys);
    }
  },

  tapChangePasscode: function() {
    this.waitForElement('passcodeChangeButton').tap();
  }
};
