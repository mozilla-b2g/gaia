'use strict';
/* global module */

var SELECTORS = Object.freeze({
  goToCallLog: '#option-recents',
  goToContactList: '#option-contacts'
});

function DialerOptionsAccessor(client) {
  this.client = client;
}

DialerOptionsAccessor.prototype = {
  get callLogButton() {
    return this.client.helper.waitForElement(SELECTORS.goToCallLog);
  },

  get contactListButton() {
    return this.client.helper.waitForElement(SELECTORS.goToContactList);
  }
};

module.exports = DialerOptionsAccessor;
