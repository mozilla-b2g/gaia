'use strict';

/* global Contacts, MockContactsListObj, MockCookie, MockMozL10n,
          MockNavigationStack, MocksHelper, MockUtils */

requireApp('communications/contacts/test/unit/mock_l10n.js');
requireApp('communications/contacts/test/unit/mock_contacts_list_obj.js');
requireApp('communications/contacts/test/unit/mock_cookie.js');
requireApp('communications/contacts/test/unit/mock_datastore_migrator.js');
requireApp('communications/contacts/test/unit/mock_event_listeners.js');
requireApp('communications/contacts/test/unit/mock_navigation.js');

require('/shared/test/unit/mocks/mock_lazy_loader.js');

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
    document.body.innerHTML = '<h1>' +
      '<div id="cancel_activity"></div>' +
      '</h1>';

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
});
