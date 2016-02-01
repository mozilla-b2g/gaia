'use strict';

/* global module */
var SELECTORS = Object.freeze({
  addNewContact: 'button[data-l10n-id="createNewContact"]',
});

function ActivitiesAccessor(client) {
  this.client = client;
}

ActivitiesAccessor.prototype = {
  get addNewContactMenuItem() {
    return this.client.helper.waitForElement(SELECTORS.addNewContact);
  }
};

module.exports = ActivitiesAccessor;
