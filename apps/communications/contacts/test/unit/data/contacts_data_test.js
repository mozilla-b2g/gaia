'use strict';

/* globals ContactsData, MockIndexedDB */

require('/shared/test/unit/mocks/mock_indexedDB.js');
require('/shared/js/text_normalizer.js');
require('/shared/js/lazy_loader.js');
requireApp('communications/contacts/data/contacts_data.js');

mocha.globals(['contacts']);

suite('Contacts Data Indexed DB', function() {
  var aContact = {
    id: '1234',
    givenName: ['Jose'],
    familyName: ['Alvarez'],
    tel: [
      {
        type: ['work'],
        value: '983367741'
      }
    ],
    email: [
      {
        type: ['home'],
        value: 'jj@jj.com'
      }
    ]
  };

  var mockIndexedDB;

  suiteSetup(function() {
    mockIndexedDB = new MockIndexedDB();
  });

  suiteTeardown(function() {
  });

  function assertIndexes(aContact) {
    assert.equal(aContact._givenName, 'jose');
    assert.equal(aContact._familyName, 'alvarez');
    assert.equal(aContact._email, 'jj@jj.com');
    assert.isTrue(aContact._tel.indexOf(aContact.tel[0].value) !== -1);
  }

  test('Saving a contact > Reading a Contact', function(done) {
    ContactsData.save(aContact).then(function success() {
      ContactsData.get(aContact.id).then(function success(obj) {
        done(function() {
          assert.deepEqual(aContact, obj);
          assertIndexes(aContact);
        });
      });
    });
  });

  test('Removing a contact > Not found', function(done) {
    ContactsData.remove(aContact.id).then(function success() {
      return ContactsData.get(aContact.id);
    }).then(function success(result) {
        done(function() {
          assert.isTrue(!result);
        });
    });
  });

  test('Saving a Contact > Clearing the database > Not found', function(done) {
    ContactsData.save(aContact).then(function success() {
      return ContactsData.clear();
    }).then(function success() {
        return ContactsData.get(aContact.id);
    }).then(function success(result) {
        done(function() {
          assert.isTrue(!result);
        });
    });
  });


  test('Getting all data from the database', function(done) {
    mockIndexedDB.dbs[0]._indexedData = {
      by: {
        'by_name': {
          'jose cantera': aContact
        }
      }
    };

    ContactsData.save(aContact).then(function success() {
      var cursor = ContactsData.getAll();
      var valuesRetrieved = 0;
      cursor.onsuccess = function(evt) {
        if (evt.target.result) {
          valuesRetrieved++;
          assert.equal(evt.target.result.id, aContact.id);
          cursor.continue();
        }
        else {
          done(function() {
            assert.equal(valuesRetrieved, 1);
          });
        }
      };
    });
  });


  suite('Find by operations', function() {
    suiteSetup(function(done) {
      mockIndexedDB.dbs[0]._indexedData = {
        by: {
          'by_givenName': {
            'jose': aContact
          },
          'by_email': {
            'jj@gmail.com': aContact
          },
          'by_tel': {
            '983367743': aContact
          }
        }
      };

      ContactsData.save(aContact).then(function success() {
        done();
      });
    });


    test('Find by > givenName', function(done) {
      ContactsData.findBy('givenName', 'Jose').then(function success(results) {
        done(function() {
          assert.equal(results.length, 1);
          assert.equal(results[0].id, aContact.id);
        });
      });
    });

    test('Find by > familyName > Not found', function(done) {
      ContactsData.findBy('familyName', 'Fernández').then(
        function success(results) {
          done(function() {
            assert.equal(results.length, 0);
          });
      });
    });

    test('Find by > email', function(done) {
      ContactsData.findBy('email', 'jj@jj.com').then(
        function success(results) {
          done(function() {
            assert.equal(results.length, 1);
            assert.equal(results[0].id, aContact.id);
          });
      });
    });

    test('Find by > tel number', function(done) {
      ContactsData.findBy('tel', '983367743').then(
        function success(results) {
          done(function() {
            assert.equal(results.length, 1);
            assert.equal(results[0].id, aContact.id);
          });
      });
    });

  });

});
