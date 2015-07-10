/* global loadBodyHTML*/
'use strict';

require('/shared/js/component_utils.js');
require('/shared/elements/gaia_checkbox/script.js');
requireApp('settings/shared/test/unit/load_body_html_helper.js');

suite('Improve browser os panel > ', function() {
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

  setup(function() {
    loadBodyHTML('_improve_browser_os.html');
    panel = ImproveBrowserOSPanel();
  });

  teardown(function() {
    document.body.innerHTML = '';
  });

  suite('share performance data toggle', function() {
    test('the toggle should be enabled when not dog fooding', function(done) {
      MockSettingsCache._settings = {
        'debug.performance_data.dogfooding': null
      };
      panel.init(document.body).then(() => {
        var toggle = document.querySelector(
          '#menuItem-sharePerformanceData gaia-checkbox');
        assert.isFalse(toggle.disabled);
      }).then(done, done);
    });

    test('the toggle should be disabled when dog fooding', function(done) {
      MockSettingsCache._settings = {
        'debug.performance_data.dogfooding': true
      };
      panel.init(document.body).then(() => {
        var toggle = document.querySelector(
          '#menuItem-sharePerformanceData gaia-checkbox');
        assert.isTrue(toggle.disabled);
      }).then(done, done);
    });
  });
});
