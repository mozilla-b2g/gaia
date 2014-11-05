/* global MockNavigatorDatastore, MockDatastore */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_datastore.js');
require('/shared/js/contacts/utilities/ice_store.js');

suite('Sync Datastore', function() {
  var subject;
  var realDatastore;

  suiteSetup(function() {
    realDatastore = navigator.getDataStores;
    navigator.getDataStores = MockNavigatorDatastore.getDataStores;
  });

  setup(function() {
    subject = window.ICEStore;
    MockDatastore._records = {'ICE_CONTACTS': [1,2]};
  });

  suiteTeardown(function() {
    navigator.getDataStores = realDatastore;
  });

  suite('Getting data', function() {
    test('Get ICE contacts', function(done) {
      subject.getContacts().then(function(contacts){
        assert.deepEqual(contacts, [1, 2]);
      }).then(done, done);
    });
  });

  suite('Setting data', function() {
    test('Set ICE contacts', function(done) {
      subject.setContacts([3,4]).then(function() {
        assert.deepEqual(MockDatastore._records, {'ICE_CONTACTS': [3,4]});
      }).then(done, done);
    });
  });
});
