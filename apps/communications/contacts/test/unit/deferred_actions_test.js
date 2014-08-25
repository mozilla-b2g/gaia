'use strict';
/* global MockImportStatusData, Mockfb, MockContacts, MockNavigationStack,
   MockCookie */

requireApp('communications/contacts/test/unit/mock_import_status_data.js');
requireApp('communications/contacts/test/unit/mock_fb.js');
requireApp('communications/contacts/test/unit/mock_navigation.js');
requireApp('communications/contacts/test/unit/mock_contacts_list_obj.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
requireApp('communications/contacts/test/unit/mock_cookie.js');
requireApp('communications/contacts/test/unit/mock_fb.js');


if (!navigator.addIdleObserver) {
  navigator.addIdleObserver = function() {};
}

if (!navigator.removeIdleObserver) {
  navigator.removeIdleObserver = function() {};
}

if (!window.ImportStatusData) {
  window.ImportStatusData = null;
}

if (!window.LazyLoader) {
  window.LazyLoader = {load: function(){}};
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
    sinon.stub(window.LazyLoader, 'load', function(files, callback) {
      callback();
    });
  });

  suiteTeardown(function() {
    window.ImportStatusData = realImportStatusData;
    window.LazyLoader.load.restore();
  });

  suite('Post rendering actions', function() {
    var realAddIdleObserver, realRemoveIdleObserver;

    suiteSetup(function() {
      realAddIdleObserver = navigator.addIdleObserver;
      navigator.addIdleObserver = function(idleObserver) {
        idleObserver.onidle();
      };

      realRemoveIdleObserver = navigator.removeIdleObserver;
      navigator.removeIdleObserver = function() {};

      sinon.stub(navigator, 'addIdleObserver', function(idleObserver) {
        idleObserver.onidle();
      });

      sinon.stub(navigator, 'removeIdleObserver', function() {});
    });

    suiteTeardown(function() {
      navigator.addIdleObserver.restore();
      navigator.removeIdleObserver.restore();
      navigator.addIdleObserver = realAddIdleObserver;
      navigator.removeIdleObserver = realRemoveIdleObserver;
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

      window.ImportStatusData.put(Mockfb.utils.SCHEDULE_SYNC_KEY, Date.now())
        .then(function() {
          requireApp('communications/contacts/js/deferred_actions.js');
        }
      );
    });
  });
});
