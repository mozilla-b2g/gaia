'use strict';

/* global Contacts, MockContactsListObj, MockCookie, MockMozL10n,
          MockNavigationStack, MocksHelper, MockUtils, MockActivities,
          MockContactAllFields, contacts */

requireApp('communications/contacts/test/unit/mock_l10n.js');
requireApp('communications/contacts/test/unit/mock_contacts_list_obj.js');
requireApp('communications/contacts/test/unit/mock_cookie.js');
requireApp('communications/contacts/test/unit/mock_datastore_migrator.js');
requireApp('communications/contacts/test/unit/mock_event_listeners.js');
requireApp('communications/contacts/test/unit/mock_navigation.js');
requireApp('communications/contacts/test/unit/mock_activities.js');
requireApp('communications/contacts/test/unit/mock_utils.js');

require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_contact_all_fields.js');
require('/shared/test/unit/load_body_html_helper.js');

var mocksForStatusBar = new MocksHelper([
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
if (!window.ActivityHandler) {
  window.ActivityHandler = null;
}
var globals = ['COMMS_APP_ORIGIN', '_', 'TAG_OPTIONS', 'asyncScriptsLoaded',
               'SCALE_RATIO', 'Contacts'];
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
  var realActivityHandler;

  mocksForStatusBar.attachTestHelpers();

  suiteSetup(function(done) {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockMozL10n;

    realContacts = window.contacts;
    window.contacts = {};
    window.contacts.List = MockContactsListObj;

    realUtils = window.utils;
    window.utils = MockUtils;
    window.utils.cookie = MockCookie;

    realActivityHandler = window.ActivityHandler;
    window.ActivityHandler = MockActivities;

    realNavigationStack = window.navigationStack;
    window.navigationStack = MockNavigationStack;
    sinon.spy(window, 'navigationStack');
    requireApp('communications/contacts/js/contacts.js', done);
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    window.contacts = realContacts;
    window.utils = realUtils;
    window.ActivityHandler = realActivityHandler;

    window.navigationStack.restore();
    window.navigationStack = realNavigationStack;
  });

  setup(function() {
    loadBodyHTML('/contacts/index.html');

    Contacts.init();
    mockNavigation = window.navigationStack.firstCall.thisValue;
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
      sinon.assert.calledWith(contacts.List.refresh, mozContact);

      var argument = contacts.List.refresh.getCall(0).args[0];
      assert.isTrue(Array.isArray(argument.email));
      argument.email.forEach(function onEmail(email) {
        assert.isTrue(email.value !== 'myfbemail@email.com');
      });
    });
  });
});
