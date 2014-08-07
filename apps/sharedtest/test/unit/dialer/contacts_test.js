/*global MocksHelper, Contacts, MockMozContactsObj,
 MockasyncStorage, Mockfb
 */

'use strict';

require('/apps/communications/contacts/test/unit/mock_mozContacts.js');
require('/shared/test/unit/mocks/mock_contact_all_fields.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_async_storage.js');
require('/shared//test/unit/mocks/mock_simple_phone_matcher.js');
require('/apps/communications/contacts/test/unit/mock_fb.js');

var mocksHelperForContacts = new MocksHelper([
  'asyncStorage',
  'LazyLoader',
  'SimplePhoneMatcher',
  'fb'
]);

mocksHelperForContacts.init();

require('/shared/js/dialer/contacts.js');

suite('dialer/contacts', function() {
  var realMozContacts;
  var searchNumber = '3334445555';
  var mozContactNum = '638883';
  var aMozTestContact = {
    id: 'abcdef',
    givenName: ['Carlos'],
    familyName: ['Fernández'],
    tel: [
      {
        type: ['home'],
        value: mozContactNum
      }
    ]
  };

  var aFacebookContact = {
    id:'567',
    updated: 'date',
    additionalName:['Green'],
    adr:[{type:['home'],locality:'Palencia', region:'Castilla y León',
        countryName:'España'},{type:['current'], locality:'Greater London',
        region:'London', countryName:'United Kingdom'}],
    bday:'Thu, 01 Jan 1970 00:00:00 GMT',
    email:[{type:['personal'],value:'test@test.com'},
           {type:['work'],value:'test@work.com',pref:true}],
    honorificPrefix:['Mr.'],familyName:['Taylor'],givenName:['Bret'],
    nickname:['PG'],jobTitle:['Sr. Software Architect'],name:['Bret Taylor'],
    org:['FB'],tel:[{value:'+346578888888',type:['mobile'],carrier:'TEF',
    pref:true},{value:'+3120777777',type:['Home'],carrier:'KPN'}],
    url:[{type:['fb_profile_photo'],value:'https://abcd1.jpg'}],
    category:['favorite','facebook','not_linked',220439],note:['Note 1'],
    photo:[{}]
  };
  aFacebookContact.bday = new Date(0);

  mocksHelperForContacts.attachTestHelpers();

  suiteSetup(function() {
    realMozContacts = navigator.mozContacts;
    navigator.mozContacts = new MockMozContactsObj([aMozTestContact]);
  });

  suiteTeardown(function() {
    navigator.mozContacts = realMozContacts;
  });

  suite('> Contacts Revision', function() {
    test('> Should return revision', function() {
      Contacts.getRevision(function(status) {
        assert.deepEqual(status, 'fakeRevision');
      });
    });
  });

  suite('> FindByNumber', function() {
    var expectedMatchingTel = {type: ['home'], value: mozContactNum };
    var expectedMatchingContact = {id: 'abcdef', givenName: ['Carlos'],
                                   familyName: ['Fernández'],
                                   tel: [expectedMatchingTel]};

    setup(function() {
      this.sinon.spy(navigator.mozContacts, 'find');
      this.sinon.spy(Mockfb, 'getContactByNumber');
      this.sinon.spy(Mockfb, 'getData');
    });

    test('should find the exact number for < 7 digits', function() {
      var options = {
        filterBy: ['tel'],
        filterOp: 'equals',
        filterValue: mozContactNum
      };
      Contacts.findByNumber(mozContactNum, function(contact, matchingTel) {
        sinon.assert.calledWith(navigator.mozContacts.find, options);
        assert.deepEqual(matchingTel, expectedMatchingTel);
        assert.deepEqual(contact, expectedMatchingContact);
      });
    });

    test('should find numbers matching for  >= 7 digits', function() {
      var options = {
        filterBy: ['tel'],
        filterOp: 'match',
        filterValue: '6388830123'
      };

      Contacts.findByNumber('6388830123', function(contact, matchingTel) {
        sinon.assert.calledWith(navigator.mozContacts.find, options);
        assert.deepEqual(matchingTel, expectedMatchingTel);
        assert.deepEqual(contact, expectedMatchingContact);
      });
    });

    test('should search FB if no MozContact found', function() {
      navigator.mozContacts.setContacts([]);
      Contacts.findByNumber('6388830123', function(contact, matchingTel) {
        sinon.assert.calledWith(Mockfb.getContactByNumber, '6388830123');
      });
    });

    test('should NOT search FB if MozContact found', function() {
      navigator.mozContacts.setContacts([aMozTestContact]);

      Contacts.findByNumber(mozContactNum, function(contact, matchingTel) {
        sinon.assert.notCalled(Mockfb.getContactByNumber);
        assert.deepEqual(matchingTel, expectedMatchingTel);
        assert.deepEqual(contact, expectedMatchingContact);
      });
    });

    test('should return null if no FB or MozContact found', function() {
      navigator.mozContacts.setContacts([]);
      Mockfb.setEmptyContacts();
      Contacts.findByNumber(searchNumber, function(contact, matchingTel) {
        assert.isNull(contact);
      });
    });

    test('should merge w/FB if contact is facebook linked', function() {
      navigator.mozContacts.setContacts([aMozTestContact]);
      Mockfb.setIsFbLinked(true);
      Contacts.findByNumber(mozContactNum, function(contact, matchingTel) {
        sinon.assert.calledOnce(Mockfb.getData);
        assert.deepEqual(matchingTel, expectedMatchingTel);
        //Check that the facebook data was added.  Fake out the date (but
        //validate it's a date format first) to avoid having the test fail
        //due to date being mismatched.
        assert.ok(contact.updated instanceof Date &&
                  !isNaN(contact.updated.valueOf()));
        contact.updated = 'date';
        assert.deepEqual(contact, aFacebookContact);
      });
    });

    test('should NOT merge w/FB if not linked', function() {
      navigator.mozContacts.setContacts([aMozTestContact]);
      Mockfb.setIsFbLinked(false);
      Contacts.findByNumber(searchNumber, function(contact, matchingTel) {
        sinon.assert.notCalled(Mockfb.getData);
        assert.notEqual(contact.id, '567');
        assert.isUndefined(contact.jobTitle);
      });
    });
  });

  suite('> FindListByNumber ', function() {
    var limit = 20;

    setup(function() {
      this.sinon.spy(navigator.mozContacts, 'find');
      this.sinon.spy(Mockfb, 'isFbContact');
      this.sinon.spy(Mockfb, 'getData');

      this.sinon.stub(MockasyncStorage, 'getItem');
    });

    teardown(function() {
      MockasyncStorage.getItem.restore();
    });

    test('should call find with correct filter option', function() {
      //From contacts.js
      var options = {
        filterBy: ['tel'],
        filterOp: 'contains',
        filterValue: searchNumber,
        sortBy: 'familyName',
        sortOrder: 'ascending',
        filterLimit: limit
      };

      Contacts.findListByNumber(searchNumber, limit, function() {
        sinon.assert.calledWith(navigator.mozContacts.find, options);
      });
    });

    test('should merge w/FB contacts if mozContacts are also FB contacts',
          function() {
      Mockfb.setIsFbContact(true);
      navigator.mozContacts.setContacts([aMozTestContact]);
      MockasyncStorage.getItem.yields(false);

      Contacts.findListByNumber(limit, searchNumber, function(contacts) {
        sinon.assert.called(Mockfb.isFbContact);
        sinon.assert.called(Mockfb.getData);
        //Check that the facebook data was added.  Fake out the date (but
        //validate it's a date format first) to avoid having the test fail
        //due to date being mismatched.
        assert.ok(contacts[0].updated instanceof Date &&
                  !isNaN(contacts[0].updated.valueOf()));
        contacts[0].updated = 'date';
        assert.deepEqual(contacts[0], aFacebookContact);
      });
    });

    test('should not merge w/FB contacts if mozContacts is not FB contacts',
         function() {
      Mockfb.setIsFbContact(false);
      navigator.mozContacts.setContacts([aMozTestContact]);
      MockasyncStorage.getItem.yields(true);

      Contacts.findListByNumber(limit, searchNumber, function(contacts) {
        sinon.assert.called(Mockfb.isFbContact);
        //Check that facebook data was not added
        assert.isUndefined(contacts[0].honorificPrefix);
        assert.isUndefined(contacts[0].jobTitle);
        assert.isUndefined(contacts[0].org);
        assert.isUndefined(contacts[0].note);
        //Check that existing MozContact data is unchanged
        assert.deepEqual(contacts[0], aMozTestContact);
      });
    });

    test('should NOT get FB contacts if no MozContacts found', function() {
      navigator.mozContacts.setContacts([]);
      Contacts.findListByNumber(searchNumber, limit, function(contacts) {
        sinon.assert.notCalled(Mockfb.isFbContact);
        assert.isNull(contacts);
      });
    });
  });
});
