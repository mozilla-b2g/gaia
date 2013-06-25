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
          // make a "copy" of the filter object
          filter: Object.keys(filter).reduce(function(copy, key) {
            return (copy[key] = filter[key]) && copy;
          }, {}),
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
              if (callback !== null) {
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

                  if (filter.filterValue === 'jane') {
                    return MockContact.list([
                      // true
                      { givenName: ['Jane'], familyName: ['D'] },
                      // false
                      { givenName: ['jane'], familyName: ['austen'] },
                      // true
                      { givenName: ['jane'], familyName: ['doe'] },
                      // false
                      { givenName: ['jane'], familyName: ['fonda'] },
                      // true
                      { givenName: ['jane'], familyName: ['dow'] },
                      // false
                      { givenName: ['janet'], familyName: [''] }
                    ]);
                  }

                  if (filter.filterValue === 'do') {
                    return MockContact.list([
                      // true
                      { givenName: ['Jane'], familyName: ['Doozer'] },
                      // false
                      { givenName: ['doug'], familyName: ['dooley'] },
                      // true
                      { givenName: ['jane'], familyName: ['doe'] },
                      // false
                      { givenName: ['jerry'], familyName: ['doe'] },
                      // true
                      { givenName: ['j'], familyName: ['dow'] },
                      // true
                      { givenName: ['john'], familyName: ['doland'] }
                    ]);
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
            }
          },

          onerror: {
            set: function(callback) {
              onerror = callback;
              if (callback !== null) {
                if (this.result === null && this.error !== null) {
                  setTimeout(function() {
                    onerror.call(this);
                    onerror = null;
                  }.bind(this), 0);
                }
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

  suite('Contacts.findByString, single-term', function() {

    test('(string[tel,givenName,familyName], ...) Match', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findByString('O\'Hare', function(contacts) {
        var mHistory = mozContacts.mHistory;

        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
        assert.equal(mHistory[0].filter.filterValue, 'O\'Hare');
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

  suite('Contacts.findByString, multi-term', function() {

    test('no predominate', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findByString('Pepito O\'Hare', function(contacts) {
        var mHistory = mozContacts.mHistory;
        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
        done();
      });
    });

    test('no predominate, reversed', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findByString('O\'Hare Pepito', function(contacts) {
        var mHistory = mozContacts.mHistory;

        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
        done();
      });
    });

    test('predominate first, upper', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findByString('Pepi O', function(contacts) {
        var mHistory = mozContacts.mHistory;

        // No contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
        done();
      });
    });

    test('predominate last, upper', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findByString('O Pepi', function(contacts) {
        var mHistory = mozContacts.mHistory;

        // No contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
        done();
      });
    });


    test('predominate first, lower', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findByString('pepi o', function(contacts) {
        var mHistory = mozContacts.mHistory;

        // No contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
        done();
      });
    });

    test('predominate last, lower', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findByString('o pepi', function(contacts) {
        var mHistory = mozContacts.mHistory;

        // No contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
        done();
      });
    });

    test('no matches, predominate first, upper', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findByString('Pepito S', function(contacts) {
        var mHistory = mozContacts.mHistory;

        // No contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 0);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
        done();
      });
    });

    test('no matches, predominate last, upper', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findByString('S Pepito', function(contacts) {
        var mHistory = mozContacts.mHistory;

        // No contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 0);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
        done();
      });
    });

    test('no matches, predominate first, lower', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findByString('pepi s', function(contacts) {
        var mHistory = mozContacts.mHistory;

        // No contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 0);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
        done();
      });
    });

    test('no matches, predominate last, lower', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findByString('s pepi', function(contacts) {
        var mHistory = mozContacts.mHistory;

        // No contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 0);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
        done();
      });
    });
  });

  suite('Contacts.findBy (success)', function() {

    test('(object, ...), Match', function(done) {
      var mozContacts = navigator.mozContacts;
      var filter = {
        filterBy: ['tel'],
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
        filterBy: ['tel'],
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
        done();
      });
    });
  });

  suite('Contacts validation', function() {
    test('Contact validation, predominate first', function(done) {
      Contacts.findByString('jane d', function(contacts) {
        var mozContacts = navigator.mozContacts;

        // contacts were not found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 3);

        /**
         * The three matching contacts are:
         *
         * { givenName: ['Jane'], familyName: ['D'] }
         * { givenName: ['jane'], familyName: ['doe'] }
         * { givenName: ['jane'], familyName: ['dow'] }
         *
         */

        // navigator.mozContacts.find was called?
        assert.equal(mozContacts.mHistory.length, 1);
        assert.deepEqual(mozContacts.mHistory[0].filter.filterValue, 'jane');

        done();
      });
    });

    test('Contact validation, predominate last', function(done) {
      Contacts.findByString('j do', function(contacts) {
        var mozContacts = navigator.mozContacts;

        // contacts were not found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 5);

        /**
         * The five matching contacts are:
         *
         * { givenName: ['Jane'], familyName: ['Doozer'] }
         * { givenName: ['jane'], familyName: ['doe'] }
         * { givenName: ['jerry'], familyName: ['doe'] }
         * { givenName: ['j'], familyName: ['dow'] }
         * { givenName: ['john'], familyName: ['doland'] }
         *
         */

        // navigator.mozContacts.find was called?
        assert.equal(mozContacts.mHistory.length, 1);
        assert.deepEqual(mozContacts.mHistory[0].filter.filterValue, 'do');

        done();
      });
    });
  });
});
