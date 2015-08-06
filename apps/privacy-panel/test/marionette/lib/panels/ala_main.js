'use strict';

var Base = require('../base');

function AlaMainPanel(client) {
  Base.call(this, client);
}

module.exports = AlaMainPanel;

AlaMainPanel.prototype = {

  __proto__: Base.prototype,

  selectors: {
    rootPanel: '#root',
    alaPanel: '#ala-main'
  },

  init: function() {
    this.launch();
    this.client.findElement('#menu-item-ala').tap();
    this.waitForPanelToDissapear(this.selectors.rootPanel);
  }

};
