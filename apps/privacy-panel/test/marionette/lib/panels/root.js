'use strict';

var Base = require('../base');

function RootPanel(client) {
  Base.call(this, client);
}

module.exports = RootPanel;

RootPanel.prototype = {

  __proto__: Base.prototype,

  selectors: {
    rootPanel: '#root',
    alaPanel: '#ala-main',
    rppPanel: '#rpp-main',
    gtPanel: '#gt-main'
  },

  init: function() {
    this.launch();
  },

  tapOnAlaMenuItem: function() {
    this.client.findElement('#menu-item-ala').tap();
  },

  tapOnRppMenuItem: function() {
    this.client.findElement('#menu-item-rpp').tap();
  },

  tapOnGtMenuItem: function() {
    this.client.findElement('#menu-item-gt').tap();
  },

  isAlaDisplayed: function() {
    this.waitForPanelToDissapear(this.selectors.rootPanel);
    return this.client.findElement(this.selectors.alaPanel).displayed();
  },

  isRppDisplayed: function() {
    this.waitForPanelToDissapear(this.selectors.rootPanel);
    return this.client.findElement(this.selectors.rppPanel).displayed();
  },

  isGtDisplayed: function() {
    this.waitForPanelToDissapear(this.selectors.rootPanel);
    return this.client.findElement(this.selectors.gtPanel).displayed();
  },

};
