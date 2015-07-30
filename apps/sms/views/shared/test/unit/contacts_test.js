/*global MockContact, Contacts, fb, MockFbReaderUtilsObj,
         MockSettings, MocksHelper */
'use strict';

require('/shared/test/unit/mocks/mock_moz_phone_number_service.js');
require('/shared/test/unit/mocks/mock_fb_reader_utils.js');
require('/views/shared/js/utils.js');
require('/views/shared/test/unit/mock_contact.js');
require('/views/shared/js/contacts.js');
require('/views/shared/test/unit/mock_settings.js');
require('/views/shared/test/unit/mock_utils.js');

var mocksHelperForContactsUnitTest = new MocksHelper([
  'Settings',
  'Utils'
]).init();

function withFilter(str) {
  return sinon.match( { filterValue: str } );
}

suite('Contacts', function(done) {
  mocksHelperForContactsUnitTest.attachTestHelpers();
  var realFb = window.fb;

  var targetFbNumber = '+34658789147';
  var fbContactName = 'Carlos Facebook';
  var targetLocalNumber = '+34698745123';
  var targetLocalEmail = 'a@b.com';
  var localContactName = 'Jose Local';
  var notFoundNumber = '+34633789102';
  var notFoundEmail = 'a@c.com';

  suiteSetup(function() {
    var mockReaderUtils = new MockFbReaderUtilsObj();
    mockReaderUtils.targetFbNumber = targetFbNumber;
    mockReaderUtils.fbContactName = fbContactName;
    window.fb = mockReaderUtils;
  });

  setup(function(){
    // Do not use the Native API
    this.sinon.stub(navigator.mozContacts, 'find');
  });

  suiteTeardown(function() {
    window.fb = realFb;
  });

  suite('Contacts.findContactByString, single-term', function() {

    test('(string[tel,givenName,familyName], ...) Match', function(done) {
      var result = MockContact.list();

      navigator.mozContacts.find.withArgs(
        withFilter('O\'Hare')
      ).returns(
        Promise.resolve(result)
      );

      Contacts.findContactByString('O\'Hare').then(function(contacts) {
        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);
      }).then(done, done);
    });

    test('(string[tel,givenName,familyName], ...) No Match', function(done) {
      navigator.mozContacts.find.withArgs(
        withFilter('wontmatch')
      ).returns(
        Promise.resolve([])
      );

      Contacts.findContactByString('wontmatch').then(function(contacts) {
        // contacts were not found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 0);
      }).then(done, done);
    });

    test('(string[tel,email,givenName,familyName], ...) Match', function(done) {
      MockSettings.supportEmailRecipient = true;
      var result = MockContact.list();

      navigator.mozContacts.find.withArgs(
        withFilter('a@b.com')
      ).returns(
        Promise.resolve(result)
      );

      Contacts.findContactByString('a@b.com').then(function(contacts) {
        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);
      }).then(done, done);
    });

    test('(string[tel,email,givenName,familyName], ...) No Match',
           function(done) {
      MockSettings.supportEmailRecipient = true;

      navigator.mozContacts.find.withArgs(
        withFilter('z@y.com')
      ).returns(
        Promise.resolve([])
      );

      Contacts.findContactByString('z@y.com').then(function(contacts) {
        // contacts were not found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 0);
      }).then(done, done);
    });

    test('(string[tel], ...) Match', function(done) {
      var result = MockContact.list();

      navigator.mozContacts.find.withArgs(
        withFilter('+346578888888')
      ).returns(
        Promise.resolve(result)
      );

      Contacts.findContactByString('+346578888888').then(function(contacts) {
        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);
      }).then(done, done);
    });

    test('(string[tel], ...) No Match', function(done) {
      navigator.mozContacts.find.withArgs(
        withFilter('911')
      ).returns(
        Promise.resolve([])
      );

      Contacts.findContactByString('911').then(function(contacts) {
        // contacts were not found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 0);
      }).then(done, done);
    });
  });

  suite('Contacts.findContactByString, multi-term', function() {

    test('no predominate', function(done) {
      var result = MockContact.list();

      navigator.mozContacts.find.withArgs(
        withFilter('Pepito')
      ).returns(
        Promise.resolve(result)
      );

      Contacts.findContactByString('Pepito O\'Hare').then(function(contacts) {
        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);
      }).then(done, done);
    });

    test('no predominate, reversed', function(done) {
      var result = MockContact.list();

      navigator.mozContacts.find.withArgs(
        withFilter('O\'Hare')
      ).returns(
        Promise.resolve(result)
      );

      Contacts.findContactByString('O\'Hare Pepito').then(function(contacts) {
        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);
      }).then(done, done);
    });

    test('predominate first, upper', function(done) {
      var result = MockContact.list();

      navigator.mozContacts.find.withArgs(
        withFilter('Pepi')
      ).returns(
        Promise.resolve(result)
      );

      Contacts.findContactByString('Pepi O').then(function(contacts) {
        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);
      }).then(done, done);
    });

    test('predominate last, upper', function(done) {
      var result = MockContact.list();

      navigator.mozContacts.find.withArgs(
        withFilter('Pepi')
      ).returns(
        Promise.resolve(result)
      );

      Contacts.findContactByString('O Pepi').then(function(contacts) {
        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);
      }).then(done, done);
    });


    test('predominate first, lower', function(done) {
      var result = MockContact.list();

      navigator.mozContacts.find.withArgs(
        withFilter('pepi')
      ).returns(
        Promise.resolve(result)
      );

      Contacts.findContactByString('pepi o').then(function(contacts) {
        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);
      }).then(done, done);
    });

    test('predominate last, lower', function(done) {
      var result = MockContact.list();

      navigator.mozContacts.find.withArgs(
        withFilter('pepi')
      ).returns(
        Promise.resolve(result)
      );

      Contacts.findContactByString('o pepi').then(function(contacts) {
        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);
      }).then(done, done);
    });

    test('multi-word name', function(done) {
      var result = MockContact.list([
        { givenName: ['Mary Anne'], familyName: ['Jones'] }
      ]);

      navigator.mozContacts.find.withArgs(
        withFilter('mary')
      ).returns(
        Promise.resolve(result)
      );

      Contacts.findContactByString('mary anne').then(function(contacts) {
        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);
      }).then(done, done);
    });

    test('name first, part of tel number last', function(done) {
      var result = MockContact.list();

      navigator.mozContacts.find.withArgs(
        withFilter('Pepito')
      ).returns(
        Promise.resolve(result)
      );

      Contacts.findContactByString('Pepito 8888').then(function(contacts) {
        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);
      }).then(done, done);
    });

    test('part of tel number first, name last', function(done) {
      var result = MockContact.list();

      navigator.mozContacts.find.withArgs(
        withFilter('Pepito')
      ).returns(
        Promise.resolve(result)
      );

      Contacts.findContactByString('8888 Pepito').then(function(contacts) {
        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);
      }).then(done, done);
    });

    test('name first, part of email address last', function(done) {
      MockSettings.supportEmailRecipient = true;
      var result = MockContact.list();

      navigator.mozContacts.find.withArgs(
        withFilter('Pepito')
      ).returns(
        Promise.resolve(result)
      );

      Contacts.findByString('Pepito a@b').then(function(contacts) {
        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);
      }).then(done, done);
    });

    test('part of email address first, name last', function(done) {
      MockSettings.supportEmailRecipient = true;
      var result = MockContact.list();

      navigator.mozContacts.find.withArgs(
        withFilter('Pepito')
      ).returns(
        Promise.resolve(result)
      );

      Contacts.findByString('a@b Pepito').then(function(contacts) {
        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);
      }).then(done, done);
    });

    test('string search yields a contact without familyName', function(done) {
      var result = MockContact.list([
        { givenName: ['julien'] }
      ]);

      navigator.mozContacts.find.withArgs(
        withFilter('julien')
      ).returns(
        Promise.resolve(result)
      );

      Contacts.findContactByString('julien 123').then((contacts) => {
        // "julien" yields a result that has only a givenName, no familyName.
        // This test checks that our algorithm works also in such cases.
        // See Bug 952533
        assert.isNotNull(contacts);
        assert.lengthOf(contacts, 0);
      }).then(done, done);
    });

    test('no matches, predominate first, upper', function(done) {
      navigator.mozContacts.find.withArgs(
        withFilter('Pepito')
      ).returns(
        Promise.resolve([])
      );

      Contacts.findContactByString('Pepito S').then(function(contacts) {
        // No contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 0);
      }).then(done, done);
    });

    test('no matches, predominate last, upper', function(done) {
      navigator.mozContacts.find.withArgs(
        withFilter('Pepito')
      ).returns(
        Promise.resolve([])
      );

      Contacts.findContactByString('S Pepito').then(function(contacts) {
        // No contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 0);
      }).then(done, done);
    });

    test('no matches, predominate first, lower', function(done) {
      navigator.mozContacts.find.withArgs(
        withFilter('pepi')
      ).returns(
        Promise.resolve([])
      );

      Contacts.findContactByString('pepi s').then(function(contacts) {
        // No contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 0);
      }).then(done, done);
    });

    test('no matches, predominate last, lower', function(done) {
      navigator.mozContacts.find.withArgs(
        withFilter('pepi')
      ).returns(
        Promise.resolve([])
      );

      Contacts.findContactByString('s pepi').then(function(contacts) {
        // No contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 0);
      }).then(done, done);
    });
  });


  suite('Contacts.findExact', function() {

    test('yields a match ', function(done) {
      var result = MockContact.list([
        { givenName: ['Jane'], familyName: ['Doozer'] }
      ]);

      navigator.mozContacts.find.withArgs(
        withFilter('doozer')
      ).returns(
        Promise.resolve(result)
      );

      Contacts.findExact('jane doozer').then(function(contacts) {
        assert.equal(contacts.length, 1);
      }).then(done, done);
    });

    test('yields no matches ', function(done) {
      navigator.mozContacts.find.withArgs(
        withFilter('doozer')
      ).returns(
        Promise.resolve([])
      );

      Contacts.findExact('j doozer').then(function(contacts) {
        assert.equal(contacts.length, 0);
      }).then(done, done);
    });
  });

  suite('Contacts.findByPhoneNumber', function() {

    test('removes spaces', function(done) {
      var result = MockContact.list();

      navigator.mozContacts.find.withArgs(
        withFilter('+33123456789')
      ).returns(
        Promise.resolve(result)
      );

      Contacts.findByPhoneNumber('+33 1 23 45 67 89').then(function(contacts){
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);
      }).then(done, done);
    });

    test('The mozContacts find() call returned an error', function(done) {
      navigator.mozContacts.find.withArgs(
        withFilter('callonerror')
      ).returns(
        Promise.resolve([])
      );

      Contacts.findByPhoneNumber('callonerror').then((results) => {
        assert.isArray(results);
        assert.lengthOf(results, 0);
      }).then(done, done);
    });

    test('Local number found.', function(done) {
      var result = [{
        name: [localContactName]
      }];

      navigator.mozContacts.find.withArgs(
        withFilter(targetLocalNumber)
      ).returns(
        Promise.resolve(result)
      );

      Contacts.findByPhoneNumber(targetLocalNumber).then(function(contacts) {
        assert.equal(contacts.length, 1);
        assert.isTrue(!contacts[0].isFbContact);
        assert.equal(contacts[0].name[0], localContactName);
      }).then(done, done);
    });

    test('Local number not found. FB Number found', function(done) {
      navigator.mozContacts.find.withArgs(
        withFilter(targetFbNumber)
      ).returns(
        Promise.resolve([])
      );

      Contacts.findByPhoneNumber(targetFbNumber).then(function(contacts) {
        assert.equal(contacts.length, 1);
        assert.equal(contacts[0].name[0], fbContactName);
        assert.equal(contacts[0].isFbContact, true);
      }).then(done, done);
    });

    test('Local number not found. FB Number not found either', function(done) {
      navigator.mozContacts.find.withArgs(
        withFilter(notFoundNumber)
      ).returns(
        Promise.resolve([])
      );

      Contacts.findByPhoneNumber(notFoundNumber).then(function(contacts) {
        assert.equal(contacts.length, 0);
      }).then(done, done);
    });

    test('Local number not found. FB returns error', function(done) {
      fb.inError = true;
      navigator.mozContacts.find.withArgs(
        withFilter(targetFbNumber)
      ).returns(
        Promise.resolve([])
      );

      Contacts.findByPhoneNumber(targetFbNumber).then(function(contacts) {
        assert.equal(contacts.length, 0);
        delete window.fb.inError;
      }).then(done, done);
    });
  });

  suite('Contacts.findByAddress', function() {

    test('removes spaces', function(done) {
      var result = MockContact.list();

      navigator.mozContacts.find.withArgs(
        withFilter('+33123456789')
      ).returns(
        Promise.resolve(result)
      );

      Contacts.findByAddress('+33 1 23 45 67 89').then(function(contacts){
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);
      }).then(done, done);
    });

    test('The mozContacts find() call returned an error', function(done) {
      navigator.mozContacts.find.withArgs(
        withFilter('callonerror')
      ).returns(
        Promise.resolve([])
      );

      Contacts.findByAddress('callonerror').then((results) => {
        assert.isArray(results);
        assert.lengthOf(results, 0);
      }).then(done, done);
    });

    test('Local number found.', function(done) {
      var result = [{
        name: [localContactName]
      }];

      navigator.mozContacts.find.withArgs(
        withFilter(targetLocalNumber)
      ).returns(
        Promise.resolve(result)
      );

      Contacts.findByAddress(targetLocalNumber).then(function(contacts) {
          assert.equal(contacts.length, 1);
          assert.isTrue(!contacts[0].isFbContact);
          assert.equal(contacts[0].name[0], localContactName);
      }).then(done, done);
    });

    test('Local email found.', function(done) {
      var result = [{
        name: [localContactName]
      }];

      navigator.mozContacts.find.withArgs(
        withFilter(targetLocalEmail)
      ).returns(
        Promise.resolve(result)
      );

      Contacts.findByAddress(targetLocalEmail).then(function(contacts) {
        assert.equal(contacts.length, 1);
        assert.isTrue(!contacts[0].isFbContact);
        assert.equal(contacts[0].name[0], localContactName);
      }).then(done, done);
    });

    test('Local number not found. FB Number found', function(done) {
      navigator.mozContacts.find.withArgs(
        withFilter(targetFbNumber)
      ).returns(
        Promise.resolve([])
      );

      Contacts.findByAddress(targetFbNumber).then(function(contacts) {
        assert.equal(contacts.length, 1);
        assert.equal(contacts[0].name[0], fbContactName);
        assert.equal(contacts[0].isFbContact, true);
      }).then(done, done);
    });

    test('Local number not found. FB Number not found either', function(done) {
      navigator.mozContacts.find.withArgs(
        withFilter(notFoundNumber)
      ).returns(
        Promise.resolve([])
      );

      Contacts.findByAddress(notFoundNumber).then(function(contacts) {
        assert.equal(contacts.length, 0);
      }).then(done, done);
    });

    test('Local email not found. FB Number not found either', function(done) {
      navigator.mozContacts.find.withArgs(
        withFilter(notFoundEmail)
      ).returns(
        Promise.resolve([])
      );

      Contacts.findByAddress(notFoundEmail).then(function(contacts) {
        assert.equal(contacts.length, 0);
      }).then(done, done);
    });

    test('Local number not found. FB returns error', function(done) {
      fb.inError = true;
      navigator.mozContacts.find.withArgs(
        withFilter(targetFbNumber)
      ).returns(
        Promise.resolve([])
      );

      Contacts.findByAddress(targetFbNumber).then(function(contacts) {
        assert.equal(contacts.length, 0);
        delete window.fb.inError;
      }).then(done, done);
    });
  });

  suite('Contacts.findExactByEmail', function() {

    test('Local email found.', function(done) {
      var result = [{
        name: [localContactName]
      }];

      navigator.mozContacts.find.withArgs(
        withFilter(targetLocalEmail)
      ).returns(
        Promise.resolve(result)
      );

      Contacts.findExactByEmail(targetLocalEmail).then(function(contacts) {
        assert.equal(contacts.length, 1);
        assert.isTrue(!contacts[0].isFbContact);
        assert.equal(contacts[0].name[0], localContactName);
      }).then(done, done);
    });

    test('Local email not found. FB Email not found either', function(done) {
      navigator.mozContacts.find.withArgs(
        withFilter(notFoundEmail)
      ).returns(
        Promise.resolve([])
      );

      Contacts.findExactByEmail(notFoundEmail).then(function(contacts) {
        assert.equal(contacts.length, 0);
      }).then(done, done);
    });

    test('Local email not found. FB returns error', function(done) {
      fb.inError = true;
      var result = [{
        name: [localContactName]
      }];

      navigator.mozContacts.find.withArgs(
        withFilter(targetLocalEmail)
      ).returns(
        Promise.resolve(result)
      );

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
      var filter = {
        filterBy: ['tel'],
        filterOp: 'contains',
        filterValue: '12125559999'
      };
      var result = MockContact.list();

      navigator.mozContacts.find.withArgs(
        withFilter('12125559999')
      ).returns(
        Promise.resolve(result)
      );

      Contacts.findBy(filter).then(function(contacts) {
        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 1);
      }).then(done, done);
    });

    test('(object, ...), No Match', function(done) {
      var filter = {
        filterBy: ['tel'],
        filterOp: 'contains',
        filterValue: '911'
      };

      navigator.mozContacts.find.withArgs(
        withFilter('911')
      ).returns(
        Promise.resolve([])
      );

      Contacts.findBy(filter).then(function(contacts) {
        // contacts were not found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 0);
      }).then(done, done);
    });
  });

  suite('Contacts.findBy (error)', function() {
    test('({}, ...)', function(done) {
      Contacts.findBy({}).then(function(contacts) {
        assert.isTrue(Array.isArray(contacts));
        assert.equal(contacts.length, 0);
      }).then(done, done);
    });
  });

  suite('Contacts validation', function() {

    test('Contact validation, predominate first', function(done) {
      var result = MockContact.list([
        { givenName: ['Jane'], familyName: ['D'] },

        { givenName: ['jane'], familyName: ['doe'] },

        { givenName: ['jane'], familyName: ['dow'] },

        { givenName: ['Jane'], familyName: ['Doozer'] }
      ]);

      navigator.mozContacts.find.withArgs(
        withFilter('jane')
      ).returns(
        Promise.resolve(result)
      );

      Contacts.findContactByString('jane d').then(function(contacts) {
        // contacts were found
        assert.ok(Array.isArray(contacts));
        // This was relaxed by the change from "startsWith" to "contains"
        assert.equal(contacts.length, 4);
      }).then(done, done);
    });

    test('Contact validation, predominate last', function(done) {
      var result = MockContact.list([
        { givenName: ['Jane'], familyName: ['Doozer'] },

        { givenName: ['jane'], familyName: ['doe'] },

        { givenName: ['jerry'], familyName: ['doe'] },

        { givenName: ['j'], familyName: ['dow'] },

        { givenName: ['john'], familyName: ['doland'] }
      ]);

      navigator.mozContacts.find.withArgs(
        withFilter('do')
      ).returns(
        Promise.resolve(result)
      );

      Contacts.findContactByString('j do').then(function(contacts) {
        // contacts were found
        assert.ok(Array.isArray(contacts));
        assert.equal(contacts.length, 5);
      }).then(done, done);
    });
  });
});
