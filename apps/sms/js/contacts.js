/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Contacts = {
  findBy: function contacts_findBy(filter, callback) {
    var request;

    if (!navigator.mozContacts) {
      return;
    }

    filter.filterLimit = filter.filterLimit || 10;

    request = navigator.mozContacts.find(filter);

    request.onsuccess = function onsuccess() {
      callback(this.result);
    };

    request.onerror = function onerror() {
      console.log('Contact finding error. Error: ' + this.error.name);
      callback(null);
    };
  },
  findByString: function contacts_findBy(filterValue, callback) {
    return this.findBy({
      filterBy: ['tel', 'givenName', 'familyName'],
      filterOp: 'contains',
      filterValue: filterValue
    }, callback);
  }
};
