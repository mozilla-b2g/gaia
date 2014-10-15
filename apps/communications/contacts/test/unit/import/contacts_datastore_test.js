'use strict';

/* globals MockNavigatorDatastore, MockDatastoreObj, ContactsDatastore */

require('/shared/js/contacts/contacts_datastore.js');
require('/shared/test/unit/mocks/mock_navigator_datastore.js');

suite('Contacts Datastore', function() {
  var realDatastore;
  var datastoreOwner = 'app://gmailprovider.gaiamobile.org/manifest.webapp';

  suiteSetup(function() {
    var datastore1 = new MockDatastoreObj('contacts', datastoreOwner, null);

    MockNavigatorDatastore._datastores = [
      datastore1
    ];

    realDatastore = navigator.getDataStores;

    navigator.getDataStores = MockNavigatorDatastore.getDataStores;
  });

  suiteTeardown(function() {
    navigator.getDataStores = realDatastore;
  });

  test('it provides the datastore', function(done) {
    var subject = new ContactsDatastore(datastoreOwner);

    subject.getStore().then(function(store) {
      done(function() {
        assert.equal(store.owner, datastoreOwner);
      });
    }).catch (done);
  });

  test('if the provider name is incorrect promise is rejected', function(done) {
    var subject = new ContactsDatastore('undefinedprovider');

    subject.getStore().then(function(store) {
      done('failed');
    }).catch (function(error) {
        done(function() {
          assert.equal(error.name, 'DatastoreNotFound');
        });
    });
  });

  test('if navigator.getDatastores is not available promise is rejected',
    function(done) {
      navigator.getDataStores = null;

      var subject = new ContactsDatastore(datastoreOwner);

    subject.getStore().then(function(store) {
      done('failed');
    }).catch (function(error) {
        done(function() {
          assert.equal(error.name, 'DatastoreNotEnabled');
        });
    });
  });

});
