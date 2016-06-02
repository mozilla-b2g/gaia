'use strict';

var CallLogAccessors = require('./accessors');



function CallLogView(client, expectedNumberOfItems) {
  this.client = client;
  this.accessors = new CallLogAccessors(client);

  this.accessors.callLogFilter;

  if (expectedNumberOfItems === 0) {
    this.accessors.callLogNoResults;
  } else {
    var self = this;
    this.client.waitFor(function() {
      return self.accessors.logEntries.length === expectedNumberOfItems;
    });
  }
}

CallLogView.prototype = {
  enterEditMode: function() {
    var filter = this.accessors.callLogFilter;
    this.accessors.editButton.tap();
    this.client.helper.waitForElementToDisappear(filter);

    var self = this;
    this.client.waitFor(function() {
      return self.accessors.editHeader.title.getAttribute('data-l10n-id') ===
        'edit';
    });
  },

  exitEditMode: function() {
    var editHeader = this.accessors.editHeader.root;
    // TODO: Use a GaiaHeader view, once bug 1241813 lands
    this.accessors.editHeader.closeButton.tap(10,10);
    this.accessors.callLogFilter;
    this.client.helper.waitForElementToDisappear(editHeader);
  },

  deleteEntries: function(indexesToDelete) {
    var logEntries = this.accessors.logEntries;
    var entriesToDelete = logEntries.filter(function(_, index) {
      return indexesToDelete.indexOf(index) > -1;
    });

    entriesToDelete.forEach(function(entry) {
      entry.tap();
    });

    this._performDelete();
  },

  deleteAllEntries: function() {
    this.accessors.selectAllButton.tap();
    this._performDelete();
  },

  _performDelete: function() {
    var editHeader = this.accessors.editHeader.root;
    this.accessors.deleteButton.tap();
    this.accessors.dialogConfirmButton.tap();
    this.client.helper.waitForElementToDisappear(editHeader);
  }
};

module.exports = CallLogView;
