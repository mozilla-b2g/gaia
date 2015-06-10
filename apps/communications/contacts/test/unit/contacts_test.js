'use strict';

/* global Contacts, contacts, ActivityHandler, SmsIntegration, LazyLoader,
          MockContactsListObj, MockCookie, MockMozL10n,
          MockNavigationStack, MockUtils, MocksHelper,
          MockContactAllFields, MockContactDetails, MockContactsNfc,
          MockContactsSearch, MockContactsSettings, Mockfb,
          MockImportStatusData, MockMozContacts, ContactsService
*/

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
requireApp('communications/contacts/test/unit/mock_sms_integration.js');
requireApp('communications/contacts/test/unit/mock_contacts_details.js');
requireApp('communications/contacts/test/unit/mock_contacts_nfc.js');
requireApp('communications/contacts/test/unit/mock_contacts_search.js');
requireApp('communications/contacts/test/unit/mock_contacts_settings.js');
requireApp('communications/contacts/test/unit/mock_fb.js');
requireApp('communications/contacts/test/unit/mock_import_status_data.js');
require('/shared/test/unit/mocks/mock_mozContacts.js');

require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_contact_all_fields.js');

var mocksForStatusBar = new MocksHelper([
  'ActivityHandler',
  'Cache',
  'DatastoreMigration',
  'LazyLoader',
  'SmsIntegration'
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
    window.contacts.NFC = MockContactsNfc;
    window.contacts.Search = MockContactsSearch;
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

    window.navigationStack.restore();
    window.navigationStack = realNavigationStack;
  });

  setup(function() {
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

    suite('> Send sms', function() {
      var number = '+445312973212';
      setup(function() {
        this.sinon.spy(SmsIntegration, 'sendSms');
      });

      test('> send sms', function() {
        Contacts.sendSms(number);

        sinon.assert.calledWith(SmsIntegration.sendSms, number);
      });

      test('> dont send sms while in an activity', function() {
        window.ActivityHandler.currentlyHandling = true;
        Contacts.sendSms(number);

        sinon.assert.notCalled(SmsIntegration.sendSms);
        window.ActivityHandler.currentlyHandling = false;
      });

      test('> send the sms if the activity is a OPEN one', function() {
        window.ActivityHandler.currentlyHandling = true;
        window.ActivityHandler.activityName = 'open';
        Contacts.sendSms(number);

        sinon.assert.calledWith(SmsIntegration.sendSms, number);

        window.ActivityHandler.currentlyHandling = false;
        window.ActivityHandler.activityName = 'view';
      });
    });

    suite('> CancelableActivity', function() {
      var settingsButton, header, addButton, appTitleElement,
          prevCurrentlyHandling, prevActivityName, prevActivityDataType;

      suiteSetup(function() {
        prevCurrentlyHandling = window.ActivityHandler.currentlyHandling;
        prevActivityName = window.ActivityHandler.activityName;
        prevActivityDataType = window.ActivityHandler.activityDataType;
        window.ActivityHandler.currentlyHandling = true;
      });

      setup(function() {
        settingsButton = document.getElementById('settings-button');
        header = document.getElementById('contacts-list-header');
        addButton = document.getElementById('add-contact-button');
        appTitleElement = document.getElementById('app-title');
      });

      teardown(function() {
        window.ActivityHandler.activityName = prevActivityName;
        window.ActivityHandler.activityDataType = prevActivityDataType;
      });

      suiteTeardown(function() {
        window.ActivityHandler.currentlyHandling = prevCurrentlyHandling;
      });

      function checkClassAdded(isFiltered, activityName, activityType) {
        window.ActivityHandler.activityName = activityName;
        window.ActivityHandler.activityDataType = [activityType];
        var classList = document.getElementById('groups-list').classList;
        Contacts.checkCancelableActivity();
        assert.isTrue(isFiltered === classList.contains('disable-fb-items'));
        classList.remove('disable-fb-items');
      }

      test('> handling an activity', function() {
        Contacts.checkCancelableActivity();

        // Settings is hidden
        assert.isTrue(settingsButton.hidden);
        // Add contact is hidden
        assert.isTrue(addButton.hidden);
        // Cancel is visible
        assert.equal(header.getAttribute('action'), 'close');
        // Title shows CONTACTS
        assert.equal(appTitleElement.getAttribute('data-l10n-id'), 'contacts');
      });

      test('> text/vcard pick activity disables Facebook contacts', function() {
        checkClassAdded(true, 'pick', 'text/vcard');
        checkClassAdded(false, 'open', 'text/vcard');
        checkClassAdded(false, 'open', 'webcontacts/contact');
        checkClassAdded(false, 'pick', 'webcontacts/contact');
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
      this.sinon.stub(Contacts, 'view', function(view, cb) {
        cb();
      });
      this.sinon.stub(ContactsService, 'get',
       function(id, cb) {
        cb(theSelectedContact, null);
      });

      this.sinon.spy(window.contacts.NFC, 'startListening');
      this.sinon.spy(ActivityHandler, 'dataPickHandler');
      this.sinon.spy(contacts.Details, 'render');
      this.sinon.spy(navigation, 'go');
    });

    test('> initializing details', function() {
      Contacts.showContactDetail('1');

      sinon.assert.called(Contacts.view);
      sinon.assert.called(ContactsService.get);
      sinon.assert.called(contacts.Details.render);
      sinon.assert.calledWith(navigation.go,
       'view-contact-details', 'go-deeper');
      sinon.assert.notCalled(ActivityHandler.dataPickHandler);

    });

    test('> when nfc enabled we need to listen to it', function() {
      var oldNFC = navigator.mozNfc;
      navigator.mozNfc = true;

      Contacts.showContactDetail('1');
      sinon.assert.called(window.contacts.NFC.startListening);
      sinon.assert.called(contacts.Details.render);
      sinon.assert.calledWith(navigation.go,
       'view-contact-details', 'go-deeper');
      sinon.assert.notCalled(ActivityHandler.dataPickHandler);

      navigator.mozNfc = oldNFC;
    });

    test('> when handling pick activity, don\'t navigate, send result',
      function() {
        ActivityHandler.currentlyHandling = true;
        ActivityHandler.activityName = 'pick';
        Contacts.showContactDetail('1');

        sinon.assert.called(ContactsService.get);
        sinon.assert.notCalled(contacts.Details.render);
        sinon.assert.notCalled(navigation.go);
        sinon.assert.called(ActivityHandler.dataPickHandler);

        ActivityHandler.currentlyHandling = false;
        ActivityHandler.activityName = 'open';
      }
    );

    test('> when handling import activity, navigate as normal',
      function() {
        ActivityHandler.currentlyHandling = true;
        ActivityHandler.activityName = 'import';
        Contacts.showContactDetail('1');

        sinon.assert.called(ContactsService.get);
        sinon.assert.called(contacts.Details.render);
        sinon.assert.called(navigation.go);
        sinon.assert.notCalled(ActivityHandler.dataPickHandler);

        ActivityHandler.currentlyHandling = false;
        ActivityHandler.activityName = 'open';
      }
    );

    test('> in search navigate deeper from search', function() {
      sinon.stub(contacts.Search, 'isInSearchMode', function() {
        return true;
      });

      Contacts.showContactDetail('1');

      sinon.assert.called(contacts.Details.render);
      sinon.assert.called(contacts.Search.isInSearchMode);
      sinon.assert.calledWith(navigation.go,
       'view-contact-details', 'go-deeper-search');
      sinon.assert.notCalled(ActivityHandler.dataPickHandler);

      contacts.Search.isInSearchMode.restore();
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
    test('> loading scripts with nfc enabled', function() {
      var oldNFC = navigator.mozNfc;
      navigator.mozNfc = true;
      Contacts.onLocalized().then(() => {
        assert.isNotNull(handler);
        assert.isTrue(lastParams.indexOf('/contacts/js/nfc.js') > -1);
        navigator.mozNfc = oldNFC;
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
      this.sinon.spy(Contacts, 'checkCancelableActivity');
      this.sinon.spy(ActivityHandler, 'postCancel');
      this.sinon.stub(Contacts, 'view', function(view, cb) {
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
