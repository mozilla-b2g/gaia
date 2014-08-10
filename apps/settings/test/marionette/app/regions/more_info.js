'use strict';

var Base = require('../base');

/**
 * Abstraction around settings device more information panel
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function MoreInfoPanel(client) {
  // Call the Base constructor to initiate base class.
  Base.call(this, client, null, MoreInfoPanel.Selectors);
}

module.exports = MoreInfoPanel;

MoreInfoPanel.Selectors = {
  'moreInfoPanel': '#about-moreInfo',
  'developerMenuCheckbox': 'input[name="developer.menu.enabled"]',
  'backButton': 'header button[type="reset"]',
};

MoreInfoPanel.prototype = {

  __proto__: Base.prototype,

  get isDeveloperMenuEnabled() {
    return this.findElement('developerMenuCheckbox').getAttribute('checked');
  },

  get isDeveloperMenuShowed() {
    return this.findElement('developerMenuCheckbox').getAttribute('hidden');
  },

  isRendered: function() {
    this.client.waitFor(function() {
      return this.waitForElement('moreInfoPanel')
              .getAttribute('data-rendered') === 'true';
    }.bind(this));
  },

  enableDeveloperMenu: function() {
    if (!this.isDeveloperMenuEnabled && !this.isDeveloperMenuShowed) {
      this.findElement('developerMenuCheckbox').tap();
    }
  },

  goBack: function() {
    this.waitForElement('backButton').tap();
  }
};

