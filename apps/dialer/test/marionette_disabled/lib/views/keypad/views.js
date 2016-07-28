'use strict';
/* global module */
var KeypadAccessor = require('./accessors');

function KeypadView(client) {
  this.client = client;
  this.accessors = new KeypadAccessor(client);
}

KeypadView.prototype = {
  typePhoneNumber: function(number) {
    var i;
    var typeNumberArray = String(number).split('');

    for (i in typeNumberArray){
      if (i === '+') {
        var zero_key = this.key(0);
        this.actions.longPress(zero_key, 1).perform();
      } else {
        i = parseInt(typeNumberArray[i]);
        this.accessors.key(i).tap();
      }
    }
  },

  addToContacts: function() {
    var addToContactsButton = this.accessors.addContactButton;
    addToContactsButton.tap();

    var ActivitiesView = require('../activities/views.js');
    var activitiesView = new ActivitiesView(this.client);
    return activitiesView;
  }
};

module.exports = KeypadView;
