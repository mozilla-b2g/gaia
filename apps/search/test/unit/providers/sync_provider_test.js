/* globals Promise, MockNavigatorDatastore, MockDatastore, SyncProvider*/
'use strict';

require('/shared/test/unit/mocks/mock_navigator_datastore.js');
requireApp('search/test/unit/mock_search.js');
requireApp('search/js/providers/provider.js');
requireApp('search/js/providers/grid_provider.js');

suite('SyncProvider tests', function() {

  const STORE_NAME = 'unitTestStore';

  var subject, realDataStore;

  var promiseDone = Promise.resolve({ operation: 'done' });

  suiteSetup(function(done) {
    realDataStore = navigator.getDataStores;
    navigator.getDataStores = MockNavigatorDatastore.getDataStores;

    MockNavigatorDatastore._records = {};

    MockDatastore.sync = function() {
      var cursor = {
        next: function() {
          cursor.next = () => promiseDone;

          return Promise.resolve({
            operation: 'add',
            data: {
              url: 'my url',
              title: 'homepage',
              icon: 'icon_uri'
            }
          });
        }
      };
      return cursor;
    };

    requireApp('search/js/providers/sync_provider.js', done);
  });

  suiteTeardown(function() {
    navigator.getDataStores = realDataStore;
  });

  setup(function() {
    this.sinon.spy(navigator, 'getDataStores');

    subject = new SyncProvider();
    subject.storeName = STORE_NAME;

    this.sinon.spy(subject, 'filterData');
    this.sinon.spy(subject, 'add');
  });

  suite('initialization', function() {
    test('we went throught the startup path', function() {
      subject.init();
      sinon.assert.calledWith(navigator.getDataStores, STORE_NAME);
      assert.isTrue(subject.initialSync);
    });
  });

  suite('check datastore data loading', function() {
    test('check we load data', function(done) {
      subject.onDone = function() {
        sinon.assert.calledOnce(subject.filterData);
        sinon.assert.calledOnce(subject.add);
        done();
      };
      subject.init();
    });
  });

});
