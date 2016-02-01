'use strict';
/* global module */

var ActivitiesAccessor = require('./accessors');

function ActivitiesView(client) {
  this.client = client;
  this.accessors = new ActivitiesAccessor(client);
}

ActivitiesView.prototype = {
  pickCreateNew: function() {
      this.client.waitFor(function() {
        return this.accessors.addNewContactMenuItem.enabled();
      }.bind(this));
      var button = this.accessors.addNewContactMenuItem;
      button.tap();

      var contacts = this.client.loader.getAppClass('contacts');
      contacts.switchToCreateNewContactActivity();
      return contacts;
  }
};

module.exports = ActivitiesView;
