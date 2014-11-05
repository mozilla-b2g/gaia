'use strict';

/* globals MockDatastoreObj, MockNavigatorDatastore, MockMozContactsObj */
/* globals MultiContact */

require('/shared/js/lazy_loader.js');
require('/shared/js/simple_phone_matcher.js');
require('/shared/js/contacts/multi_contact.js');
require('/shared/test/unit/mocks/mock_navigator_datastore.js');
require('/shared/test/unit/mocks/mock_mozContacts.js');

suite('Getting MultiContact Data', function() {

  var datastore1, datastore2;

  var EXAMPLE1_APP = 'app://example.a1.org';
  var EXAMPLE2_APP = 'app://example.a2.org';

  var CONTACTS_APP = 'app://communications.gaiamobile.org';

  var globalEntryId = '9876';
  var ds1Id = '1234', ds2Id = '4567';

  // Global entry on the GCDS references two different datastores
  var entry = {
    id: globalEntryId,
    entryData: [
      {
        origin: EXAMPLE1_APP,
        uid: ds1Id
      },
      {
        origin: EXAMPLE2_APP,
        uid: ds2Id
      }
    ]
  };

  var entryMozContacts = {
    id: globalEntryId,
    entryData: [
      {
        origin: EXAMPLE1_APP,
        uid: ds1Id
      },
      {
        origin: CONTACTS_APP,
        uid: 'abcdef'
      }
    ]
  };

  var onlyMozContactEntry = {
    id: globalEntryId,
    entryData: [
      {
        origin: CONTACTS_APP,
        uid: 'abcdef'
      }
    ]
  };

  var ds1Records = Object.create(null);
  ds1Records[ds1Id] = {
    id: ds1Id,
    givenName: ['Jose'],
    familyName: null,
    tel: [
      {
        type: ['work'],
        value: '983367741'
      }
    ]
  };

  var ds2Records = Object.create(null);
  ds2Records[ds2Id] = {
    id: ds2Id,
    familyName: ['Cantera'],
    email: [
      {
        type: ['personal'],
        value: 'jj@jj.com'
      }
    ]
  };

  var aMozTestContact = {
    id: 'abcdef',
    givenName: ['Carlos'],
    familyName: ['Fernández'],
    tel: [
      {
        type: ['home'],
        value: '638883076'
      }
    ]
  };

  var realDatastore, realMozContacts;

  suiteSetup(function() {
    datastore1 = new MockDatastoreObj('contacts', EXAMPLE1_APP, ds1Records);
    datastore2 = new MockDatastoreObj('contacts', EXAMPLE2_APP, ds2Records);

    MockNavigatorDatastore._datastores = [
      datastore1,
      datastore2
    ];

    realDatastore = navigator.getDataStores;
    realMozContacts = navigator.mozContacts;

    navigator.getDataStores = MockNavigatorDatastore.getDataStores;
    navigator.mozContacts = new MockMozContactsObj([aMozTestContact]);
  });

  suiteTeardown(function() {
    navigator.getDataStores = realDatastore;
    navigator.mozContacts = realMozContacts;
  });

  test('Getting data from two different datastores', done => {
    MultiContact.getData(entry).then(data => {
      done(() => {
        assert.equal(data.id, globalEntryId);

        assert.equal(data.familyName[0], 'Cantera');
        assert.equal(data.givenName[0], 'Jose');
        assert.equal(data.tel.length, 1);
        assert.equal(data.email.length, 1);
      });
    }).catch(err => done(() => assert.fail('Error while getting data')));
  });

  test('Getting data only from mozContacts', function(done) {
    MultiContact.getData(onlyMozContactEntry).then(data => {
      done(() => {
        assert.equal(data.id, globalEntryId);

        assert.equal(data.familyName[0], aMozTestContact.familyName[0]);
        assert.equal(data.givenName[0], aMozTestContact.givenName[0]);
        assert.equal(JSON.stringify(data.tel),
                     JSON.stringify(aMozTestContact.tel));
        assert.equal(JSON.stringify(data.email),
                     JSON.stringify(aMozTestContact.email));
      });
    }).catch(err => done(() => assert.fail('Error while getting data')));
  });

  test('Getting data from a datastore and mozContacts', function(done) {
    MultiContact.getData(entryMozContacts).then(function success(data) {
      done(function() {
        assert.equal(data.id, globalEntryId);

        assert.equal(data.familyName[0], 'Fernández');
        assert.equal(data.givenName[0], 'Carlos');
        assert.equal(data.tel.length, 2);
      });
    }).catch(err => done(() => assert.fail('Error while getting data')));
  });
});
