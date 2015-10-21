'use strict';

/* global Contacts, contacts, Loader, ActivityHandler, LazyLoader,
          MockContactsListObj, MockCookie, MockMozL10n,
          MockNavigationStack, MockUtils, MocksHelper,
          MockContactAllFields, MockContactDetails,
          MockContactsSearch, MockContactsSettings, Mockfb, MockLoader,
          MockImportStatusData, MockMozContacts, ContactsService, HeaderUI
*/

requireApp('communications/contacts/js/param_utils.js');
requireApp('communications/contacts/services/contacts.js');
requireApp('communications/contacts/test/unit/mock_l10n.js');
requireApp('communications/contacts/test/unit/mock_cache.js');
requireApp('communications/contacts/test/unit/mock_contacts_list_obj.js');
requireApp('communications/contacts/test/unit/mock_cookie.js');
requireApp('communications/contacts/test/unit/mock_datastore_migrator.js');
requireApp('communications/contacts/test/unit/mock_event_listeners.js');
requireApp('communications/contacts/test/unit/mock_navigation.js');
// requireApp('communications/contacts/test/unit/mock_main_navigation.js');
requireApp('communications/contacts/test/unit/mock_activities.js');
requireApp('communications/contacts/test/unit/mock_contacts_details.js');
requireApp('communications/contacts/test/unit/mock_contacts_search.js');
requireApp('communications/contacts/test/unit/mock_contacts_settings.js');
requireApp('communications/contacts/test/unit/mock_fb.js');
requireApp('communications/contacts/test/unit/mock_import_status_data.js');
requireApp('communications/contacts/test/unit/mock_loader.js');
require('/shared/test/unit/mocks/mock_mozContacts.js');

require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_contact_all_fields.js');

var mocksForStatusBar = new MocksHelper([
  'ActivityHandler',
  'Cache',
  'DatastoreMigration',
  'LazyLoader'
]).init();

if (!window.navigationStack) {
  window.navigationStack = null;
}
if (!window.contacts) {
  window.contacts = null;
}
if (!window.utils) {
  window.utils = null;
}
if (!navigator.mozContacts) {
  navigator.mozContacts = null;
}

var globals = ['COMMS_APP_ORIGIN',
               'TAG_OPTIONS',
               '_',
               'asyncScriptsLoaded',
               'SCALE_RATIO',
               'Contacts'];
globals.forEach(function(item) {
  if (!window[item]) {
    window[item] = null;
  }
});

