'use strict';

/* global Cache */
/* global Contacts */
/* global ICEData */
/* global MockContactsListObj */
/* global MocksHelper */
/* global MockMozContacts */
/* global MockMozL10n */
/* global MockNavigationStack */
/* global MockUtils */
/* global MockLoader */

requireApp('communications/contacts/test/unit/mock_header_ui.js');
requireApp('communications/contacts/test/unit/mock_activities.js');
requireApp('communications/contacts/test/unit/mock_l10n.js');
requireApp('communications/contacts/test/unit/mock_cache.js');
requireApp('communications/contacts/test/unit/mock_navigation.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
requireApp('communications/contacts/test/unit/mock_contacts_list_obj.js');
requireApp('communications/contacts/test/unit/mock_event_listeners.js');
requireApp('communications/contacts/test/unit/mock_asyncstorage.js');
requireApp('communications/contacts/test/unit/mock_loader.js');
requireApp('communications/contacts/services/contacts.js');
requireApp('communications/contacts/js/utilities/ice_data.js');
require('/shared/test/unit/mocks/mock_ice_store.js');
require('/shared/test/unit/mocks/mock_mozContacts.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');

var mocksForCacheEviction = new MocksHelper([
  'ActivityHandler',
  'asyncStorage',
  'Cache',
  'Contacts',
  'ICEStore',
  'LazyLoader',
  'HeaderUI'
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

suite('Contacts', function() {
  var realNavigationStack;
  var realMozL10n;
  var realContacts;
  var realUtils;
  var mockNavigation;
  var realMozContacts;
  var realLoader;

  mocksForCacheEviction.attachTestHelpers();

  suiteSetup(function(done) {
    mocksForCacheEviction.suiteSetup();

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockMozL10n;

    realMozContacts = navigator.mozContacts;
    navigator.mozContacts = MockMozContacts;

    realContacts = window.contacts;
    window.contacts = {};
    window.contacts.List = MockContactsListObj;

    realUtils = window.utils;
    window.utils = MockUtils;

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
    window.loader = realLoader;

    window.navigationStack.restore();
    window.navigationStack = realNavigationStack;
  });

  setup(function() {
    navigator.addIdleObserver = function() {};

    loadBodyHTML('/contacts/index.html');

    Contacts.init();
    mockNavigation = window.navigationStack.firstCall.thisValue;

    navigator.mozL10n.fireOnce();
  });

  suite('oncontactchange', function() {
    var evictSpy;

    setup(function() {
      evictSpy = sinon.spy(Cache, 'evict');
    });

    teardown(function() {
      evictSpy.restore();
    });

    test('Should evict cache', function() {
      var evt = new CustomEvent('contactchange');
      navigator.mozContacts.dispatchEvent(evt);
      sinon.assert.calledOnce(Cache.evict);
    });
  });

  suite('ICE', function() {
    var evictSpy;

    setup(function() {
      evictSpy = sinon.spy(Cache, 'evict');
    });

    teardown(function() {
      evictSpy.restore();
    });

    test('Setting a contact as ICE should evict cache', function() {
      ICEData.setICEContact(2, 1, true).then(function() {
        sinon.assert.calledOnce(Cache.evict);
      });
    });
  });

  suite('Locale change', function() {
    var maybeEvictSpy;

    setup(function() {
      maybeEvictSpy = sinon.spy(Cache, 'maybeEvict');
      window.contacts = realContacts;
      navigator.mozL10n.fireReady();
    });

    teardown(function() {
      maybeEvictSpy.restore();
    });

    test('Locale change should evict cache', function() {
      sinon.assert.calledOnce(Cache.maybeEvict);
    });
  });

});
