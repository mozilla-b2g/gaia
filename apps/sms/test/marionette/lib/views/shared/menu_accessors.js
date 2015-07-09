'use strict';

/* global module */

var SELECTORS = Object.freeze({
  optionMenu: 'body > form[data-type=action] menu',
  systemMenu: 'form[data-z-index-level="action-menu"]',
  contactPromptMenu: '.contact-prompt menu'
});

function MenuAccessor(client) {
  this.client = client;
}

MenuAccessor.prototype = {
  get systemMenu() {
    // Switch to the system app first.
    this.client.switchToFrame();
    return this.client.helper.waitForElement(SELECTORS.systemMenu);
  },

  get optionMenu() {
    return this.client.helper.waitForElement(SELECTORS.optionMenu);
  },

  get contactPromptMenu() {
    return this.client.helper.waitForElement(SELECTORS.contactPromptMenu);
  },

  selectAppMenuOption: function(text) {
    this.selectMenuOption(this.optionMenu, text);
  },

  selectSystemMenuOption: function(text) {
    this.selectMenuOption(this.systemMenu, text);
  },

  selectContactPromptMenuOption: function(text) {
    this.selectMenuOption(this.contactPromptMenu, text);
  },

  selectMenuOption: function(menuElement, text) {
    var menuOptions = menuElement.findElements('button');
    for (var i = 0; i < menuOptions.length; i++) {
      var menuOption = menuOptions[i];
      if (menuOption.text().toLowerCase() === text.toLowerCase()) {
        // XXX: Workaround until http://bugzil.la/912873 is fixed.
        // Wait for 750ms to let the element be clickable
        this.client.helper.wait(750);
        menuOption.tap();
        break;
      }
    }
  }
};

module.exports = MenuAccessor;
