'use strict';

var MockMozContacts = {
  limit: 20,
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
  }
};
