'use strict';

var MockMozContacts;

function MockMozContactsObj(contacts) {
  this.contacts = contacts;
}

MockMozContactsObj.prototype = {
  limit: 20,

  _getRequest: function(options) {
    var that = this;
    function Req(options) {
      var self = this;
      Object.defineProperty(self, 'onsuccess', { set: function(cb) {
        if (options.type === 'find') {
          if (options.data.filterBy &&
            options.data.filterBy.indexOf('id') !== -1) {
            if (that.limit > options.data.filterValue) {
              var count = options.data.filterValue;
              self.result = {
                id: count,
                givenName: ['givenName ' + count],
                familyName: ['familyName ' + count]
              };
            }
          } else {
            self.result = that.contacts;
          }
        } else {
          self.result = options.data;
        }
        cb.call(self, { target: self });
      }});
    }
    return new Req(options);
  },
  find: function find(filter) {
    return this._getRequest({
      type: 'find',
      data: filter
    });
  },
  total: 0,
  set number(n) {
    this.total = n;
  },
  getCount: function() {
    return this._getRequest({
      type: 'count',
      data: MockMozContacts.total
    });
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
          if (count < MockMozContacts.limit) {
            evt.target.result = {
              id: count,
              givenName: ['givenName ' + count],
              familyName: ['familyName ' + count]
            };
          }
          this.result = evt.target.result;
          callback.call(this, evt);
        };

        if (0 === MockMozContacts.limit) {
          callback.call(this, null);
          return ;
        }
        var evt = {
          target: {
            result: {
              id: count,
              givenName: ['givenName ' + count],
              familyName: ['familyName ' + count]
            }
          }
        };
        this.result = evt.target.result;
        callback.call(this, evt);
      },
      set onerror(callback) {

      }
    };
  },
  save: function save(ct) {
    ct.id = this.contacts.length;
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
  getRevision: function(callback) {
    return 'fakeRevision';
  },

  setContacts: function(contacts) {
    this.contacts = contacts;
  },

  remove: function remove(ct) {
    var contactsIndex = this.contacts.indexOf(ct);
    if (contactsIndex > -1) {
      this.contacts.splice(contactsIndex, 1);
    }

    return {
      set onsuccess(callback) {
        var self = this;
        setTimeout(function() {
          callback.call(self);
        }, 0);
      },
      set onerror(callback) {

      }
    };
  },

  clear: function clear() {
    this.contacts.splice(0, this.contacts.length);
  }
};

MockMozContacts = new MockMozContactsObj([]);
