'use strict';

require('/shared/js/lazy_loader.js');
require('/shared/js/settings_listener.js');
require('/shared/js/settings_url.js');

requireApp('homescreen/test/unit/mock_app.js');
requireApp('homescreen/test/unit/mock_request.html.js');
requireApp('homescreen/test/unit/mock_lazy_loader.js');
requireApp('homescreen/test/unit/mock_l10n.js');
requireApp('homescreen/test/unit/mock_grid_manager.js');
requireApp('homescreen/test/unit/mock_pagination_bar.js');
requireApp('homescreen/test/unit/mock_configurator.js');

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_manifest_helper.js');

requireApp('homescreen/js/grid_components.js');
requireApp('homescreen/js/message.js');
requireApp('homescreen/js/request.js');
requireApp('homescreen/js/homescreen.js');

var mocksHelperForHome = new MocksHelper([
  'PaginationBar',
  'GridManager',
  'ManifestHelper',
  'LazyLoader',
  'Configurator'
]);
mocksHelperForHome.init();

suite('homescreen.js >', function() {

  var dialog;
  var realMozSettings;

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = window.MockNavigatorSettings;
    mocksHelperForHome.suiteSetup();

    dialog = document.createElement('section');
    dialog.id = 'confirm-dialog';
    dialog.innerHTML = MockRequestHtml;
    document.body.appendChild(dialog);
    ConfirmDialog.init();

    Homescreen.initWallpaper();
  });

  suiteTeardown(function() {
    mocksHelperForHome.suiteTeardown();
    document.body.removeChild(dialog);

    navigator.mozSettings.mTeardown();
    navigator.mozSettings = realMozSettings;
  });

  test(' Homescreen is in edit mode ', function() {
    Homescreen.setMode('edit');
    assert.isTrue(Homescreen.isInEditMode());
    assert.equal(document.body.dataset.mode, 'edit');
  });

  test(' Homescreen is not in edit mode ', function() {
    Homescreen.setMode('normal');
    assert.isFalse(Homescreen.isInEditMode());
    assert.equal(document.body.dataset.mode, 'normal');
  });

  test(' Homescreen displays a contextual menu for an app ', function() {
    Homescreen.showAppDialog({
      app: new MockApp(),
      getName: function() {}
    });
    assert.isTrue(dialog.classList.contains('visible'));
  });

  test(' Homescreen correctly initializes wallpaper ', function() {
    var wallpaperURL = new SettingsURL();
    var defaultBackground = Configurator.getSection('background').url;

    // Weird that setting document.style.backgroundImage surrounds the inner URL
    // in double quotes. Manually include it for now
    var defaultURL = 'url(\"' + wallpaperURL.set(defaultBackground) + '\")';
    var currentSetting = document.body.style.backgroundImage;
    assert.deepEqual(defaultURL, currentSetting);
  });

  test(' Homescreen Correctly Sets Wallpaper ', function() {
    var newWallpaper = 'testFakeBackground.png';
    var wallpaperURL = new SettingsURL();
    var changedURL = 'url(\"' + wallpaperURL.set(newWallpaper) + '\")';

    var updatedWallpaperEvent = new CustomEvent('fakeTrigger');
    updatedWallpaperEvent.settingValue = newWallpaper;

    navigator.mozSettings.mSettings['wallpaper.image'] = newWallpaper;
    navigator.mozSettings.mTriggerObservers('wallpaper.image',
                                            updatedWallpaperEvent);

    var settingsResult = navigator.mozSettings.mSettings['wallpaper.image'];
    var bodyBackground = document.body.style.backgroundImage;

    assert.deepEqual(settingsResult, newWallpaper);
    assert.deepEqual(changedURL, bodyBackground);
  });

  test(' Homescreen is listening offline event ', function() {
    window.dispatchEvent(new CustomEvent('offline'));
    assert.equal(document.body.dataset.online, 'offline');
  });

});
