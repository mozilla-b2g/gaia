'use strict';

var Base = require('../base');

function TcMainPanel(client) {
  Base.call(this, client);
}

module.exports = TcMainPanel;

TcMainPanel.prototype = {

  __proto__: Base.prototype,

  selectors: {
    rootPanel:  '#root',
    tcPanel:    '#tc-main',
    appPanel:   '#tc-applications',
    appEntry:   '#tc-appList li',
    appDetail:  '#tc-appDetails',
    permPanel:  '#tc-permissions',
    permEntry:  '#tc-permList li',
    permDetail: '#tc-permDetails',
    sortKey:    '#tc-sortKey'
  },

  init: function() {
    this.launch();
    this.client.findElement('#menu-item-tc').tap();
    this.waitForPanelToDissapear(this.selectors.rootPanel);
  },

  // panels & sub-panels

  get appPanel() {
    return this.client.findElement(this.selectors.appPanel);
  },

  get appDetail() {
    return this.client.findElement(this.selectors.appDetail);
  },

  get permPanel() {
    return this.client.findElement(this.selectors.permPanel);
  },

  get permDetail() {
    return this.client.findElement(this.selectors.permDetail);
  },

  // panel transitions

  isAppDisplayed: function() {
    this.waitForPanelToDissapear(this.selectors.tcPanel);
    return this.appPanel.displayed();
  },

  isPermDisplayed: function() {
    this.waitForPanelToDissapear(this.selectors.tcPanel);
    return this.permPanel.displayed();
  },

  isAppDetailDisplayed: function() {
    this.waitForPanelToDissapear(this.selectors.appPanel);
    return this.appDetail.displayed();
  },

  isPermDetailDisplayed: function() {
    this.waitForPanelToDissapear(this.selectors.permPanel);
    return this.permDetail.displayed();
  },

  // UI actions

  tapOnAppMenuItem: function() {
    this.client.findElement('a[href="' + this.selectors.appPanel + '"]').tap();
  },

  tapOnPermMenuItem: function() {
    this.client.findElement('a[href="' + this.selectors.permPanel + '"]').tap();
  },

  tapOnAppEntryItem: function() {
    this.client.findElement(this.selectors.appEntry).tap();
  },

  tapOnPermEntryItem: function() {
    this.client.findElement(this.selectors.permEntry).tap();
  },

  sortApps: function(sortKey, selectorToFind) {
    var select = this.client.findElement(this.selectors.sortKey);
    this.tapSelectOption(select, sortKey);
    this.waitForElement(selectorToFind);
  }

};
