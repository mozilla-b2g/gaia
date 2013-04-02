'use strict';

requireApp('sms/test/unit/mock_contact.js');
requireApp('sms/js/contacts.js');

suite('Contacts', function(done) {
  var nativeMozContacts = navigator.mozContacts;

  suiteSetup(function() {
    // Do not use the native API.
    navigator.mozContacts = {
      mHistory: [],
      find: function(filter) {
        // attribute DOMString     filterValue;    // e.g. "Tom"
        // attribute DOMString     filterOp;       // e.g. "contains"
        // attribute DOMString[]   filterBy;       // e.g. "givenName"
        // attribute DOMString     sortBy;         // e.g. "givenName"
        // attribute DOMString     sortOrder;      // e.g. "descending"
        // attribute unsigned long filterLimit;
        if (!(this instanceof navigator.mozContacts.find)) {
          return new navigator.mozContacts.find(filter);
        }
        var onsuccess, onerror;

        navigator.mozContacts.mHistory.push({
          filter: filter,
          request: this
        });

        this.result = null;
        this.error = null;

        Object.defineProperties(this, {

          onsuccess: {
            // When the success handler gets assigned:
            //  1. Set this.result to an array containing a MockContact instance
            //  2. Immediately call the success handler
            // This will behave like a _REALLY_ fast DB query
            set: function(callback) {
              onsuccess = callback;
              // Implement a mock that gives results that appear to
              // match the real behaviour of filtered contacts results
              this.result = (function() {
                // Supports the error case
                if (filter == null ||
                      (!filter.filterOp || !filter.filterValue)) {
                  return null;
                }

                // Supports two "no match" cases
                if (filter.filterValue === '911' ||
                    filter.filterValue === 'wontmatch') {
                  return [];
                }

                // All other cases
                return MockContact.list();
              }());

              if (this.result === null) {
                this.error = {
                  name: 'Mock missing filter params'
                };
                if (onerror) {
                  setTimeout(function() {
                    onerror.call(this);
                    onerror = null;
                  }.bind(this), 0);
                }
              } else {
                setTimeout(function() {
                  onsuccess.call(this);
                  onsuccess = null;
                }.bind(this), 0);
              }
            }
          },

          onerror: {
            set: function(callback) {
              onerror = callback;
              if (this.result === null && this.error !== null) {
                setTimeout(function() {
                  onerror.call(this);
                  onerror = null;
                }.bind(this), 0);
              }
            }
          }
        });
      }
    };
  });

  teardown(function() {
    navigator.mozContacts.mHistory.length = 0;
  });

  suiteTeardown(function() {
    navigator.mozContacts = nativeMozContacts;
  });

  suite('Contacts.findByString (success)', function() {

    test('(string[tel,givenName,familyName], ...) Match', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findByString('Grillo', function(contacts) {
        var mHistory = mozContacts.mHistory;

        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
        assert.equal(mHistory[0].filter.filterValue, 'Grillo');
        assert.isNull(mHistory[0].request.error);

        done();
      });
    });

    test('(string[tel,givenName,familyName], ...) No Match', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findByString('wontmatch', function(contacts) {
        var mHistory = mozContacts.mHistory;

        // contacts were not found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 0);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
        assert.isNull(mHistory[0].request.error);

        done();
      });
    });


    test('(string[tel], ...) Match', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findByString('+346578888888', function(contacts) {
        var mHistory = mozContacts.mHistory;

        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
        assert.equal(mHistory[0].filter.filterValue, '+346578888888');
        assert.isNull(mHistory[0].request.error);

        done();
      });
    });


    test('(string[tel], ...) No Match', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findByString('911', function(contacts) {
        var mHistory = mozContacts.mHistory;

        // contacts were not found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 0);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
        assert.equal(mHistory[0].filter.filterValue, '911');
        assert.isNull(mHistory[0].request.error);

        done();
      });
    });
  });

  suite('Contacts.findBy (success)', function() {

    test('(object, ...), Match', function(done) {
      var mozContacts = navigator.mozContacts;
      var filter = {
        findBy: ['tel'],
        filterOp: 'contains',
        filterValue: '12125559999'
      };

      Contacts.findBy(filter, function(contacts) {
        var mHistory = mozContacts.mHistory;

        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);

        // navigator.mozContacts.find was called?
        assert.equal(mozContacts.mHistory.length, 1);
        assert.deepEqual(mozContacts.mHistory[0].filter, filter);
        assert.isNull(mHistory[0].request.error);

        done();
      });
    });

    test('(object, ...), No Match', function(done) {
      var mozContacts = navigator.mozContacts;
      var filter = {
        findBy: ['tel'],
        filterOp: 'contains',
        filterValue: '911'
      };

      Contacts.findBy(filter, function(contacts) {
        var mHistory = mozContacts.mHistory;

        // contacts were not found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 0);

        // navigator.mozContacts.find was called?
        assert.equal(mozContacts.mHistory.length, 1);
        assert.deepEqual(mozContacts.mHistory[0].filter, filter);
        assert.isNull(mHistory[0].request.error);

        done();
      });
    });
  });

  suite('Contacts.findBy (error)', function() {
    // This test will print:
    // "Contact finding error. Error: Mock missing filter params"
    // to the console
    test('({}, ...)', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findBy({}, function(contacts) {
        var mHistory = mozContacts.mHistory;
        assert.equal(contacts, null);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
        assert.isNotNull(mHistory[0].request.error);

        done();
      });
    });
  });
});
