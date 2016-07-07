'use strict';
/* global module */
var DialerOptionsAccessor = require('./tabAccessors');

function DialerOptionsView(client) {
  this.client = client;
  this.accessors = new DialerOptionsAccessor(client);
}

DialerOptionsView.prototype = {
  goToCallLog: function() {
    var callLogTab = this.accessors.callLogButton;
    callLogTab.tap();

    var CallLogView = require('../call_log/views.js');
    return new CallLogView(this.client);
  },

  goToContactList: function() {
    var contactListTab = this.accessors.contactListButton;
    contactListTab.tap();

    var contacts = this.client.loader.getAppClass('contacts');
    return contacts;
  }
};

module.exports = DialerOptionsView;
