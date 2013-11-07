var Base = require('../base');

/**
 * Abstraction around settings support panel
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function SupportPanel(client) {

  // Call the Base constructor to initiate base class.
  Base.call(this, client, null, SupportPanel.Selectors);

}

module.exports = SupportPanel;

SupportPanel.Selectors = {
  'onlineSupport': '#online-support-text [href]',
  'callSupports': '#call-support-numbers [href]'
};

SupportPanel.prototype = {

  __proto__: Base.prototype,

  get isOnlineSupportEnabled() {
    var retval = false;
    try {
      this.onlineSupport;
      retval = true;
    } catch (ex) {
      retval = false;
    }
    return retval;
  },

  get isCallSupportEnabled() {
    return this.callSupports.length > 0;
  },

  get onlineSupport() {
    return this.findElement('onlineSupport');
  },

  get callSupports() {
    return this.findElements('callSupports');
  }

};
