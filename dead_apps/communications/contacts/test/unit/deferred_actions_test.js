'use strict';
/* global MockImportStatusData, Mockfb, MockContacts, MockNavigationStack,
   MockCookie, DeferredActions, fb */

require('/shared/js/lazy_loader.js');
requireApp('communications/contacts/test/unit/mock_import_status_data.js');
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
      realFb,
      realFbLoader;

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

      realFbLoader = window.fbLoader;

      window.fbLoader = {
        loaded: true
      };
    });

    suiteTeardown(function() {
      navigator.addIdleObserver.restore();
      navigator.removeIdleObserver.restore();

      window.fbLoader = realFbLoader;
    });

    setup(function() {
      MockImportStatusData.clear();
      MockCookie.update({});
    });

    test('FB sync scheduling when synced in ftu', function(done) {
      sinon.stub(Mockfb.sync, 'scheduleNextSync', function() {
        done(function() {
          Mockfb.sync.scheduleNextSync.restore();
          assert.ok('passed');
        });
      });

      MockCookie.update({
        fbMigrated: true,
        accessTokenMigrated: true
      });

      window.ImportStatusData.put(
        Mockfb.utils.SCHEDULE_SYNC_KEY, Date.now()).then(function() {
          DeferredActions.execute();
      });
    });

    test('Facebook not yet loaded', function(done) {
      var currentFbLoader = window.fbLoader;

      window.fbLoader = {
        loaded: false
      };

      sinon.stub(Mockfb.sync, 'scheduleNextSync', function() {
        done(function() {
          Mockfb.sync.scheduleNextSync.restore();
          window.fbLoader = currentFbLoader;
          assert.ok('passed');
        });
      });

      MockCookie.update({
        fbMigrated: true,
        accessTokenMigrated: true
      });

      window.ImportStatusData.put(
        Mockfb.utils.SCHEDULE_SYNC_KEY, Date.now()).then(function() {
          DeferredActions.execute();
          window.dispatchEvent(new CustomEvent('facebookLoaded'));
      });
    });

    test('Version migration triggered when needed', function(done) {
      sinon.stub(window.LazyLoader, 'load', function(file) {
        if (file.indexOf('migrator.js') > -1) {
          done(function() {
            window.LazyLoader.load.restore();
            assert.ok('passed');
          });
        }
      });

      MockCookie.update({
        fbScheduleDone: true
      });

      DeferredActions.execute();
    });

    suite('Facebook sanity checks', function() {
      var spy;

      suiteSetup(function() {
        fb.utils = {
          clearFbData: function() {
            return {
              result: {
                set onsuccess(cb2) {
                  cb2();
                }
              },
              set onsuccess(cb) {
                cb();
              }
            };
          }
        };

        spy = sinon.spy(fb.utils, 'clearFbData');
      });

      suiteTeardown(function() {
        // Left things as they were
        spy.restore();
        delete fb.utils;
      });

      test('Not called when not needed', function() {
        spy.reset();

        MockCookie.update({
          fbCleaningInProgress: 0
        });

        DeferredActions.execute();

        assert.isFalse(spy.calledOnce);
        assert.equal(MockCookie.data.fbCleaningInProgress, 0);
      });

      test('Clear Facebook data called when needed', function() {
        MockCookie.update({
          fbCleaningInProgress: 1
        });

        DeferredActions.execute();

        assert.isTrue(spy.calledOnce);
        assert.equal(MockCookie.data.fbCleaningInProgress, 0);
      });

      test('Not called when num retries exceeded', function() {
        var times = 5;
        spy.reset();

        MockCookie.update({
          fbCleaningInProgress: times
        });

        DeferredActions.execute();

        assert.isFalse(spy.calledOnce);
        assert.equal(MockCookie.data.fbCleaningInProgress, times);
      });
    });
  });
});
