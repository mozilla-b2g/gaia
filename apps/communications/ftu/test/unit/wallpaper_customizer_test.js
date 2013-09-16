'use strict';

requireApp('communications/ftu/js/customizers/wallpaper_customizer.js');
requireApp('communications/ftu/test/unit/mock_navigator_moz_settings.js');
requireApp('communications/ftu/test/unit/mock_variant.js');

suite('wallpaper customizer >', function() {
  var realSettings;
  var setWallpaperSpy;
  suiteSetup(function() {
    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    setWallpaperSpy = sinon.spy(WallpaperCustomizer, 'setWallpaper');
  });

  suiteTeardown(function() {
    navigator.mozSettings = realSettings;
    setWallpaperSpy.restore();
    realSettings = null;
  });

  test('setWallpaper OK', function() {
    var settingName = 'wallpaper';
    var settingNameKey = 'wallpaper.image';
    var settingValue = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABchangeWallpaper';
    // Ini wallpaper value
    MockNavigatorSettings.mSettings[settingNameKey] = '';
    WallpaperCustomizer.setWallpaper(settingValue);

    assert.equal(MockNavigatorSettings.mSettings[settingNameKey], settingValue);
  });
 test('setWallpaper not blob OK', function() {
    var settingNameKey = 'wallpaper.image';

    // Ini wallpaper value
    MockNavigatorSettings.mSettings[settingNameKey] = 'oldValue';

    WallpaperCustomizer.setWallpaper(null);
    assert.equal(MockNavigatorSettings.mSettings[settingNameKey], 'oldValue');

    WallpaperCustomizer.setWallpaper();
    assert.equal(MockNavigatorSettings.mSettings[settingNameKey], 'oldValue');
  });
  test('test dispatch customization events', function() {
    // Need it to reset setWallpaperSpy.callCount to 0
    setWallpaperSpy.reset();

    var variantCustomization = {
      'default_contacts' : [{'givenName': ['Foo']}],
      'ringtone' : 'ringer_vamos_la_elektro.opus',
      'wallpaper' : 'newValue'
    };
    var settingNameKey = 'wallpaper.image';

    // Ini wallpaper value
    MockNavigatorSettings.mSettings[settingNameKey] = 'oldValue';
    // Dispatch one customization event per setting
    MockVariantManager.dispatchCustomizationEvents(variantCustomization);

    assert.equal(setWallpaperSpy.callCount, 1);
    assert.equal(MockNavigatorSettings.mSettings[settingNameKey], 'newValue');

    // Check the listener is disabled
    variantCustomization = { 'wallpaper' : 'anotherValue'};
    MockVariantManager.dispatchCustomizationEvents(variantCustomization);

    assert.equal(setWallpaperSpy.callCount, 1);
    assert.equal(MockNavigatorSettings.mSettings[settingNameKey], 'newValue');

  });
});
