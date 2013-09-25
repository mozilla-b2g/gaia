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
  'doNotTrackEnabledCheckbox': '#doNotTrack input',
  'doNotTrackEnabledLabel': '#doNotTrack label'
};

DoNotTrackPanel.prototype = {

  __proto__: Base.prototype,

  get isDoNotTrackEnabled() {
    return this.findElement('doNotTrackEnabledCheckbox')
      .getAttribute('checked');
  },

  enableDoNotTrack: function() {
    this.waitForElement('doNotTrackEnabledLabel').tap();
      this.client.waitFor(function() {
        return this.isDoNotTrackEnabled;
    }.bind(this));
  },

  disableDoNotTrack: function() {
    this.waitForElement('doNotTrackEnabledLabel').tap();
      this.client.waitFor(function() {
        return !this.isDoNotTrackEnabled;
    }.bind(this));
  }

};
