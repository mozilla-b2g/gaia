'use strict';

requireApp('sms/test/unit/mock_contact.js');
requireApp('sms/test/unit/mock_mozcontacts.js');
requireApp('sms/js/contacts.js');

suite('Contacts', function(done) {
  var nativeMozContacts = navigator.mozContacts;

  suiteSetup(function() {
    navigator.mozContacts = MockMozContacts;
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

  suite('Contacts.findByString, multi-term', function() {

    test('no predominate', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findByString('Pepito Grillo', function(contacts) {
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

      Contacts.findByString('Grillo Pepito', function(contacts) {
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

      Contacts.findByString('Pepi G', function(contacts) {
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

      Contacts.findByString('G Pepi', function(contacts) {
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

      Contacts.findByString('pepi g', function(contacts) {
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

      Contacts.findByString('g pepi', function(contacts) {
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
