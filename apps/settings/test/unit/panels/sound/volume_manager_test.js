'use strict';

suite('Sound > VolumeManager', function() {
	var volumeManager;
  var realL10n, realMozSettings;
  var mockSettingsListener;
  var dom = document.createElement('li');

  var modules = [
    'unit/mock_l10n',
    'shared_mocks/mock_navigator_moz_settings',
    'shared_mocks/mock_settings_listener',
    'panels/sound/volume_manager'
  ];
  var maps = {
    '*': {
      'shared/settings_listener': 'shared_mocks/mock_settings_listener',
      'modules/settings_cache': 'unit/mock_settings_cache'
    }
  };

  suiteSetup(function(done) {
    testRequire(modules, maps, function(
      MockL10n, MockNavigatorSettings, MockSettingsListener, module) {
      volumeManager = module();
      mockSettingsListener = MockSettingsListener;
      // mock l10n
      realL10n = window.navigator.mozL10n;
      window.navigator.mozL10n = MockL10n;
      // mock mozSettings
      realMozSettings = navigator.mozSettings;
      window.navigator.mozSettings = MockNavigatorSettings;
      done();
    });
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;
    window.navigator.mozSettings = realMozSettings;
  });

  suite('initiation', function() {
    setup(function() {
      this.sinon.stub(volumeManager, '_sliderHandler');
    });

    test('we would call _sliderHandler for an item',
      function() {
        var ul = [dom];
        volumeManager.init(ul);
        assert.ok(volumeManager._sliderHandler.calledOnce);
    });

    test('we would call _sliderHandler for each item',
      function() {
        var ul = [dom, dom, dom];
        volumeManager.init(ul);
        assert.ok(volumeManager._sliderHandler.calledThrice);
    });
  });
});
