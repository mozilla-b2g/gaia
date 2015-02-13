'use strict';

suite('Languages > ', function() {
  var mockKeyboardHelper;
  var languages;
  var realL10n;
  var realMozActivity;

  var OSVersion = '' + Math.random();

  var modules = [
    'shared_mocks/mock_l10n',
    'shared_mocks/mock_keyboard_helper',
    'shared_mocks/mock_moz_activity',
    'unit/mock_settings_cache',
    'panels/languages/languages'
  ];
  var maps = {
    'panels/languages/languages': {
      'shared/keyboard_helper': 'shared_mocks/mock_keyboard_helper',
      'modules/settings_cache': 'unit/mock_settings_cache',
      'modules/date_time': 'MockDateTime'
    }
  };

  suiteSetup(function(done) {
    // Create a new requirejs context
    var requireCtx = testRequire([], maps, function() {});
    var that = this;

    // Define MockDateTime
    this.MockDateTime = {};
    define('MockDateTime', function() {
      return that.MockDateTime;
    });

    requireCtx(modules, function(
      MockL10n, MockKeyboardHelper, MockMozActivity, MockSettingsCache,
      Languages) {
      // mock l10n
      realL10n = window.navigator.mozL10n;
      window.navigator.mozL10n = MockL10n;

      // mock keyboard helper
      mockKeyboardHelper = MockKeyboardHelper;

      // mock MozActivity
      realMozActivity = window.MozActivity;
      window.MozActivity = MockMozActivity;

      // mock SettingsCache
      that.MockSettingsCache = MockSettingsCache;
      MockSettingsCache.mockSettings({
        'deviceinfo.os': OSVersion
      });

      languages = Languages();
      done();
    });
  });

  suiteTeardown(function() {
    this.MockSettingsCache.mTeardown();
    window.navigator.mozL10n = realL10n;
    window.MozActivity = realMozActivity;
  });

  suite('when localized change', function() {
    setup(function() {
      this.sinon.stub(mockKeyboardHelper, 'changeDefaultLayouts');
      this.sinon.stub(languages, 'updateDateTime');
    });
    test('we would call update() and changeDefaultLayouts()', function() {
      languages.onLocalized();
      assert.ok(languages.updateDateTime.called);
      assert.ok(mockKeyboardHelper.changeDefaultLayouts.called);
    });
  });

  suite('when get more languages is activated', function() {
    setup(function() {
      window.MozActivity.mSetup();
    });
    teardown(function() {
      window.MozActivity.mTeardown();
    });
    test('we launch a MozActivity', function() {
      languages.showMoreLanguages();
      assert.equal(window.MozActivity.calls[0].name, 'marketplace-category');
      assert.equal(window.MozActivity.calls[0].data.slug, 'langpacks');
      assert.equal(window.MozActivity.calls[0].data.fxos_version, OSVersion);
    });
  });

});
