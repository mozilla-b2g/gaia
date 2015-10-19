/* global loadBodyHTML, MockNavigatorSettings */
'use strict';

require('/shared/js/component_utils.js');
require('/shared/elements/gaia_radio/script.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('settings/shared/test/unit/load_body_html_helper.js');

suite('Improve browser os panel > ', function() {
  var realMozSettings;
  var MockSettingsCache;
  var ImproveBrowserOSPanel;

  var panel;

  var modules = [
    'panels/improve_browser_os/panel'
  ];
  var map = {
    '*': {
      'modules/settings_cache': 'MockSettingsCache',
      'modules/settings_panel': 'MockSettingsPanel'
    }
  };

  suiteSetup(function(done) {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    // Create a new requirejs context
    var requireCtx = testRequire([], map, function() {});

    // Define MockSettingsPanel
    define('MockSettingsPanel', function() {
      return function(options) {
        return {
          init: options.onInit.bind(options)
        };
      };
    });

    // Define MockSettingsCache
    MockSettingsCache = {
      _settings: {},
      getSettings: function(callback) {
        callback(this._settings);
      }
    };
    define('MockSettingsCache', function() {
      return MockSettingsCache;
    });

    requireCtx(modules, function(_ImproveBrowserOSPanel) {
      ImproveBrowserOSPanel = _ImproveBrowserOSPanel;
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
  });

  setup(function() {
    loadBodyHTML('_improve_browser_os.html');
    panel = ImproveBrowserOSPanel();
    MockNavigatorSettings.mSetup();
    MockNavigatorSettings.mSyncRepliesOnly = true;
  });

  teardown(function() {
    document.body.innerHTML = '';
    MockNavigatorSettings.mTeardown();
  });

  suite('metrics level', function() {
    test('upgrade, sharing performance data, level basic', function(done) {
      MockSettingsCache._settings = {
        'debug.performance_data.shared': true,
        'metrics.selectedMetrics.level': null
      };
      assert.isUndefined(
        MockNavigatorSettings.mSettings['metrics.selectedMetrics.level']);
      panel.init(document.body).then(() => {
        var basicElem = document.querySelector('#metrics-basic');
        var enhancedElem = document.querySelector('#metrics-enhanced');
        var noneElem = document.querySelector('#metrics-none');
        assert.isTrue(basicElem.checked);
        assert.isFalse(enhancedElem.checked);
        assert.isFalse(noneElem.checked);
        MockNavigatorSettings.mReplyToRequests();
        assert.equal(
          MockNavigatorSettings.mSettings['metrics.selectedMetrics.level'],
          'Basic');
        assert.isNull(noneElem.getAttribute('disabled'));
        assert.isNull(basicElem.getAttribute('disabled'));
        assert.isNull(enhancedElem.getAttribute('disabled'));
      }).then(done, done);
    });

    test('upgrade, not sharing performance data, level none', function(done) {
      MockSettingsCache._settings = {
        'debug.performance_data.shared': false,
        'metrics.selectedMetrics.level': null
      };
      assert.isUndefined(
        MockNavigatorSettings.mSettings['metrics.selectedMetrics.level']);
      panel.init(document.body).then(() => {
        var basicElem = document.querySelector('#metrics-basic');
        var enhancedElem = document.querySelector('#metrics-enhanced');
        var noneElem = document.querySelector('#metrics-none');
        assert.isFalse(basicElem.checked);
        assert.isFalse(enhancedElem.checked);
        assert.isTrue(noneElem.checked);
        MockNavigatorSettings.mReplyToRequests();
        assert.equal(
          MockNavigatorSettings.mSettings['metrics.selectedMetrics.level'],
          'None');
        assert.isNull(noneElem.getAttribute('disabled'));
        assert.isNull(basicElem.getAttribute('disabled'));
        assert.isNull(enhancedElem.getAttribute('disabled'));
      }).then(done, done);
    });

    test('after ftu, metrics level none', function(done) {
      MockSettingsCache._settings = {
        'metrics.selectedMetrics.level': 'None'
      };
      assert.isUndefined(
        MockNavigatorSettings.mSettings['metrics.selectedMetrics.level']);
      panel.init(document.body).then(() => {
        var basicElem = document.querySelector('#metrics-basic');
        var enhancedElem = document.querySelector('#metrics-enhanced');
        var noneElem = document.querySelector('#metrics-none');
        assert.isFalse(basicElem.checked);
        assert.isFalse(enhancedElem.checked);
        assert.isTrue(noneElem.checked);
        assert.isNull(noneElem.getAttribute('disabled'));
        assert.isNull(basicElem.getAttribute('disabled'));
        assert.isNull(enhancedElem.getAttribute('disabled'));
      }).then(done, done);
    });

    test('after ftu, metrics level basic', function(done) {
      MockSettingsCache._settings = {
        'metrics.selectedMetrics.level': 'Basic'
      };
      panel.init(document.body).then(() => {
        var basicElem = document.querySelector('#metrics-basic');
        var enhancedElem = document.querySelector('#metrics-enhanced');
        var noneElem = document.querySelector('#metrics-none');
        assert.isTrue(basicElem.checked);
        assert.isFalse(enhancedElem.checked);
        assert.isFalse(noneElem.checked);
        assert.isNull(noneElem.getAttribute('disabled'));
        assert.isNull(basicElem.getAttribute('disabled'));
        assert.isNull(enhancedElem.getAttribute('disabled'));
      }).then(done, done);
    });

    test('after ftu, metrics level enhanced', function(done) {
      MockSettingsCache._settings = {
        'metrics.selectedMetrics.level': 'Enhanced'
      };
      panel.init(document.body).then(() => {
        var basicElem = document.querySelector('#metrics-basic');
        var enhancedElem = document.querySelector('#metrics-enhanced');
        var noneElem = document.querySelector('#metrics-none');
        assert.isFalse(basicElem.checked);
        assert.isTrue(enhancedElem.checked);
        assert.isFalse(noneElem.checked);
        assert.isNull(noneElem.getAttribute('disabled'));
        assert.isNull(basicElem.getAttribute('disabled'));
        assert.isNull(enhancedElem.getAttribute('disabled'));
      }).then(done, done);
    });

    test('after ftu, metrics level basic, dogfood', function(done) {
      MockSettingsCache._settings = {
        'metrics.selectedMetrics.level': 'Basic',
        'debug.performance_data.dogfooding': true
      };
      panel.init(document.body).then(() => {
        var basicElem = document.querySelector('#metrics-basic');
        var enhancedElem = document.querySelector('#metrics-enhanced');
        var noneElem = document.querySelector('#metrics-none');
        assert.isTrue(basicElem.checked);
        assert.isFalse(enhancedElem.checked);
        assert.isFalse(noneElem.checked);
        assert.equal(noneElem.getAttribute('disabled'), 'true');
        assert.equal(basicElem.getAttribute('disabled'), 'true');
        assert.equal(enhancedElem.getAttribute('disabled'), 'true');
      }).then(done, done);
    });

    test('after ftu, metrics level enhanced, dogfood', function(done) {
      MockSettingsCache._settings = {
        'metrics.selectedMetrics.level': 'Enhanced',
        'debug.performance_data.dogfooding': true
      };
      panel.init(document.body).then(() => {
        var basicElem = document.querySelector('#metrics-basic');
        var enhancedElem = document.querySelector('#metrics-enhanced');
        var noneElem = document.querySelector('#metrics-none');
        assert.isFalse(basicElem.checked);
        assert.isTrue(enhancedElem.checked);
        assert.isFalse(noneElem.checked);
        assert.equal(noneElem.getAttribute('disabled'), 'true');
        assert.equal(basicElem.getAttribute('disabled'), 'true');
        assert.equal(enhancedElem.getAttribute('disabled'), 'true');
      }).then(done, done);
    });

    test('after ftu, metrics level none, dogfood', function(done) {
      MockSettingsCache._settings = {
        'metrics.selectedMetrics.level': 'None',
        'debug.performance_data.dogfooding': true
      };
      panel.init(document.body).then(() => {
        var basicElem = document.querySelector('#metrics-basic');
        var enhancedElem = document.querySelector('#metrics-enhanced');
        var noneElem = document.querySelector('#metrics-none');
        assert.isFalse(basicElem.checked);
        assert.isFalse(enhancedElem.checked);
        assert.isTrue(noneElem.checked);
        assert.equal(noneElem.getAttribute('disabled'), 'true');
        assert.equal(basicElem.getAttribute('disabled'), 'true');
        assert.equal(enhancedElem.getAttribute('disabled'), 'true');
      }).then(done, done);
    });
  });
});
