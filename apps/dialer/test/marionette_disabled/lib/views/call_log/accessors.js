'use strict';

var SELECTORS = Object.freeze({
  editButton: '#call-log-icon-edit',
  callLogTabs: '#call-log-filter',
  callLogItem: '.log-item',
  callLogNoResults: '#no-result-message',
  editHeader: '#edit-mode-header',
  selectAllButton: '#select-all-threads',
  deleteButton: '#delete-button',
  confirmDeleteButton: '#confirmation-message [data-l10n-id="delete"]'
});

function CallLogAccessors(client) {
  this.client = client;
}

CallLogAccessors.prototype = {
  get callLogFilter() {
    return this.client.helper.waitForElement(SELECTORS.callLogTabs);
  },

  get callLogNoResults() {
    return this.client.helper.waitForElement(SELECTORS.callLogNoResults);
  },

  get logEntries() {
    return this.client.findElements(SELECTORS.callLogItem);
  },

  get editButton() {
    return this.client.helper.waitForElement(SELECTORS.editButton);
  },

  get editHeader() {
    return new EditHeaderAccessors(this.client, SELECTORS.editHeader);
  },

  get selectAllButton() {
    return this.client.helper.waitForElement(SELECTORS.selectAllButton);
  },

  get deleteButton() {
    return this.client.helper.waitForElement(SELECTORS.deleteButton);
  },

  get dialogConfirmButton() {
    return this.client.helper.waitForElement(SELECTORS.confirmDeleteButton);
  }
};


var HEADER_SELECTORS = Object.freeze({
  title: 'h1',
});

function EditHeaderAccessors(client, rootSelector) {
  this.client = client;
  this.rootSelector = rootSelector;
}

EditHeaderAccessors.prototype = {
  get root() {
    return this.client.helper.waitForElement(this.rootSelector);
  },

  get title() {
    return this.root.findElement(HEADER_SELECTORS.title);
  },

  get closeButton() {
    return this.root;
  }
};


module.exports = CallLogAccessors;
