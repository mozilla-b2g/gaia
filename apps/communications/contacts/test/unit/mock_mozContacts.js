'use strict';

function MockMozContactsObj(contacts) {
  this.contacts = contacts;
}

MockMozContactsObj.prototype = {
  limit: 20,

  _getRequest: function(result) {
    function Req(result) {
      var self = this;
      Object.defineProperty(self, 'onsuccess', { set: function(cb) {
        self.result = result;
        cb({ target: self });
      }});
    }
    return new Req(result);
  },
  find: function find() {
    return this._getRequest(this.contacts);
  },
  total: 0,
  set number(n) {
    this.total = n;
  },
  getCount: function() {
    return this._getRequest(MockMozContacts.total);
  },
  getAll: function getAll() {
    return {
      set onsuccess(callback) {
        var count = 0;
        this.continue = function() {
          count++;
          var evt = {
            target: {}
          };
          if (count <= MockMozContacts.limit) {
            evt.target.result = {
              id: count,
              givenName: ['givenName ' + count],
              lastName: ['lastName ' + count]
            };
          }
          callback.call(this, evt);
        };

        var evt = {
          target: {
            result: {
              id: count,
              givenName: ['givenName ' + count],
              lastName: ['lastName ' + count]
            }
          }
        };
        callback.call(this, evt);
      },
      set onerror(callback) {

      }
    };
  },
  save: function save(ct) {
    this.contacts.push(ct);
    return {
      set onsuccess(callback) {
        var self = this;
        setTimeout(function() {
          callback.call(self);
        }, 10);
      },
      set onerror(callback) {

      }
    };
  },
  remove: function remove(ct) {
    var contactsIndex = this.contacts.indexOf(ct);
    if (contactsIndex > -1) {
      this.contacts.splice(contactsIndex, 1);
    }

    return {
      set onsuccess(callback) {
        callback();
      },
      set onerror(callback) {

      }
    };
  }
};

var MockMozContacts = new MockMozContactsObj([]);
