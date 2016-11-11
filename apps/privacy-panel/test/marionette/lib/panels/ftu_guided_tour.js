'use strict';

var Base = require('../base');

function GuidedTourPanels(client) {
  Base.call(this, client);
}

module.exports = GuidedTourPanels;

GuidedTourPanels.prototype = {

  __proto__: Base.prototype,

  selectors: {
    rootPanel:       '#root',
    gtWelcome:       '#gt-main'
  },

  init: function() {
    this.launch();
  },

  tapOnCloseBtn: function() {
    this.client.findElement(this.selectors.gtWelcome + ' .gt-header .back')
      .tap();
  },

  isRootDisplayed: function() {
    this.waitForPanel(this.selectors.rootPanel);
    return this.client.findElement(this.selectors.rootPanel).displayed();
  },

  isGtWelcomeDisplayed: function() {
    return this.client.findElement(this.selectors.gtWelcome).displayed();
  }

};
