requireApp('communications/contacts/test/unit/mock_fb_data.js');
requireApp('communications/contacts/test/unit/mock_contacts_list_obj.js');
require('/shared/test/unit/mocks/mock_indexedDB.js');
requireApp('communications/contacts/test/unit/mock_cookie.js');
requireApp('communications/contacts/js/fb/datastore_migrator.js');


var realindexedDB, realFbData, realContacts,
realRemoveIdleObserver, realCookie, mockIndexedDB;

if (!this.realFbData) {
  this.realFbData = null;
}

if (!this.fb) {
  this.fb = null;
}

if (!this.contacts) {
  this.contacts = null;
}

if (!this.realContacts) {
  this.realContacts = null;
}

if (!this.realRemoveIdleObserver) {
  this.realRemoveIdleObserver = null;
}

if (!this.realCookie) {
  this.realCookie = null;
}

if (!this.utils) {
  this.utils = null;
}

if (!this.mockIndexedDB) {
  this.mockIndexedDB = null;
}

suite('IndexedDB --> Datastore migration', function() {
  var idbShortData = {
    '123456': {
      uid: '123456'
    },
    '567890': {
      uid: '567890'
    }
  };

  var idbLongData = {
    '123456': {
      uid: '123456'
    },
    '567890': {
      uid: '567890'
    },
    '987654': {
      uid: '987654'
    },
    '387643': {
      uid: '387643'
    },
    '999999': {
      uid: '999999'
    },
    '111111': {
      uid: '111111'
    }
  };

  suiteSetup(function() {
    realFbData = window.fb && window.fb.contacts;
    window.fb = window.fb || {};

    realContacts = window.contacts && window.contacts.List;
    window.contacts = window.contacts || {};
    window.contacts.List = MockContactsListObj;

    realRemoveIdleObserver = navigator.removeIdleObserver;
    navigator.removeIdleObserver = function() { };

    realCookie = window.utils && window.utils.cookie;
    window.utils = window.utils || {};
    window.utils.cookie = MockCookie;

    mockIndexedDB = new MockIndexedDB();
  });

  function testMigration(records, done) {
    var existingRecords = records.existing;
    var inputRecords = records.input;
    var inErrorRecords = records.inError;

    var db;

    var contactsWriter = new MockFbContactsWriterObj();
    window.fb.contacts = contactsWriter;
    contactsWriter.storedData = existingRecords || contactsWriter.storedData;
    MockCookie.data = {};

    var numDeletedDBs = mockIndexedDB.deletedDbs.length;
    var deleteError = [];
    if (inErrorRecords && inErrorRecords.deleted) {
      deleteError = inErrorRecords.deleted;
    }

    var saveError = [];
    if (inErrorRecords && inErrorRecords.saved) {
      saveError = inErrorRecords.saved;
      contactsWriter.savedError = saveError;
    }

    var migrationDone = function migrationDone(saveErrors) {
      var deletedObjs = db.deletedData;
      var numAddedObjs = contactsWriter.getLength();

      assert.equal(Object.keys(inputRecords).length,
                   numAddedObjs + saveError.length);
      assert.equal(deletedObjs.length + deleteError.length, numAddedObjs);
      for (var aObjUid in contactsWriter.storedData) {
        assert.isTrue(deletedObjs.indexOf(aObjUid) !== -1 ||
                      deleteError.indexOf(aObjUid) !== -1);
      }

      assert.isTrue(db.isClosed === true);

      if (!saveErrors) {
        // Check that cookies are correctly set
        assert.equal(MockCookie.data['fbMigrated'], true);
        assert.isTrue(mockIndexedDB.deletedDbs.length === numDeletedDBs + 1);
      }
      else {
        assert.isTrue(mockIndexedDB.deletedDbs.length === numDeletedDBs);
      }

      done();
    };

    var req = window.indexedDB.open('Fake_Database');

    req.onsuccess = function() {
      db = req.result;
      db.storedData = JSON.parse(JSON.stringify(inputRecords));

      var migrationObj = new DatastoreMigration(db);
      migrationObj.onmigrationdone = migrationDone;
      migrationObj.onerror = done;
      if (inErrorRecords && inErrorRecords.deleted) {
        db.options.deleteInError = inErrorRecords.deleted;
      }
      migrationObj.onidle();
    };
    req.onerror = done;
  }

  test('Seamless migration. Total records < slice size. No failures',
    function(done) {
      testMigration({ input: idbShortData }, done);
  });

  test('Seamless migration. Total records > slice size. No failures',
    function(done) {
      testMigration({ input: idbLongData }, done);
  });

  test('If indexedDB does not contain records, nothing is done',
    function(done) {
      testMigration({ input: {} }, done);
  });

  test('If indexedDB is in error, an error is reported', function(done) {
    var contactsWriter = new MockFbContactsWriterObj();
    window.fb.contacts = contactsWriter;
    MockCookie.data = {};

    mockIndexedDB.options.inErrorDbs = ['Gaia_Facebook_Friends'];

    var migrationObj = new DatastoreMigration();
    migrationObj.onerror = function() {
      assert.equal(contactsWriter.getLength(), 0);
      assert.isFalse((MockCookie.data['fbMigrated'] === true));
      done();
    };
    migrationObj.onmigrationdone = function() {
      assert.fail('Migration done');
      done();
    };
    migrationObj.onidle();
  });

  test('If indexedDB does not exist, nothing is done', function(done) {
    var contactsWriter = new MockFbContactsWriterObj();
    window.fb.contacts = contactsWriter;
    MockCookie.data = {};

    mockIndexedDB.options.upgradeNeededDbs = ['Gaia_Facebook_Friends'];
    mockIndexedDB.options.inErrorDbs = [];

    var migrationObj = new DatastoreMigration();
    migrationObj.onmigrationdone = function() {
      assert.equal(contactsWriter.getLength(), 0);
      assert.equal(MockCookie.data['fbMigrated'], true);
      done();
    };
    migrationObj.onidle();
  });

  test('If a migrated record already exists the migration continues seamlessly',
    function(done) {
      var existing = Object.create(null);
      existing['123456'] = {
        uid: '123456'
      };
      testMigration({
        input: idbLongData,
        existing: existing
      }, done);
  });

  test('If a record cannot be deleted the migration continues seamlessly',
    function(done) {
      var inError = {
        deleted: ['987654']
      };
      testMigration({
        input: idbLongData,
        inError: inError
      }, done);
  });

  test('If cursor cannot be opened the process can resume later',
    function(done) {
      var contactsWriter = new MockFbContactsWriterObj();
      window.fb.contacts = contactsWriter;

      var db;
      var req = window.indexedDB.open('Fake_Database');

      req.onsuccess = function() {
        db = req.result;
        db.options.cursorOpenInError = true;
        var migratorObj = new DatastoreMigration(db);
        db.storedData = JSON.parse(JSON.stringify(idbShortData));
        migratorObj.onerror = function() {
          assert.ok('Migration error');
          migratorObj.onmigrationdone = function() {
            assert.ok('Migration done');
            done();
          };
          delete db.options.cursorOpenInError;
          // Need to restore the Database before calling onidle one more time
          migratorObj.db = db;
          migratorObj.onidle();
        };
        migratorObj.onmigrationdone = function() {
          assert.fail('Migration done', 'Shouldnt');
        };
        migratorObj.onidle();
      };

      req.onerror = done;
  });

  test(
    'If a record cannot be saved the process can continue without losing data',
    function(done) {
       var inError = {
        saved: ['387643']
      };
      testMigration({
        input: idbLongData,
        inError: inError
      }, done);
  });

  suiteTeardown(function() {
    window.fb.contacts = realFbData;
    window.contacts.List = realContacts;
    window.utils.cookie = realCookie;
    navigator.removeIdleObserver = realRemoveIdleObserver;
  });
});
