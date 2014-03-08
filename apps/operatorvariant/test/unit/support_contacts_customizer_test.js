/* global requireApp, suite, suiteSetup, MockNavigatorSettings, sinon,
   suiteTeardown, setup, test, supportContactsCustomizer, assert*/

'use strict';

requireApp('operatorvariant/js/customizers/customizer.js');
requireApp('operatorvariant/js/customizers/support_contacts_customizer.js');
requireApp('operatorvariant/test/unit/mock_navigator_moz_settings.js');

suite('Support contacts customizer >', function() {
  var createLockSpy, realSettings;
  const SUPPORT_CONTACTS_KEYS_VALUES =
          {
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
    navigator.mozSettings = MockNavigatorSettings;
    createLockSpy = sinon.spy(MockNavigatorSettings, 'createLock');
  });

  suiteTeardown(function() {
    navigator.mozSettings = realSettings;
    realSettings = null;
    createLockSpy.restore();
  });

  setup(function() {
    createLockSpy.reset();
  });

  test(' set > ', function() {
    supportContactsCustomizer.set(SUPPORT_CONTACTS_KEYS_VALUES);
    assert.isTrue(createLockSpy.calledOnce);
  });
});