suite('Contacts', function() {
  var realNavigationStack;
  var realMozL10n;
  var realContacts;
  var realUtils;
  var realFb;
  var realImportStatusData;
  var mockNavigation;
  var realMozContacts;
  var realLoader;

  mocksForStatusBar.attachTestHelpers();

  suiteSetup(function(done) {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockMozL10n;

    sinon.spy(navigator.mozL10n, 'once');

    realMozContacts = navigator.mozContacts;
    navigator.mozContacts = MockMozContacts;

    realContacts = window.contacts;
    window.contacts = {};
    window.contacts.List = MockContactsListObj;
    window.contacts.Details = MockContactDetails;
    window.Search = MockContactsSearch;
    window.contacts.Settings = MockContactsSettings;

    realUtils = window.utils;
    window.utils = MockUtils;
    window.utils.cookie = MockCookie;

    realFb = window.fb;
    window.fb = Mockfb;

    realImportStatusData = window.ImportStatusData;
    window.ImportStatusData = MockImportStatusData;

    realNavigationStack = window.navigationStack;
    window.navigationStack = MockNavigationStack;

    realLoader = window.Loader;
    window.Loader = MockLoader;

    sinon.spy(window, 'navigationStack');
    requireApp('communications/contacts/js/utilities/performance_helper.js');
    requireApp('communications/contacts/js/main_navigation.js');
    requireApp('communications/contacts/js/contacts.js', done);
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    navigator.mozContacts = realMozContacts;
    window.contacts = realContacts;
    window.utils = realUtils;
    window.fb = realFb;
    window.ImportStatusData = realImportStatusData;
    window.Loader = realLoader;

    window.navigationStack.restore();
    window.navigationStack = realNavigationStack;
  });

  setup(function(done) {
    this.sinon.spy(window.utils.PerformanceHelper, 'chromeInteractive');
    this.sinon.spy(window.utils.PerformanceHelper, 'contentInteractive');
    loadBodyHTML('/contacts/index.html');

    window.ImportStatusData.clear();

    navigator.addIdleObserver = function() {};

    // We don't want to trigger migrations in this test suite.
    MockCookie.data = {
      fbMigrated: true,
      accessTokenMigrated: true
    };

    Contacts.init();
    mockNavigation = window.navigationStack.firstCall.thisValue;

    requireApp('communications/contacts/js/header_ui.js', done);

    navigator.mozL10n.fireOnce();
  });

  test('hashchange home', function(done) {
    this.sinon.spy(mockNavigation, 'home');
    window.location.hash = '#home';
    setTimeout(function() {
      sinon.assert.called(mockNavigation.home);
      done();
    });
  });

  test('mozL10n initialized', function() {
    sinon.assert.calledOnce(navigator.mozL10n.once);
    sinon.assert.calledOnce(window.utils.PerformanceHelper.chromeInteractive);
    sinon.assert.calledOnce(window.utils.PerformanceHelper.contentInteractive);
  });

  suite('on contacts change', function() {
    var mozContact = null;

    setup(function() {
      mozContact = new MockContactAllFields();
      Contacts.setCurrent(mozContact);

      this.sinon.stub(
        ContactsService,
        'get',
        function(id, cb) {
          // Return the contact + additional FB info
          cb(
            mozContact,
            {
              id: 'FBID',
              email: [
                {
                  type: ['work'],
                  value: 'myfbemail@email.com'
                }
              ]
            }
          );
        }
      );

      this.sinon.stub(contacts.List, 'refresh', function(id, cb) {
        cb();
      });
    });

    test('> FB contact update sends MozContacts info', function() {

      mockNavigation._currentView = 'view-contact-details';
      navigator.mozContacts.dispatchEvent({
        type: 'contactchange',
        contactID: mozContact.id,
        reason: 'update'
      });

      sinon.assert.called(ContactsService.get);
      sinon.assert.called(contacts.List.refresh);

      var argument = contacts.List.refresh.getCall(0).args[0];
      assert.isTrue(Array.isArray(argument.email));
      argument.email.forEach(function onEmail(email) {
        assert.isTrue(email.value === 'myfbemail@email.com');
      });
    });

    suite('> Custom contact change', function() {
      test('> Trigger custom event on contact change', function(done) {
        Contacts.onLocalized();

        mockNavigation._currentView = 'view-contact-details';
        document.addEventListener('contactChanged', function(e) {
          assert.equal(e.detail.contactID, 1234567);
          done();
        });

        navigator.mozContacts.dispatchEvent({
          type: 'contactchange',
          contactID: 1234567,
          reason: 'update'
        });
      });
    });
  });

  suite('Controller actions', function() {
    var navigation;
    setup(function() {
      navigation = window.navigationStack.firstCall.thisValue;
      this.sinon.spy(navigation, 'back');
      this.sinon.spy(navigation, 'home');
      this.sinon.spy(window.ActivityHandler, 'postCancel');
    });
    test('> go back', function() {
      Contacts.goBack();
      sinon.assert.called(navigation.back);
      navigation.back.restore();
    });
    test('> handle cancel with activity', function() {
      ActivityHandler.currentlyHandling = true;

      Contacts.cancel();
      sinon.assert.called(window.ActivityHandler.postCancel);
      sinon.assert.called(navigation.home);

      window.ActivityHandler.currentlyHandling = false;
    });
    test('> handle cancel without activity', function() {
      Contacts.cancel();
      sinon.assert.called(navigation.back);
      sinon.assert.notCalled(window.ActivityHandler.postCancel);
    });

    suite('> CancelableActivity', function() {
      var prevCurrentlyHandling, prevActivityName, prevActivityDataType;

      suiteSetup(function() {
        prevCurrentlyHandling = window.ActivityHandler.currentlyHandling;
        prevActivityName = window.ActivityHandler.activityName;
        prevActivityDataType = window.ActivityHandler.activityDataType;
        window.ActivityHandler.currentlyHandling = true;
      });

      setup(function() {
      });

      teardown(function() {
        window.ActivityHandler.activityName = prevActivityName;
        window.ActivityHandler.activityDataType = prevActivityDataType;
      });

      suiteTeardown(function() {
        window.ActivityHandler.currentlyHandling = prevCurrentlyHandling;
      });

      test('> handling an activity', function() {
        ActivityHandler.isCancelable().then(() => {
          HeaderUI.updateHeader(true);
          // Settings is hidden
          assert.isTrue(HeaderUI.settingsButton.hidden);
          // Add contact is hidden
          assert.isTrue(HeaderUI.addButton.hidden);
          // Cancel is visible
          assert.equal(HeaderUI.header.getAttribute('action'), 'close');
          // Title shows CONTACTS
          assert.equal(HeaderUI.appTitleElement.getAttribute('data-l10n-id'),
            'contacts');
        });
      });
    });
  });

  suite('Select a contact from the list', function() {
    var theSelectedContact = {
      'id': '1',
      'name': ['John']
    };
    var navigation;
    setup(function() {
      navigation = window.navigationStack.firstCall.thisValue;
      this.sinon.stub(Loader, 'view', function(view, cb) {
        cb();
      });
      this.sinon.stub(ContactsService, 'get',
       function(id, cb) {
        cb(theSelectedContact, null);
      });

      this.sinon.spy(ActivityHandler, 'dataPickHandler');
      this.sinon.spy(contacts.Details, 'render');
      this.sinon.spy(navigation, 'go');
    });
  });

  suite('Async scripts loading', function() {
    var lastParams;
    var handler;
    setup(function() {
      this.sinon.stub(ContactsService, 'addListener', function(evt, cb) {
        handler = cb;
      });
      this.sinon.stub(LazyLoader, 'load', function(p, cb) {
        lastParams = p;
        cb();
      });
    });

    teardown(function() {
      handler = null;
    });

    test('> normal load of the scripts', function() {
      Contacts.onLocalized().then(() => {
        sinon.assert.called(window.dispatchEvent);
        assert.isNotNull(handler);
      });
    });

    test('> loading scripts while handling an open activity',
     function() {
      ActivityHandler.currentlyHandling = true;
      Contacts.onLocalized().then(() => {
        assert.isNotNull(handler);
        ActivityHandler.currentlyHandling = false;
      });
    });
  });

  suite('Visibility changes', function() {
    var navigation;
    function fireVisibilityChange() {
      document.dispatchEvent(new CustomEvent('visibilitychange'));
    }
    setup(function() {
      navigation = window.navigationStack.firstCall.thisValue;
      this.sinon.spy(ActivityHandler, 'isCancelable');
      this.sinon.spy(ActivityHandler, 'postCancel');
      this.sinon.stub(Loader, 'view', function(view, cb) {
        cb();
      });
    });

    test('> in settings view, should refresh for new timestamp', function() {
      sinon.stub(navigation, 'currentView', function() {
        return 'view-settings';
      });
      sinon.spy(contacts.Settings, 'updateTimestamps');

      fireVisibilityChange();

      sinon.assert.called(contacts.Settings.updateTimestamps);
      sinon.assert.notCalled(ActivityHandler.postCancel);

      navigation.currentView.restore();
      contacts.Settings.updateTimestamps.restore();
    });

    suite('> going to the background', function() {
      var realHidden;
      suiteSetup(function() {
        realHidden = Object.getOwnPropertyDescriptor(document, 'hidden');
        Object.defineProperty(document, 'hidden', {
          configurable: true,
          get: function() { return true; }
        });
      });
      suiteTeardown(function() {
        if (realHidden) {
          Object.defineProperty(document, 'hidden', realHidden);
        } else {
          delete document.hidden;
        }
      });
    });
  });
});
