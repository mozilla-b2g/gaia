'use strict';

var SELECTORS = Object.freeze({
  callLogTabItem: '#option-recents',
  contactsTabItem: '#option-contacts'
});

function TabsAccessors(client) {
  this.client = client;
}

TabsAccessors.prototype = {
  get callLogButton() {
    return this.client.helper.waitForElement(SELECTORS.callLogTabItem);
  },

  get contactListButton() {
    return this.client.helper.waitForElement(SELECTORS.contactsTabItem);
  }
};

module.exports = TabsAccessors;
