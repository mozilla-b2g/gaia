'use strict';

/* global module */
var SELECTORS = Object.freeze({
  addNewContact: 'button[data-l10n-id="createNewContact"]',
  addToExistingContact: 'button[data-l10n-id="addToExistingContact"]'
});

function ActivitiesAccessor(client) {
  this.client = client;
}

ActivitiesAccessor.prototype = {
  get addNewContactMenuItem() {
    return this.client.helper.waitForElement(SELECTORS.addNewContact);
  },

  get addToContactMenuItem() {
    return this.client.helper.waitForElement(SELECTORS.addToExistingContact);
  }
};

module.exports = ActivitiesAccessor;
