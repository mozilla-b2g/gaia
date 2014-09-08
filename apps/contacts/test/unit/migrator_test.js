'use strict';

/* global Migrator, MockImportStatusData, Mockfb, MockDatastoreMigration,
   MockasyncStorage */

requireApp('contacts/test/unit/mock_import_status_data.js');
requireApp('contacts/test/unit/mock_asyncstorage.js');
requireApp('contacts/test/unit/mock_fb.js');
requireApp('contacts/test/unit/mock_datastore_migrator.js');
requireApp('contacts/js/migrator.js');

if (!window.LazyLoader) {
  var LazyLoader = {load: function(){}};
}

if (!window.ImportStatusData) {
  window.ImportStatusData = null;
}

if (!window.fb) {
  window.fb = null;
}

if (!window.DatastoreMigration) {
  window.DatastoreMigration = null;
}

if (!window.asyncStorage) {
  window.asyncStorage = null;
}

if (!window.utils) {
  window.utils = {
    cookie: {update: function() {}}
  };
}

suite('Migrator module', function() {  
  var realImportStatusData, 
      realFb, 
      realDatastoreMigration,
      realAsyncStorage;

  suiteSetup(function() {
    realImportStatusData = window.ImportStatusData;
    window.ImportStatusData = MockImportStatusData;

    realFb = window.fb;
    window.fb = Mockfb;

    realDatastoreMigration = window.DatastoreMigration;
    window.DatastoreMigration = MockDatastoreMigration;

    realAsyncStorage = window.asyncStorage;
    window.asyncStorage = MockasyncStorage;
  });
  
  suiteTeardown(function() {
    window.ImportStatusData = realImportStatusData;
    window.fb = realFb;
    window.DatastoreMigration = realDatastoreMigration;
    window.asyncStorage = realAsyncStorage;
  });

  setup(function() {
    MockasyncStorage.clear();
    MockImportStatusData.clear();
  });

  test('Don\'t migrate anything', function() {
    var spy = sinon.spy(LazyLoader, 'load');

    Migrator.start({
      fbMigrated: true,
      accessTokenMigrated: true
    });

    assert.isFalse(spy.called, 'A migration was not triggered.');
    LazyLoader.load.restore();
  });

  test('Trigger facebook contacts migration only', function(done) {
    sinon.stub(LazyLoader, 'load', function(files, callback) {
      callback();
    });

    window.DatastoreMigration = function() {
      return {
        start: function() {
          window.DatastoreMigration = MockDatastoreMigration;
          LazyLoader.load.restore();
          done();
        }
      };
    };

    Migrator.start({
      fbMigrated: false,
      accessTokenMigrated: true
    });
  });

  test('Trigger facebook token migration only', function(done) {
    sinon.stub(LazyLoader, 'load', function(files, callback) {
      callback();
    });

    window.fb.utils =  {
      get TOKEN_DATA_KEY() {
        window.fb.utils = {TOKEN_DATA_KEY: null};
        window.fb = Mockfb;
        LazyLoader.load.restore();
        done();
      }
    };

    Migrator.start({
      fbMigrated: true,
      accessTokenMigrated: false
    });
  });

  test('Don\'t migrate fb token if it is not in asyncStorage', function() {
    MockasyncStorage.keys[Mockfb.utils.TOKEN_DATA_KEY] = true;
    
    sinon.stub(LazyLoader, 'load', function(files, callback) {
      callback();
    });

    var spy = sinon.spy(window.utils.cookie, 'update');

    sinon.stub(window.asyncStorage, 'removeItem', function(key) {
      window.asyncStorage.removeItem.restore();
      LazyLoader.load.restore();
      assert.isTrue(spy.called);
      spy.restore();
      assert.equal(key, Mockfb.utils.TOKEN_DATA_KEY);
    });

    Migrator.start({
      fbMigrated: true,
      accessTokenMigrated: false
    });
  });

});
