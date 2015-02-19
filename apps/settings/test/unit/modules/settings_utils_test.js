/* global MockSettings */
requireApp('settings/test/unit/mock_settings.js');

suite('SettingsUtils', function() {
  'use strict';

  var realSettings;
  var settingsUtils;
  var settingsService;
  var map = {
    '*': {
      'modules/settings_service': 'unit/mock_settings_service',
      'shared/lazy_loader': 'shared_mocks/mock_lazy_loader'
    }
  };

  suiteSetup(function() {
    realSettings = window.Settings;
    window.Settings = MockSettings;
  });

  suiteTeardown(function() {
    window.Settings = realSettings;
  });

  setup(function(done) {
    testRequire([
      'modules/settings_utils',
      'unit/mock_settings_service'
    ], map, function(SettingsUtils, MockSettingsService) {
      settingsUtils = SettingsUtils;
      settingsService = MockSettingsService;
      done();
    });
  });

  suite('loadTemplate', function() {
    var spyCallback;

    setup(function() {
      spyCallback = this.sinon.spy();
    });

    test('with element', function() {
      var element = {
        innerHTML: 'html'
      };
      this.sinon.stub(document, 'getElementById').returns(element);
      settingsUtils.loadTemplate('real', spyCallback);
      assert.isTrue(spyCallback.calledWith(element.innerHTML));
    });

    test('without element', function() {
      this.sinon.stub(document, 'getElementById').returns(null);
      settingsUtils.loadTemplate('fake', spyCallback);
      assert.isTrue(spyCallback.calledWith(null));
    });
  });
});
