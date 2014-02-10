/* global MockNavigatorSettings */
/* global sinon */
/* global dataIconStatubarCustomizer */

'use strict';

requireApp('communications/ftu/js/customizers/customizer.js');
requireApp(
  'communications/ftu/js/customizers/data_icon_statusbar_customizer.js');
requireApp('communications/ftu/test/unit/mock_navigator_moz_settings.js');

suite('Data icon statusbar customizer >', function() {
  var createLockSpy;
  var realSettings;
  const DATA_ICON_KEYS_VALUES = {
    'lte': '4GChng',
    'ehrpd': '4GChng',
    'hspa+': 'H+Chng',
    'hsdpa': 'HChng', 'hsupa': 'HChng', 'hspa': 'HChng'
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
    dataIconStatubarCustomizer.set(DATA_ICON_KEYS_VALUES);
    assert.isTrue(createLockSpy.calledOnce);
  });
});
