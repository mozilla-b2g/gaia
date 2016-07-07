'use strict';
var Base = require('../base');

/**
 * Abstraction around settings do not track panel
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function DoNotTrackPanel(client) {

  // Call the Base constructor to initiate base class.
  Base.call(this, client, null, DoNotTrackPanel.Selectors);

}

module.exports = DoNotTrackPanel;

DoNotTrackPanel.Selectors = {
  'doNotTrackEnabledCheckbox': '#doNotTrack gaia-radio'
};

DoNotTrackPanel.prototype = {

  __proto__: Base.prototype,

  get isDoNotTrackEnabled() {
    return this.findElement('doNotTrackEnabledCheckbox')
      .scriptWith(function(el) {
        return el.wrappedJSObject.checked;
      });
  },

  enableDoNotTrack: function() {
    this.waitForElement('doNotTrackEnabledCheckbox').click();
      this.client.waitFor(function() {
        return this.isDoNotTrackEnabled;
    }.bind(this));
  },

  disableDoNotTrack: function() {
    this.waitForElement('doNotTrackEnabledCheckbox').click();
      this.client.waitFor(function() {
        return !this.isDoNotTrackEnabled;
    }.bind(this));
  }

};
