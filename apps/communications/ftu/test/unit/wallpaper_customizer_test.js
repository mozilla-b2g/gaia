'use strict';

requireApp('communications/ftu/js/customizers/wallpaper_customizer.js');
requireApp('communications/ftu/test/unit/mock_navigator_moz_settings.js');

suite('wallpaper customizer >', function() {
  var realSettings;

  suiteSetup(function() {
    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realSettings;
    realSettings = null;
  });

  test('setWallpaper OK', function() {
    var settingName = 'wallpaper';
    var settingNameKey = 'wallpaper.image';
    var settingValue = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABchangeWallpaper';
    // Ini wallpaper value
    MockNavigatorSettings.mSettings[settingNameKey] = '';

    wallpaperCustomizer.setWallpaper(settingValue);

    assert.equal(MockNavigatorSettings.mSettings[settingNameKey], settingValue);
  });
 test('setWallpaper not blob OK', function() {
    var settingNameKey = 'wallpaper.image';

    // Ini wallpaper value
    MockNavigatorSettings.mSettings[settingNameKey] = 'oldValue';

    wallpaperCustomizer.setWallpaper(null);
    assert.equal(MockNavigatorSettings.mSettings[settingNameKey], 'oldValue');

    wallpaperCustomizer.setWallpaper();
    assert.equal(MockNavigatorSettings.mSettings[settingNameKey], 'oldValue');
  });

});
