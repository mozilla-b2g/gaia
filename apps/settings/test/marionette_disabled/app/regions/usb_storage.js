'use strict';
var Base = require('../base');

/**
 * Abstraction around settings bluetooth panel
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function UsbStoragePanel(client) {

  // Call the Base constructor to initiate base class.
  Base.call(this, client, null, UsbStoragePanel.Selectors);

}

module.exports = UsbStoragePanel;

UsbStoragePanel.Selectors = {
  'usbEnabledCheckbox': '.ums-switch',
  'confirmButton': '#settings-confirm-dialog button[type="submit"]'
};

UsbStoragePanel.prototype = {

  __proto__: Base.prototype,

  get isUsbEnabledSwitchChecked() {
    // Marionette has trouble returning custom properties on shadow roots.
    // For now query the shadowRoot for checked status.
    return this.findElement('usbEnabledCheckbox')
      .scriptWith(function(el) {
        return el.shadowRoot.querySelector('input[type="checkbox"]').checked;
      });
  },
  get isUmsEnabled() {
    return this.client.settings.get('ums.enabled');
  },

  tapUsbEnabledSwitch: function() {
    this.waitForElement('usbEnabledCheckbox').tap();
  }
};
