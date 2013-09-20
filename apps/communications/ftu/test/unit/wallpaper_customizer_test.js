'use strict';

requireApp('communications/ftu/js/customizers/wallpaper_customizer.js');
requireApp('communications/ftu/test/unit/mock_navigator_moz_settings.js');

var resourcesDir = '/ftu/test/unit';
var wallpaperPath = '/resources/wallpaper.jpg';
var fullPath;

suite('wallpaper customizer >', function() {

  suiteSetup(function() {
    fullPath = resourcesDir + wallpaperPath;
  });

  suiteTeardown(function() {
    fullPath = null;
  });

  test(' retrieve file ok ', function(done) {
    WallpaperCustomizer.retrieveWallpaper(fullPath, function() {
      done();
    });
  });

  test(' retrieve file fail ', function(done) {
    var onsuccess = function() {};
    WallpaperCustomizer.retrieveWallpaper('wrongPath.png', onsuccess,
     function() {
      done();
    });
  });

  suite(' setWallpaperSetting > ', function() {
    var createLockSpy;
    var realSettings;
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

    teardown(function() {
      createLockSpy.reset();
    });

    test(' requested', function() {
      WallpaperCustomizer.setWallpaperSetting('ABCDE');
      assert.isTrue(createLockSpy.calledOnce);
    });
  });
});
