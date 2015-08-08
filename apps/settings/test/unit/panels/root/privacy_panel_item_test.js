'use strict';

suite('PrivacyPanelItem', function() {
  suiteSetup(function(done) {
    var modules = [
      'panels/root/privacy_panel_item',
      'unit/mock_apps_cache',
      'shared_mocks/mock_navigator_moz_settings',
    ];

    var maps = {
      '*': {
        'modules/apps_cache': 'unit/mock_apps_cache'
      }
    };

    testRequire(modules, maps, function(PrivacyPanelItem, MockAppsCache,
      MockNavigatorSettings) {
      navigator.mozSettings = MockNavigatorSettings;

      MockAppsCache._apps = [{
        manifestURL: document.location.protocol +
          '//privacy-panel.gaiamobile.org' +
          (location.port ? (':' + location.port) : '') + '/manifest.webapp',
        launch: function() {}
      }];

      this.PrivacyPanelItem = PrivacyPanelItem;
      done();
    }.bind(this));
  });

  setup(function(done) {
    this.element = document.createElement('div');
    this.element.setAttribute('hidden', 'hidden');
    this.link = document.createElement('a');
    this.subject = this.PrivacyPanelItem({
      element: this.element,
      link: this.link
    });

    // lets wait till Promise resolve privacy-panel app.
    this.subject._getApp().then(done, done);
  });

    test('search for privacy-panel app (_getApp method)', function(done) {
    // lets wait till Promise resolve privacy-panel app
    this.subject._getApp().then(
      function() {
        assert.isNotNull(this.subject._app);
        assert.isDefined(this.subject._app.launch);
      }.bind(this),
      function() {
        // This function does not reject.
        assert.isTrue(false);
      }
    ).then(done, done);
  });
});
