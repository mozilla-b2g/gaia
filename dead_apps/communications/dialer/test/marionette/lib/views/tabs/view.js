'use strict';

var TabsAccessors = require('./accessors');
var CallLogView = require('../call_log/view.js');

function TabsView(client) {
  this.client = client;
  this.accessors = new TabsAccessors(client);
}

TabsView.prototype = {
  goToCallLog: function(expectedNumberOfItems) {
    expectedNumberOfItems = expectedNumberOfItems || 0;
    this.accessors.callLogButton.tap();
    return new CallLogView(this.client, expectedNumberOfItems);
  },

  goToContactList: function() {
    this.accessors.contactListButton.tap();
    var contacts = this.client.loader.getAppClass('contacts');
    return contacts;
  },
};

module.exports = TabsView;
