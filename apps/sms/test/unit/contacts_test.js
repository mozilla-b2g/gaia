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

        navigator.mozContacts.mHistory.push({
          // make a "copy" of the filter object
          filter: Object.keys(filter).reduce(function(copy, key) {
            return (copy[key] = filter[key]) && copy;
          }, {})
        });

        // default value
        var result = MockContact.list();

        // Supports the error case
        if (filter == null ||
            (!filter.filterOp || !filter.filterValue)) {
          result = null;
        }

        if (filter.filterValue === targetLocalNumber ||
            filter.filterValue === targetLocalEmail) {
          result = [{
            name: [localContactName]
          }];
        }

        if (filter.filterValue === targetFbNumber ||
            filter.filterValue === notFoundNumber ||
              filter.filterValue === notFoundEmail) {
          result = [];
        }

        // Supports two "no match" cases
        if (filter.filterValue === '911' ||
            filter.filterValue === 'wontmatch' ||
              filter.filterValue === 'z@y.com') {
          result = [];
        }

        if (filter.filterValue === 'jane') {
          result = MockContact.list([
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
          result = MockContact.list([
            { givenName: ['Julien'] }
          ]);
        }

        if (filter.filterValue === 'do') {
          result = MockContact.list([
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
          result = MockContact.list([
            { givenName: ['Jane'], familyName: ['Doozer'] }
          ]);
        }

        if (filter.filterValue === 'mary') {
          result = MockContact.list([
            { givenName: ['Mary Anne'], familyName: ['Jones'] }
          ]);
        }

        if (filter.filterValue === 'callonerror') {
          result = null;
        }

        // All other cases

        if (result === null) {
          return Promise.reject(
            new Error('Mock missing filter params')
          );
        }

        return Promise.resolve(result);
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

      Contacts.findContactByString('O\'Hare').then(function(contacts) {
        var mHistory = mozContacts.mHistory;

        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
        assert.equal(mHistory[0].filter.filterValue, 'O\'Hare');
      }).then(done, done);
    });

    test('(string[tel,givenName,familyName], ...) No Match', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findContactByString('wontmatch').then(function(contacts) {
        var mHistory = mozContacts.mHistory;

        // contacts were not found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 0);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
      }).then(done, done);
    });

    test('(string[tel,email,givenName,familyName], ...) Match', function(done) {
      MockSettings.supportEmailRecipient = true;
      var mozContacts = navigator.mozContacts;

      Contacts.findContactByString('a@b.com').then(function(contacts) {
        var mHistory = mozContacts.mHistory;

        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
        assert.equal(mHistory[0].filter.filterValue, 'a@b.com');
      }).then(done, done);
    });

    test('(string[tel,email,givenName,familyName], ...) No Match',
           function(done) {
      MockSettings.supportEmailRecipient = true;
      var mozContacts = navigator.mozContacts;

      Contacts.findContactByString('z@y.com').then(function(contacts) {
        var mHistory = mozContacts.mHistory;

        // contacts were not found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 0);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
      }).then(done, done);
    });

    test('(string[tel], ...) Match', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findContactByString('+346578888888').then(function(contacts) {
        var mHistory = mozContacts.mHistory;

        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
        assert.equal(mHistory[0].filter.filterValue, '+346578888888');
      }).then(done, done);
    });

    test('(string[tel], ...) No Match', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findContactByString('911').then(function(contacts) {
        var mHistory = mozContacts.mHistory;

        // contacts were not found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 0);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
        assert.equal(mHistory[0].filter.filterValue, '911');
      }).then(done, done);
    });
  });

  suite('Contacts.findContactByString, multi-term', function() {

    test('no predominate', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findContactByString('Pepito O\'Hare').then(function(contacts) {
        var mHistory = mozContacts.mHistory;
        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
      }).then(done, done);
    });

    test('no predominate, reversed', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findContactByString('O\'Hare Pepito').then(function(contacts) {
        var mHistory = mozContacts.mHistory;

        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
      }).then(done, done);
    });

    test('predominate first, upper', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findContactByString('Pepi O').then(function(contacts) {
        var mHistory = mozContacts.mHistory;

        // No contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
      }).then(done, done);
    });

    test('predominate last, upper', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findContactByString('O Pepi').then(function(contacts) {
        var mHistory = mozContacts.mHistory;

        // No contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
      }).then(done, done);
    });


    test('predominate first, lower', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findContactByString('pepi o').then(function(contacts) {
        var mHistory = mozContacts.mHistory;

        // No contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
      }).then(done, done);
    });

    test('predominate last, lower', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findContactByString('o pepi').then(function(contacts) {
        var mHistory = mozContacts.mHistory;

        // No contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
      }).then(done, done);
    });

    test('multi-word name', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findContactByString('mary anne').then(function(contacts) {
        var mHistory = mozContacts.mHistory;

        // No contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
      }).then(done, done);
    });

    test('name first, part of tel number last', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findContactByString('Pepito 8888').then(function(contacts) {
        var mHistory = mozContacts.mHistory;

        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
      }).then(done, done);
    });

    test('part of tel number first, name last', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findContactByString('8888 Pepito').then(function(contacts) {
        var mHistory = mozContacts.mHistory;

        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
      }).then(done, done);
    });

    test('name first, part of email address last', function(done) {
      MockSettings.supportEmailRecipient = true;
      var mozContacts = navigator.mozContacts;

      Contacts.findByString('Pepito a@b').then(function(contacts) {
        var mHistory = mozContacts.mHistory;

        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
      }).then(done, done);
    });

    test('part of email address first, name last', function(done) {
      MockSettings.supportEmailRecipient = true;
      var mozContacts = navigator.mozContacts;

      Contacts.findByString('a@b Pepito').then(function(contacts) {
        var mHistory = mozContacts.mHistory;

        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
      }).then(done, done);
    });

    test('string search yields a contact without familyName', function(done) {
      Contacts.findContactByString('julien 123').then((contacts) => {
        // "julien" yields a result that has only a givenName, no familyName.
        // This test checks that our algorithm works also in such cases.
        // See Bug 952533
        assert.isNotNull(contacts);
        assert.lengthOf(contacts, 0);
      }).then(done, done);
    });

    test('no matches, predominate first, upper', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findContactByString('Pepito S').then(function(contacts) {
        var mHistory = mozContacts.mHistory;

        // No contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 0);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
      }).then(done, done);
    });

    test('no matches, predominate last, upper', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findContactByString('S Pepito').then(function(contacts) {
        var mHistory = mozContacts.mHistory;

        // No contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 0);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
      }).then(done, done);
    });

    test('no matches, predominate first, lower', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findContactByString('pepi s').then(function(contacts) {
        var mHistory = mozContacts.mHistory;

        // No contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 0);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
      }).then(done, done);
    });

    test('no matches, predominate last, lower', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findContactByString('s pepi').then(function(contacts) {
        var mHistory = mozContacts.mHistory;

        // No contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 0);

        // navigator.mozContacts.find was called?
        assert.equal(mHistory.length, 1);
      }).then(done, done);
    });
  });


  suite('Contacts.findExact', function() {
    test('yields a match ', function(done) {
      Contacts.findExact('jane doozer').then(function(contacts) {
        assert.equal(contacts.length, 1);
      }).then(done, done);
    });

    test('yields no matches ', function(done) {
      Contacts.findExact('j doozer').then(function(contacts) {
        assert.equal(contacts.length, 0);
      }).then(done, done);
    });
  });

  suite('Contacts.findByPhoneNumber', function() {

    test('removes spaces', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findByPhoneNumber('+33 1 23 45 67 89').then(function(contacts){
        assert.equal(
          mozContacts.mHistory[0].filter.filterValue, '+33123456789'
        );
      }).then(done, done);
    });

    test('The mozContacts find() call returned an error', function(done) {
      Contacts.findByPhoneNumber('callonerror').then(
        () => done(new Error('The promise should be rejected.')),
        () => done()
      );
    });

    test('Local number found.', function(done) {
      Contacts.findByPhoneNumber(targetLocalNumber).then(function(contacts) {
        assert.equal(contacts.length, 1);
        assert.isTrue(!contacts[0].isFbContact);
        assert.equal(contacts[0].name[0], localContactName);
      }).then(done, done);
    });

    test('Local number not found. FB Number found', function(done) {
      Contacts.findByPhoneNumber(targetFbNumber).then(function(contacts) {
        assert.equal(contacts.length, 1);
        assert.equal(contacts[0].name[0], fbContactName);
        assert.equal(contacts[0].isFbContact, true);
      }).then(done, done);
    });

    test('Local number not found. FB Number not found either', function(done) {
      Contacts.findByPhoneNumber(notFoundNumber).then(function(contacts) {
        assert.equal(contacts.length, 0);
      }).then(done, done);
    });

    test('Local number not found. FB returns error', function(done) {
      fb.inError = true;

      Contacts.findByPhoneNumber(targetFbNumber).then(function(contacts) {
        assert.equal(contacts.length, 0);
        delete window.fb.inError;
      }).then(done, done);
    });
  });

  suite('Contacts.findByAddress', function() {

    test('removes spaces', function(done) {
      var mozContacts = navigator.mozContacts;

      Contacts.findByAddress('+33 1 23 45 67 89').then(function(contacts) {
        assert.equal(
          mozContacts.mHistory[0].filter.filterValue, '+33123456789'
        );
      }).then(done, done);
    });

    test('The mozContacts find() call returned an error', function(done) {
      Contacts.findByAddress('callonerror').then(
        () => done(new Error('The promise should be rejected.')),
        () => done()
      );
    });

    test('Local number found.', function(done) {
      Contacts.findByAddress(targetLocalNumber).then(function(contacts) {
          assert.equal(contacts.length, 1);
          assert.isTrue(!contacts[0].isFbContact);
          assert.equal(contacts[0].name[0], localContactName);
      }).then(done, done);
    });

    test('Local email found.', function(done) {
      Contacts.findByAddress(targetLocalEmail).then(function(contacts) {
        assert.equal(contacts.length, 1);
        assert.isTrue(!contacts[0].isFbContact);
        assert.equal(contacts[0].name[0], localContactName);
      }).then(done, done);
    });

    test('Local number not found. FB Number found', function(done) {
      Contacts.findByAddress(targetFbNumber).then(function(contacts) {
        assert.equal(contacts.length, 1);
        assert.equal(contacts[0].name[0], fbContactName);
        assert.equal(contacts[0].isFbContact, true);
      }).then(done, done);
    });

    test('Local number not found. FB Number not found either', function(done) {
      Contacts.findByAddress(notFoundNumber).then(function(contacts) {
        assert.equal(contacts.length, 0);
      }).then(done, done);
    });

    test('Local email not found. FB Number not found either', function(done) {
      Contacts.findByAddress(notFoundEmail).then(function(contacts) {
        assert.equal(contacts.length, 0);
      }).then(done, done);
    });

    test('Local number not found. FB returns error', function(done) {
      fb.inError = true;

      Contacts.findByAddress(targetFbNumber).then(function(contacts) {
        assert.equal(contacts.length, 0);
        delete window.fb.inError;
      }).then(done, done);
    });
  });

  suite('Contacts.findExactByEmail', function() {

    test('Local email found.', function(done) {
      Contacts.findExactByEmail(targetLocalEmail).then(function(contacts) {
        assert.equal(contacts.length, 1);
        assert.isTrue(!contacts[0].isFbContact);
        assert.equal(contacts[0].name[0], localContactName);
      }).then(done, done);
    });

    test('Local email not found. FB Email not found either', function(done) {
      Contacts.findExactByEmail(notFoundEmail).then(function(contacts) {
        assert.equal(contacts.length, 0);
      }).then(done, done);
    });

    test('Local email not found. FB returns error', function(done) {
      fb.inError = true;

      Contacts.findExactByEmail(targetLocalEmail).then(function(contacts) {
        assert.equal(contacts.length, 1);
        delete window.fb.inError;
      }).then(done, done);
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

    test('checking single unknown contact using substring', function(done) {

      Contacts.findByUnknown('6456').then(function(list) {
        assert.equal(list[0].name == '456456456', true);
        assert.equal(list.length, 1);
      }).then(done, done);
    });

    test('checking multiple unknown contact using substring', function(done) {

      Contacts.findByUnknown('456').then(function(list) {
        assert.equal(list[0].name == '123123456', true);
        assert.equal(list[1].name == '456456456', true);
        assert.equal(list[2].name == '123456789', true);
        assert.equal(list.length, 3);//List can have at max 3 unknown elements
      }).then(done, done);
    });

    test('checking multiple unknown contact using fullstring', function(done) {

      Contacts.findByUnknown('456456456').then(function(list) {
        assert.equal(list[0].name == '456456456', true);
        assert.equal(list.length, 1);
      }).then(done, done);
    });

    test('checking unknown contact after clearUnknown', function(done) {
      Contacts.clearUnknown();

      Contacts.findByUnknown('456').then(function(list) {
        assert.equal(list.length, 0);
      }).then(done, done);
    });

    test('Unknown List cannot have more than 3 prediction', function(done) {
      Contacts.clearUnknown();
      Contacts.addUnknown('123123456');
      Contacts.addUnknown('789123789');
      Contacts.addUnknown('456456123');
      Contacts.addUnknown('123456789');

      Contacts.findByUnknown('123').then(function(list) {
        //Prediction should had been 4 but since we restict it to a max of 3
        assert.equal(list.length, 3);
      }).then(done, done);
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

      Contacts.findBy(filter).then(function(contacts) {
        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);

        // navigator.mozContacts.find was called?
        assert.equal(mozContacts.mHistory.length, 1);
        assert.deepEqual(mozContacts.mHistory[0].filter, filter);
      }).then(done, done);
    });

    test('(object, ...), No Match', function(done) {
      var mozContacts = navigator.mozContacts;
      var filter = {
        filterBy: ['tel'],
        filterOp: 'contains',
        filterValue: '911'
      };

      Contacts.findBy(filter).then(function(contacts) {
        // contacts were not found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 0);

        // navigator.mozContacts.find was called?
        assert.equal(mozContacts.mHistory.length, 1);
        assert.deepEqual(mozContacts.mHistory[0].filter, filter);
      }).then(done, done);
    });
  });

  suite('Contacts.findBy (error)', function() {
    // This test will print:
    // "Contact finding error. Error: Mock missing filter params"
    // to the console
    test('({}, ...)', function(done) {
      Contacts.findBy({}).then(function(contacts) {
        assert.equal(contacts, null);
      }).then(done, done);
    });
  });

  suite('Contacts validation', function() {
    test('Contact validation, predominate first', function(done) {
      Contacts.findContactByString('jane d').then(function(contacts) {
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
      }).then(done, done);
    });

    test('Contact validation, predominate last', function(done) {
      Contacts.findContactByString('j do').then(function(contacts) {
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
      }).then(done, done);
    });
  });
});
