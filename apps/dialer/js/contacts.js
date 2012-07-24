'use strict';

var Contacts = {

  findByNumber: function findByNumber(number, callback) {
    var options = {
      filterBy: ['tel'],
      filterOp: 'contains',
      filterValue: number
    };

    this._findOne(options, callback);
  },

  _findOne: function findOne(options, callback) {
    var mozContacts = navigator.mozContacts;
    if (mozContacts) {
      var request = mozContacts.find(options, callback);
      request.onsuccess = function findCallback() {
        if (request.result.length == 0) {
          callback(null);
          return;
        }

        var contacts = request.result;
        callback(contacts[0]);
      };
      request.onerror = function findError() {
        callback(null, request.error);
      };
    } else {
      callback(null);
    }
  }
};

