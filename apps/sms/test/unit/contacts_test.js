/*global MockContact, Contacts, fb, MockFbReaderUtilsObj,
         MockSettings, MocksHelper */
'use strict';

require('/shared/test/unit/mocks/mock_moz_phone_number_service.js');
require('/shared/test/unit/mocks/mock_fb_reader_utils.js');
requireApp('sms/js/utils.js');
requireApp('sms/test/unit/mock_contact.js');
requireApp('sms/js/contacts.js');
require('/test/unit/mock_settings.js');
require('/test/unit/mock_utils.js');

var mocksHelperForContactsUnitTest = new MocksHelper([
  'Settings',
  'Utils'
]).init();

suite('Contacts', function(done) {
  mocksHelperForContactsUnitTest.attachTestHelpers();
  var nativeMozContacts = navigator.mozContacts;
  var realFb = window.fb;

  var targetFbNumber = '+34658789147';
  var fbContactName = 'Carlos Facebook';
  var targetLocalNumber = '+34698745123';
  var targetLocalEmail = 'a@b.com';
  var localContactName = 'Jose Local';
  var notFoundNumber = '+34633789102';
  var notFoundEmail = 'a@c.com';

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

                  if (filter.filterValue === targetLocalNumber ||
                      filter.filterValue === targetLocalEmail) {
                    return [{
                      name: [localContactName]
                    }];
                  }

                  if (filter.filterValue === targetFbNumber ||
                      filter.filterValue === notFoundNumber ||
                      filter.filterValue === notFoundEmail) {
                    return [];
                  }

                  // Supports two "no match" cases
                  if (filter.filterValue === '911' ||
                      filter.filterValue === 'wontmatch' ||
                      filter.filterValue === 'z@y.com') {
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

                  if (filter.filterValue === 'julien') {
                    return MockContact.list([
                      { givenName: ['Julien'] }
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

                  if (filter.filterValue === 'doozer') {
                    return MockContact.list([
                      { givenName: ['Jane'], familyName: ['Doozer'] }
                    ]);
                  }

                  if (filter.filterValue === 'mary') {
                    return MockContact.list([
                      { givenName: ['Mary Anne'], familyName: ['Jones'] }
                    ]);
                  }

                  // Fake error
                  if (filter.filterValue === 'callonerror') {
                    return null;
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

    var mockReaderUtils = new MockFbReaderUtilsObj();
    mockReaderUtils.targetFbNumber = targetFbNumber;
    mockReaderUtils.fbContactName = fbContactName;
    window.fb = mockReaderUtils;
  });

  teardown(function() {
    navigator.mozContacts.mHistory.length = 0;
  });

  suiteTeardown(function() {
    navigator.mozContacts = nativeMozContacts;
    window.fb = realFb;
  });

  suite('Contacts.findContactByString, single-term', function() {

    test('(string[tel,givenName,familyName], ...) Match', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findContactByString('O\'Hare', function(contacts) {
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

      Contacts.findContactByString('wontmatch', function(contacts) {
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

    test('(string[tel,email,givenName,familyName], ...) Match', function(done) {
      MockSettings.supportEmailRecipient = true;
      var mozContacts = navigator.mozContacts;

      Contacts.findContactByString('a@b.com', function(contacts) {
        done(function() {
          var mHistory = mozContacts.mHistory;

          // contacts were found
          assert.ok(Array.isArray(contacts));
          assert.equal(contacts.length, 1);

          // navigator.mozContacts.find was called?
          assert.equal(mHistory.length, 1);
          assert.equal(mHistory[0].filter.filterValue, 'a@b.com');
          assert.isNull(mHistory[0].request.error);
        });
      });
    });

    test('(string[tel,email,givenName,familyName], ...) No Match',
           function(done) {
      MockSettings.supportEmailRecipient = true;
      var mozContacts = navigator.mozContacts;

      Contacts.findContactByString('z@y.com', function(contacts) {
        done(function() {
          var mHistory = mozContacts.mHistory;

          // contacts were not found
          assert.ok(Array.isArray(contacts));
          assert.equal(contacts.length, 0);

          // navigator.mozContacts.find was called?
          assert.equal(mHistory.length, 1);
          assert.isNull(mHistory[0].request.error);
        });
      });
    });

    test('(string[tel], ...) Match', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findContactByString('+346578888888', function(contacts) {
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

      Contacts.findContactByString('911', function(contacts) {
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

  suite('Contacts.findContactByString, multi-term', function() {

    test('no predominate', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findContactByString('Pepito O\'Hare', function(contacts) {
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

      Contacts.findContactByString('O\'Hare Pepito', function(contacts) {
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

      Contacts.findContactByString('Pepi O', function(contacts) {
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

      Contacts.findContactByString('O Pepi', function(contacts) {
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

      Contacts.findContactByString('pepi o', function(contacts) {
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

      Contacts.findContactByString('o pepi', function(contacts) {
        var mHistory = mozContacts.mHistory;

        // No contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
        done();
      });
    });

    test('multi-word name', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findContactByString('mary anne', function(contacts) {
        var mHistory = mozContacts.mHistory;

        // No contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
        done();
      });
    });

    test('name first, part of tel number last', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findContactByString('Pepito 8888', function(contacts) {
        var mHistory = mozContacts.mHistory;

        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
        done();
      });
    });

    test('part of tel number first, name last', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findContactByString('8888 Pepito', function(contacts) {
        var mHistory = mozContacts.mHistory;

        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
        done();
      });
    });

    test('name first, part of email address last', function(done) {
      MockSettings.supportEmailRecipient = true;
      var mozContacts = navigator.mozContacts;

        Contacts.findByString('Pepito a@b', function(contacts) {
          done(function() {
          var mHistory = mozContacts.mHistory;

          // contacts were found
          assert.ok(Array.isArray(contacts));
          assert.equal(contacts.length, 1);

          // navigator.mozContacts.find was called?
          assert.equal(mHistory.length, 1);
        });
      });
    });

    test('part of email address first, name last', function(done) {
      MockSettings.supportEmailRecipient = true;
      var mozContacts = navigator.mozContacts;

      Contacts.findByString('a@b Pepito', function(contacts) {
        done(function() {
          var mHistory = mozContacts.mHistory;

          // contacts were found
          assert.ok(Array.isArray(contacts));
          assert.equal(contacts.length, 1);

          // navigator.mozContacts.find was called?
          assert.equal(mHistory.length, 1);
        });
      });
    });

    test('string search yields a contact without familyName', function(done) {
      Contacts.findContactByString('julien 123', function(contacts) {
        done();
      });
    });

    test('no matches, predominate first, upper', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findContactByString('Pepito S', function(contacts) {
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

      Contacts.findContactByString('S Pepito', function(contacts) {
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

      Contacts.findContactByString('pepi s', function(contacts) {
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

      Contacts.findContactByString('s pepi', function(contacts) {
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


  suite('Contacts.findExact', function() {
    test('yields a match ', function(done) {
      Contacts.findExact('jane doozer', function(contacts) {
        assert.equal(contacts.length, 1);
        done();
      });
    });

    test('yields no matches ', function(done) {
      Contacts.findExact('j doozer', function(contacts) {
        assert.equal(contacts.length, 0);
        done();
      });
    });
  });

  suite('Contacts.findByPhoneNumber', function() {

    test('removes spaces', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findByPhoneNumber('+33 1 23 45 67 89', function(contacts) {
        assert.equal(
          mozContacts.mHistory[0].filter.filterValue, '+33123456789'
        );
        done();
      });
    });

    test('The mozContacts find() call returned an error', function(done) {
      Contacts.findByPhoneNumber('callonerror', function(contacts) {
        assert.equal(contacts.length, 0);
        done();
      });
    });

    test('Local number found.', function(done) {
      Contacts.findByPhoneNumber(targetLocalNumber, function(contacts) {
        assert.equal(contacts.length, 1);
        assert.isTrue(!contacts[0].isFbContact);
        assert.equal(contacts[0].name[0], localContactName);
        done();
      });
    });

    test('Local number not found. FB Number found', function(done) {
      Contacts.findByPhoneNumber(targetFbNumber, function(contacts) {
        assert.equal(contacts.length, 1);
        assert.equal(contacts[0].name[0], fbContactName);
        assert.equal(contacts[0].isFbContact, true);
        done();
      });
    });

    test('Local number not found. FB Number not found either', function(done) {
      Contacts.findByPhoneNumber(notFoundNumber, function(contacts) {
        assert.equal(contacts.length, 0);
        done();
      });
    });

    test('Local number not found. FB returns error', function(done) {
      fb.inError = true;

      Contacts.findByPhoneNumber(targetFbNumber, function(contacts) {
        assert.equal(contacts.length, 0);
        delete window.fb.inError;
        done();
      });
    });
  });

  suite('Contacts.addUnknown', function() {

    test('For adding an unknown contact', function() {
      var length = Contacts.getunknownLength();
      Contacts.addUnknown('123456');

      assert.equal(length + 1, Contacts.getunknownLength());
    });

    test('For not adding the duplicate unknown contact', function() {
      var length = Contacts.getunknownLength();

      Contacts.addUnknown('123456');
      assert.equal(length, Contacts.getunknownLength());
    });
  });

  suite('Contacts.clearUnknown', function() {

    test('For clearing unknown contact', function() {
      Contacts.clearUnknown();
      var length = Contacts.getunknownLength();

      assert.equal(length, 0);
    });
  });

  suite('Contacts.findByUnknown function', function() {

    setup(function() {
      Contacts.clearUnknown();
      Contacts.addUnknown('123123456');
      Contacts.addUnknown('789789789');
      Contacts.addUnknown('456456456');
      Contacts.addUnknown('123456789');
    });

    test('checking single unknown contact using substring', function() {

      Contacts.findByUnknown('6456', function callback(list) {
        assert.equal(list[0].name == '456456456', true);
        assert.equal(list.length, 1);
      });
    });

    test('checking multiple unknown contact using substring', function() {

      Contacts.findByUnknown('456', function callback(list) {
        assert.equal(list[0].name == '123123456', true);
        assert.equal(list[1].name == '456456456', true);
        assert.equal(list[2].name == '123456789', true);
        assert.equal(list.length, 3);//List can have at max 3 unknown elements
      });
    });

    test('checking multiple unknown contact using fullstring', function() {

      Contacts.findByUnknown('456456456', function callback(list) {
        assert.equal(list[0].name == '456456456', true);
        assert.equal(list.length, 1);
      });
    });

    test('checking unknown contact after clearUnknown', function() {
      Contacts.clearUnknown();

      Contacts.findByUnknown('456', function callback(list) {
        assert.equal(list.length, 0);
      });
    });

    test('Unknown List cannot have more than 3 prediction', function() {
      Contacts.clearUnknown();
      Contacts.addUnknown('123123456');
      Contacts.addUnknown('789123789');
      Contacts.addUnknown('456456123');
      Contacts.addUnknown('123456789');

      Contacts.findByUnknown('123', function callback(list) {
        //Prediction should had been 4 but since we restict it to a max of 3
        assert.equal(list.length, 3);
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
      Contacts.findBy({}, function(contacts) {
        assert.equal(contacts, null);
        done();
      });
    });
  });

  suite('Contacts validation', function() {
    test('Contact validation, predominate first', function(done) {
      Contacts.findContactByString('jane d', function(contacts) {
        var mozContacts = navigator.mozContacts;

        // contacts were not found
        assert.ok(Array.isArray(contacts));
        // This was relaxed by the change from "startsWith" to "contains"
        assert.equal(contacts.length, 4);

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
      Contacts.findContactByString('j do', function(contacts) {
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
