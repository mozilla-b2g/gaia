'use strict';
/* global MockImportStatusData, Mockfb, MockContacts, MockNavigationStack,
   MockCookie, DeferredActions*/

require('/shared/js/lazy_loader.js');
requireApp('communications/contacts/test/unit/mock_import_status_data.js');
requireApp('communications/contacts/test/unit/mock_fb.js');
requireApp('communications/contacts/test/unit/mock_navigation.js');
requireApp('communications/contacts/test/unit/mock_contacts_list_obj.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
requireApp('communications/contacts/test/unit/mock_cookie.js');
requireApp('communications/contacts/test/unit/mock_fb.js');
requireApp('communications/contacts/js/deferred_actions.js');


if (!navigator.addIdleObserver) {
  navigator.addIdleObserver = function() {};
}

if (!navigator.removeIdleObserver) {
  navigator.removeIdleObserver = function() {};
}

if (!window.ImportStatusData) {
  window.ImportStatusData = null;
}

if (!window.contacts) {
  window.contacts = null;
}

if (!window.utils) {
  window.utils = null;
}

if (!window.fb) {
  window.fb = null;
}


suite('Post rendering', function() {
  var realImportStatusData,
      realUtils,
      realFb;

  var mockNavigationStack;

  suiteSetup(function() {
    realImportStatusData = window.ImportStatusData;
    window.ImportStatusData = MockImportStatusData;

    window.Contacts = MockContacts;

    realUtils = window.utils;
    window.utils = {};
    window.utils.cookie = MockCookie;

    realFb = window.fb;
    window.fb = Mockfb;

    mockNavigationStack = new MockNavigationStack();
  });

  suiteTeardown(function() {
    window.ImportStatusData = realImportStatusData;
  });

  suite('Post rendering actions', function() {
    suiteSetup(function() {
      sinon.stub(navigator, 'addIdleObserver', function(idleObserver) {
        idleObserver.onidle();
      });

      sinon.stub(navigator, 'removeIdleObserver', function() {});
    });

    suiteTeardown(function() {
      navigator.addIdleObserver.restore();
      navigator.removeIdleObserver.restore();
    });

    setup(function() {
      MockImportStatusData.clear();
      MockCookie.update({});
    });

    test('FB sync scheduling when synced in ftu', function(done) {
      sinon.stub(Mockfb.sync, 'scheduleNextSync', function() {
        done(function() {
          Mockfb.sync.scheduleNextSync.restore();
        });
      });

      MockCookie.update({
        fbMigrated: true,
        accessTokenMigrated: true
      });

      window.ImportStatusData.put(Mockfb.utils.SCHEDULE_SYNC_KEY, Date.now())
        .then(function() {
          DeferredActions.execute();
        }
      );
    });

    test('Version migration triggered when needed', function(done) {
      sinon.stub(window.LazyLoader, 'load', function(file) {
        if (file.indexOf('migrator.js') > -1) {
          done();
        }
      });

      MockCookie.update({
        fbScheduleDone: true
      });

      DeferredActions.execute();
    });
  });
});
