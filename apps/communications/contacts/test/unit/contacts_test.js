'use strict';

/* global Contacts, contacts, ActivityHandler, SmsIntegration, LazyLoader,
          MockContactsListObj, MockCookie, MockMozL10n,
          MockNavigationStack, MockUtils, MocksHelper,
          MockContactAllFields, MockContactDetails, MockContactsNfc,
          MockContactsSearch, MockContactsSettings
*/

requireApp('communications/contacts/test/unit/mock_l10n.js');
requireApp('communications/contacts/test/unit/mock_contacts_list_obj.js');
requireApp('communications/contacts/test/unit/mock_cookie.js');
requireApp('communications/contacts/test/unit/mock_datastore_migrator.js');
requireApp('communications/contacts/test/unit/mock_event_listeners.js');
requireApp('communications/contacts/test/unit/mock_navigation.js');
requireApp('communications/contacts/test/unit/mock_activities.js');
requireApp('communications/contacts/test/unit/mock_sms_integration.js');
requireApp('communications/contacts/test/unit/mock_contacts_details.js');
requireApp('communications/contacts/test/unit/mock_contacts_nfc.js');
requireApp('communications/contacts/test/unit/mock_contacts_search.js');
requireApp('communications/contacts/test/unit/mock_contacts_settings.js');

require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_contact_all_fields.js');
require('/shared/test/unit/mocks/mock_performance_testing_helper.js');

var mocksForStatusBar = new MocksHelper([
  'DatastoreMigration',
  'LazyLoader',
  'SmsIntegration',
  'PerformanceTestingHelper',
  'ActivityHandler'
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
  var mockNavigation;

  mocksForStatusBar.attachTestHelpers();

  suiteSetup(function(done) {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockMozL10n;

    sinon.spy(navigator.mozL10n, 'once');

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

    realNavigationStack = window.navigationStack;
    window.navigationStack = MockNavigationStack;
    sinon.spy(window, 'navigationStack');
    requireApp('communications/contacts/js/contacts.js', done);
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    window.contacts = realContacts;
    window.utils = realUtils;

    window.navigationStack.restore();
    window.navigationStack = realNavigationStack;
  });

  setup(function() {
    loadBodyHTML('/contacts/index.html');

    Contacts.init();
    mockNavigation = window.navigationStack.firstCall.thisValue;
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
  });

  suite('on contacts change', function() {
    var mozContact = null;

    setup(function() {
      mozContact = new MockContactAllFields();
      Contacts.setCurrent(mozContact);

      this.sinon.stub(contacts.List, 'getContactById', function(id, cb) {
        // Return the contact + additional FB info
        cb(mozContact, {
          id: 'FBID',
          email: [
            {
              type: ['work'],
              value: 'myfbemail@email.com'
            }
          ]
        });
      });

      this.sinon.spy(contacts.List, 'refresh');
    });

    test('> FB contact update sends MozContacts info', function() {
      var evt = {
        contactID: mozContact.id,
        reason: 'update'
      };

      mockNavigation._currentView = 'view-contact-details';

      navigator.mozContacts.oncontactchange(evt);
      sinon.assert.pass(contacts.List.getContactById.called);
      sinon.assert.calledWith(contacts.List.getContactById, mozContact.id);
      sinon.assert.pass(contacts.List.refresh.called);
      sinon.assert.called(contacts.List.refresh);

      var argument = contacts.List.refresh.getCall(0).args[0];
      assert.isTrue(Array.isArray(argument.email));
      argument.email.forEach(function onEmail(email) {
        assert.isTrue(email.value === 'myfbemail@email.com');
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
      var settingsButton, cancelButton, addButton, appTitleElement;

      setup(function() {
        settingsButton = document.getElementById('settings-button');
        cancelButton = document.getElementById('cancel_activity');
        addButton = document.getElementById('add-contact-button');
        appTitleElement = document.getElementById('app-title');
      });

      test('> handling an activity', function() {
        window.ActivityHandler.currentlyHandling = true;
        Contacts.checkCancelableActivity();

        // Settings is hidden
        assert.isTrue(settingsButton.classList.contains('hide'));
        // Add contact is hidden
        assert.isTrue(addButton.classList.contains('hide'));
        // Cancel is visible
        assert.isFalse(cancelButton.classList.contains('hide'));
        // Title shows CONTACTS
        assert.equal(appTitleElement.textContent, 'contacts');

        window.ActivityHandler.currentlyHandling = false;
      });

      test('>selecting from the list', function() {
        window.contacts.List.isSelecting = true;

        Contacts.checkCancelableActivity();

        // Cancel is hidden
        assert.isTrue(cancelButton.classList.contains('hide'));
        // Settings is visible
        assert.isFalse(addButton.classList.contains('hide'));
        // Add contact is visible
        assert.isFalse(settingsButton.classList.contains('hide'));
        // Title shows SELECT
        assert.equal(appTitleElement.textContent, 'selectContact');

        window.contacts.List.isSelecting = false;
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
      this.sinon.stub(window.contacts.List, 'getContactById',
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
      sinon.assert.called(window.contacts.List.getContactById);
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

        sinon.assert.called(window.contacts.List.getContactById);
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

        sinon.assert.called(window.contacts.List.getContactById);
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
    setup(function() {
      this.sinon.spy(window, 'dispatchEvent');
      this.sinon.stub(LazyLoader, 'load', function(p, cb) {
        lastParams = p;
        cb();
      });
    });
    test('> normal load of the scripts', function() {
      Contacts.onLocalized();

      sinon.assert.called(window.dispatchEvent);
      assert.isNotNull(navigator.mozContacts.oncontactchange);
    });
    test('> loading scripts with nfc enabled', function() {
      var oldNFC = navigator.mozNfc;
      navigator.mozNfc = true;
      Contacts.onLocalized();

      sinon.assert.called(window.dispatchEvent);
      assert.isNotNull(navigator.mozContacts.oncontactchange);
      assert.isTrue(lastParams.indexOf('/contacts/js/nfc.js') > -1);

      navigator.mozNfc = oldNFC;
    });
    test('> loading scripts while handling an open activity',
     function() {
      ActivityHandler.currentlyHandling = true;
      Contacts.onLocalized();

      sinon.assert.called(window.dispatchEvent);
      assert.isNull(navigator.mozContacts.oncontactchange);

      ActivityHandler.currentlyHandling = false;
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

    test('> on visibility change: visible', function() {
      MockMozL10n.realL10nCB();
      fireVisibilityChange();

      sinon.assert.called(Contacts.checkCancelableActivity);
      sinon.assert.notCalled(ActivityHandler.postCancel);
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

      test('> handling an activity, should be cancelled', function() {
        ActivityHandler.currentlyHandling = true;

        fireVisibilityChange();

        sinon.assert.called(ActivityHandler.postCancel);
        ActivityHandler.currentlyHandling = false;
      });
    });
  });
});
