'use strict';

/* globals GlobalContacts, MockMultiContact, MockNavigatorDatastore,
           MockDatastore, Normalizer, Promise
*/

require('/shared/js/lazy_loader.js');
require('/shared/js/simple_phone_matcher.js');
require('/shared/test/unit/mocks/mock_navigator_datastore.js');
require('/shared/test/unit/mocks/mock_multi_contact.js');
require('/shared/js/contacts/contacts_matcher.js');
require('/shared/js/text_normalizer.js');
require('/shared/js/contacts/global_contacts_data.js');


suite('Global Contacts Data', function() {
  var realGetDatastores = navigator.getDataStores;
  var realMultiContact = window.MultiContact;

  suiteSetup(function() {
    navigator.getDataStores = MockNavigatorDatastore.getDataStores;
    MockNavigatorDatastore._records = {};
    window.MultiContact = MockMultiContact;
  });

  suiteTeardown(function() {
    navigator.getDataStores = realGetDatastores;
    window.MultiContact = realMultiContact;
  });

  var originStore1 = {
    owner: 'app://a1.example.org'
  };

  var originStore2 = {
    owner: 'app://a2.example.org'
  };

  var contact = {
    id: '1234',
    tel: [{
      type: ['work'],
      value: '983456712'
    }],
    email: [{
      type: ['home'],
      value: 'jj@jj.com'
    }],
    name: ['Raúl Fernández'],
    givenName: ['Raúl'],
    familyName: ['Fernández']
  };

  var anotherContact = Object.create(contact);
  anotherContact.id = '9999';
  anotherContact.tel = [{
    type: ['home'],
    value: '675432123'
  }];

  var aMatchingContact = Object.create(contact);
  aMatchingContact.id = '678';

  function assertNewEntry(contact, expectedDsLength, originStore,
                          expectedNumbers, expectedId, done) {
    var records = MockDatastore._records;

    done(function() {
      assert.equal(Object.keys(records).length, expectedDsLength);
      var entry = records[Object.keys(records)[expectedDsLength - 1]];
      assert.equal(entry.length, 1);
      assert.equal(entry[0].origin, originStore.owner);

      assertIndexing(originStore, contact, expectedNumbers, expectedId);
    });
  }

  // Checks that the contact has been correctly indexed
  function assertIndexing(originStore, contact, expectedNumbers, expectedId) {
    var records = MockDatastore._records;
    var index = records[Object.keys(records)[0]];

    var normalizedGN = Normalizer.toAscii(contact.givenName[0].toLowerCase());
    var normalizedFN = Normalizer.toAscii(contact.familyName[0].toLowerCase());

    assert.equal(index.byGivenName[normalizedGN].length,
                 expectedNumbers.givenName);
    assert.equal(index.byFamilyName[normalizedFN].length,
                 expectedNumbers.familyName);
    assert.equal(index.byTel[contact.tel[0].value].length,
                 expectedNumbers.tel);
    assert.equal(index.byEmail[contact.email[0].value].length,
                 expectedNumbers.email);
    assert.equal(index.byStore[originStore.owner][contact.id], expectedId);
  }

  function flushContact(originStore, originDsId, contact) {
    return new Promise(function(resolve, reject) {
      GlobalContacts.add(originStore, originDsId, contact).then(function() {
        return GlobalContacts.flush();
      }, function rejected(err) {
          reject(err);
      }).then(resolve, reject);
    });
  }

  setup(function(done) {
    flushContact(originStore1, '1234', contact).then(done, done);
  });

  teardown(function(done) {
    GlobalContacts.clear().then(done, done);
  });


  test('Adding a new Contact to the datastore', function(done) {
    var expectedNumbers = {
      givenName: 1,
      familyName: 1,
      tel: 1,
      email: 1
    };

    assertNewEntry(contact, 2, originStore1, expectedNumbers, 2, done);
  });

  test('Getting entry data from the datastore', function(done) {
    GlobalContacts.getEntry(2).then(function(data) {
      done(function() {
        assert.equal(data.length, 1);
        assert.equal(data[0].origin, originStore1.owner);
        assert.equal(data[0].uid, '1234');
      });
    }).catch(done);
  });

  test('Getting contact data', function(done) {
    var multiContactObj = Object.create(contact);
    multiContactObj.id = 2;
    MockMultiContact._data['1234'] = multiContactObj;

    GlobalContacts.getData(2).then(function(data) {
      done(function() {
      });
    }).catch(done);
  });

  test('New Contact matches existing > entry is updated ', function(done) {
    var multiContactObj = Object.create(contact);
    multiContactObj.id = 2;
    MockMultiContact._data['1234'] = multiContactObj;

    flushContact(originStore2, '678', aMatchingContact).then(function() {
      done(function() {
        var records = MockDatastore._records;
        var entry = records[Object.keys(records)[1]];

        // As this contact has been merged no new record should be created
        assert.equal(Object.keys(records).length, 2);
        assert.equal(entry.length, 2);
        assert.equal(entry[0].origin, originStore1.owner);
        assert.equal(entry[1].origin, originStore2.owner);
      });
    }, done);
  });

  test('New Contact does not match existing > New entry is created',
    function(done) {
      flushContact(originStore2, '9999', anotherContact).then(function() {
        var expectedNumbers = {
          givenName: 2,
          familyName: 2,
          tel: 1,
          email: 2
        };
        assertNewEntry(anotherContact, 3, originStore2,
                       expectedNumbers, 3, done);
      }, done);
  });

  test('Remove datastore entry. Entry remains ', function(done) {
    flushContact(originStore2, '678', aMatchingContact).then(function() {
      return GlobalContacts.remove(originStore2, '678', aMatchingContact);
    }).then(function success() {
            return GlobalContacts.flush();
          }, done).then(function success() {
            done(function() {
              var records = MockDatastore._records;
              assert.equal(Object.keys(records).length, 2);
              var entry = records['2'];
              assert.equal(entry.length, 1);
              assert.equal(entry[0].origin, originStore1.owner);
            });
          }, done);
  });

  test('Remove datastore entry. Entry is deleted ', function(done) {
    flushContact(originStore2, '9999', anotherContact).then(function() {
      return GlobalContacts.remove(originStore2, '9999', anotherContact);
    }).then(function success() {
        return GlobalContacts.flush();
    }, done).then(function success() {
        done(function() {
          var expectedNumbers = {
            givenName: 1,
            familyName: 1,
            email: 1,
            tel: 1
          };
          var records = MockDatastore._records;
          assert.equal(Object.keys(records).length, 2);
          assertIndexing(originStore1, contact, expectedNumbers, 2);
        });
      }, done);
  });

  test('Clear the datastore', function(done) {
    GlobalContacts.clear(originStore1).then(function() {
        return GlobalContacts.flush();
    }, done).then(function success() {
        done(function() {
          var records = MockDatastore._records;
          assert.equal(Object.keys(records).length, 1);

          var index = records[Object.keys(records)[0]];

          assert.equal(Object.keys(index.byGivenName).length, 0);
          assert.equal(Object.keys(index.byFamilyName).length, 0);
          assert.equal(Object.keys(index.byTel).length, 0);
          assert.equal(Object.keys(index.byEmail).length, 0);
          assert.equal(Object.keys(index.byStore).length, 0);
        });
    }, done);
  });
});
