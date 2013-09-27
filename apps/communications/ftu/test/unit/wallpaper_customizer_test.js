'use strict';

requireApp('communications/ftu/js/customizers/customizer.js');
requireApp('communications/ftu/js/customizers/wallpaper_customizer.js');
requireApp('communications/ftu/test/unit/mock_navigator_moz_settings.js');

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
