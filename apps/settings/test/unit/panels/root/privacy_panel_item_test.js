suite('PrivacyPanelItem', function() {
  'use strict';

  var fakeMenuItem;
  var SettingsHelper;
  var PrivacyPanel;

  suiteSetup(function(done) {
    var modules = [
      'shared_mocks/mock_settings_helper',
      'panels/root/privacy_panel_item'
    ];

    var maps = {
      'panels/root/privacy_panel_item': {
        'modules/settings_listener': 'shared_mocks/mock_settings_listener'
      }
    };

    testRequire(modules, maps, function(Settings, PrivacyPanelItem) {
      SettingsHelper = Settings;
      PrivacyPanelItem = PrivacyPanel;
      done();
    });
  });

  setup(function() {
    fakeMenuItem = document.createElement('li');
    fakeMenuItem.setAttribute('hidden', 'hidden');

    PrivacyPanelItem(fakePanel);
  });

  test('show privacy-panel menu item when setting is set to true', function() {
    SettingsHelper('devtools.ala_dev.enabled').set(true, function() {
      assert.isFalse(fakeMenuItem.hasAttribute('hidden'));
    });
  });

  test('show privacy-panel menu item when setting is set to false', function() {
    SettingsHelper('devtools.ala_dev.enabled').set(false, function() {
      assert.isTrue(fakeMenuItem.hasAttribute('hidden'));  
    });
  });
});
