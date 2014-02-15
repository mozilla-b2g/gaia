'use strict';
var Base = require('../base');

/**
 * Abstraction around settings sound panel
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function SoundPanel(client) {

  // Call the Base constructor to initiate base class.
  Base.call(this, client, null, SoundPanel.Selectors);

}

module.exports = SoundPanel;

SoundPanel.Selectors = {
  'alerttone': '#alert-tone-selection',
  'ringtone': '#ring-tone-selection'
};

SoundPanel.prototype = {
  __proto__: Base.prototype,

  get ringtone() {
    return this.waitForElement('ringtone');
  },

  get alerttone() {
    return this.waitForElement('alerttone');
  },

  clickRingToneSelect: function() {
    this.waitForElement('ringtone').tap();
  },

  clickAlertToneSelect: function() {
    this.waitForElement('alerttone').tap();
  },

  getSelectedRingTone: function() {
    return this.waitForElement('ringtone')
      .text();
  },

   getSelectedAlertTone: function() {
    return this.waitForElement('alerttone')
      .text();
  }
};
