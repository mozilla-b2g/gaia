/* global requireApp, suite, suiteSetup, suiteTeardown, setup, teardown, test,
   assert, sinon, supportContactsCustomizer */

'use strict';

requireApp('operatorvariant/test/unit/mock_navigator_moz_settings.js');

requireApp('operatorvariant/js/customizers/customizer.js');
requireApp('operatorvariant/js/customizers/support_contacts_customizer.js');

suite('Support contacts customizer >', function() {
  var createLockSpy;
  var realSettings;
  const SUPPORT_CONTACTS_KEYS_VALUES = {
    'onlinesupport': {
      'title': 'Mozilla Support',
      'href': 'http://test.mozilla.org/support'
    },
    'callsupport1': {
      'title': 'Call Support (Primary)',
      'href': 'tel:14155550001'
    },
    'callsupport2': {
      'title': 'Call Support (Secondary)',
      'href': 'tel:14155550002'
    }
  };

  suiteSetup(function() {
    realSettings = navigator.mozSettings;
    navigator.mozSettings = window.MockNavigatorSettings;
    createLockSpy = sinon.spy(navigator.mozSettings, 'createLock');
  });

  suiteTeardown(function() {
    navigator.mozSettings = realSettings;
    createLockSpy.restore();
  });

  setup(function() {
    createLockSpy.reset();
  });

  teardown(function() {
    navigator.mozSettings.mTeardown();
  });

  test(' set > ', function() {
    supportContactsCustomizer.set(SUPPORT_CONTACTS_KEYS_VALUES);
    assert.isTrue(createLockSpy.calledOnce);
  });
});
