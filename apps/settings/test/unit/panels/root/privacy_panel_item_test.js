/* global MockNavigatormozApps */
/* global MockNavigatorSettings */

'use strict';

suite('PrivacyPanelItem', function() {
  suiteSetup(function(done) {
    var modules = [
      'panels/root/privacy_panel_item',
      'shared_mocks/mock_navigator_moz_apps',
      'shared_mocks/mock_navigator_moz_settings'
    ];

    var maps = {
      '*': {}
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

  test('search for privacy-panel app (_getApp method)', function() {
    assert.isNotNull(this.subject._app);
  });

  test('launch privacy panel app (_launch method)', function() {
    this.element.click();
    sinon.assert.called(this.subject._app.launch);
  });
});
