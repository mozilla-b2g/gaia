'use strict';
/* global module */

var ActivitiesAccessor = require('./accessors');

function ActivitiesView(client) {
  this.client = client;
  this.accessors = new ActivitiesAccessor(client);
}

ActivitiesView.prototype = {
  pickCreateNew: function() {
    this.openElement(this.accessors.addNewContactMenuItem);
      
    var contacts = this.client.loader.getAppClass('contacts');
    contacts.switchToCreateNewContactActivity();
    return contacts;
  },

  pickAddToContact: function() {
    this.openElement(this.accessors.addToContactMenuItem);

    var contacts = this.client.loader.getAppClass('contacts');
    contacts.switchToApp();
    return contacts;
  },

  openElement: function(accessorToTap){
      accessorToTap.tap();
  }
};

module.exports = ActivitiesView;
