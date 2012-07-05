'use strict';

var Contacts = {

  findByNumber: function findByNumber(number, callback) {
    console.log("In findByNumber...");
    console.log("number: " + number);
    var options = {
      filterBy: ['tel'],
      filterOp: 'contains',
      filterValue: number
    };

    this._findOne(options, callback);
  },

  _findOne: function findOne(options, callback) {
    var mozContacts = navigator.mozContacts;
    console.log("mozContacts: " + mozContacts);
    console.log("options.filterValue: " + options.filterValue);
    if (mozContacts) {
      var request = mozContacts.find(options, callback);
      request.onsuccess = function findCallback() {
        console.log("In request.onsuccess...");
        console.log("request.result.length: " + request.result.length);
        if (request.result.length == 0)
          return;

        var contacts = request.result;
        console.log("contacts.length: " + contacts.length);
        callback(contacts[0]);
      };
    } else {
      callback(null);
    }
  }
};

