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
    appBack:    '#tc-appDetails a[href="#tc-applications"]',
    permPanel:  '#tc-permissions',
    permEntry:  '#tc-permList li',
    permDetail: '#tc-permDetails',
    sortKey:    '#tc-sortKey',
    searchInput:'#tc-appSearch input',
    searchClear:'#tc-appSearch [type="reset"]',
    searchClose:'#tc-appSearch [type="submit"]'
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
    if (this.appDetail.displayed()) {
      return true;
    }
    this.waitForPanelToDissapear(this.selectors.appPanel);
    return this.appDetail.displayed();
  },

  isPermDetailDisplayed: function() {
    if (this.permDetail.displayed()) {
      return true;
    }
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

  tapOnAppDetailBack: function() {
    this.client.findElement(this.selectors.appBack).tap();
    this.waitForPanelToDissapear(this.selectors.appDetail);
    return this.appPanel.displayed();
  },

  sortApps: function(sortKey, selectorToFind) {
    var select = this.client.findElement(this.selectors.sortKey);
    this.tapSelectOption(select, sortKey);
    this.waitForElement(selectorToFind);
  },

  // search mode

  enterSearchMode: function() {
    this.client.findElement(this.selectors.searchInput).tap();
    var sortKey = this.client.findElement(this.selectors.sortKey);
    var closeBtn = this.client.findElement(this.selectors.searchClose);
    this.client.waitFor(function() {
      return closeBtn.displayed() && !sortKey.displayed();
    });
  },

  get searchPattern() {
    return this.client.findElement(this.selectors.searchInput).text();
  },

  sendSearchKeys: function(key) {
    this.client.findElement(this.selectors.searchInput).sendKeys(key);
  },

  clearSearch: function(key) {
    this.client.findElement(this.selectors.searchClear).tap();
  },

  leaveSearchMode: function() {
    this.client.findElement(this.selectors.searchClose).tap();
    var sortKey = this.client.findElement(this.selectors.sortKey);
    var closeBtn = this.client.findElement(this.selectors.searchClose);
    this.client.waitFor(function() {
      return !closeBtn.displayed() && sortKey.displayed();
    });
  },

  isSearchCloseDisplayed: function() {
    return this.client.findElement(this.selectors.searchClose).displayed();
  },

  isSortKeyDisplayed: function() {
    return this.client.findElement(this.selectors.sortKey).displayed();
  }

};
