/* global MockNavigatormozApps */
/* global MockNavigatorSettings */
/* global MockSettingsListener */

'use strict';

suite('PrivacyPanelItem', function() {
  suiteSetup(function(done) {
    var modules = [
      'panels/root/privacy_panel_item',
      'shared_mocks/mock_navigator_moz_apps',
      'shared_mocks/mock_navigator_moz_settings',
      'shared_mocks/mock_settings_listener'
    ];

    var maps = {
      '*': {
        'shared/settings_listener': 'shared_mocks/mock_settings_listener'
      }
    };

    testRequire(modules, maps, function(PrivacyPanelItem) {
      navigator.mozApps = MockNavigatormozApps;
      navigator.mozSettings = MockNavigatorSettings;
      this.PrivacyPanelItem = PrivacyPanelItem;
      done();
    }.bind(this));
  });

  setup(function() {
    this.element = document.createElement('div');
    this.element.setAttribute('hidden', 'hidden');
    this.subject = this.PrivacyPanelItem(this.element);

    navigator.mozApps.mApps = [{
      manifestURL: document.location.protocol + 
        '//privacy-panel.gaiamobile.org' +
        (location.port ? (':' + location.port) : '') + '/manifest.webapp',
      launch: sinon.spy()
    }];
  });

  test('show privacy-panel menu item', function() {
    MockSettingsListener.mCallbacks['devtools.ala_dev.enabled'](true);
    assert.isFalse(this.element.hidden);
  });

  test('hide privacy-panel menu item', function() {
    MockSettingsListener.mCallbacks['devtools.ala_dev.enabled'](false);
    assert.isTrue(this.element.hidden);
  });

  test('search for privacy-panel app (_getApp method)', function() {
    assert.isNotNull(this.subject._ppApp);
  });

  test('launch privacy panel app (launch method)', function() {
    this.element.click();
    sinon.assert.called(this.subject._ppApp.launch);
  });
});
