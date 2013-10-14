'use strict';

requireApp('communications/ftu/js/customizers/customizer.js');
requireApp('communications/ftu/js/customizers/wallpaper_customizer.js');
requireApp('communications/ftu/js/customizers/support_contacts_customizer.js');
requireApp('communications/ftu/test/unit/mock_navigator_moz_settings.js');

suite('Support contacts customizer >', function() {
  var createLockSpy, realSettings;
  const SUPPORT_CONTACTS_KEYS_VALUES = [
    {
      key: 'support.onlinesupport.title',
      value: 'Mozilla Support'
    },
    {
      key: 'support.onlinesupport.href',
      value: 'http://test.mozilla.org/support'
    },
    {
      key: 'support.callsupport1.title',
      value: 'Call Support (Primary)'
    },
    {
      key: 'support.callsupport1.href',
      value: 'tel:14155550001'
    },
    {
      key: 'support.callsupport2.title',
      value: 'Call Support (Secondary)'
    },
    {
      key: 'support.callsupport2.href',
      value: 'tel:14155550002'
    }
  ];
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
    wallpaperCustomizer.set(SUPPORT_CONTACTS_KEYS_VALUES);
    assert.isTrue(createLockSpy.calledOnce);
  });
});
