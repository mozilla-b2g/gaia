/* global requireApp, suite, suiteSetup, sinon, MockNavigatorSettings,
   suiteTeardown, setup, test, wallpaperCustomizer, assert*/

'use strict';

requireApp('operatorvariant/js/customizers/customizer.js');
requireApp('operatorvariant/js/customizers/wallpaper_customizer.js');
requireApp('operatorvariant/test/unit/mock_navigator_moz_settings.js');

suite('WallpaperCustomizer >', function() {
  var createLockSpy, realSettings;

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
    wallpaperCustomizer.set('ABCDE');
    assert.isTrue(createLockSpy.calledOnce);
  });
});
