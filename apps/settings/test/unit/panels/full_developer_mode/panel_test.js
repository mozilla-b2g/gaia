/* global loadBodyHTML*/
'use strict';

requireApp('settings/shared/test/unit/load_body_html_helper.js');

suite('Full developer mode panel > ', function() {
  var MockSettingsCache;
  var MockSettingsService;
  var MockDialogService;
  var FullDeveloperModePanel;

  var panel;

  var modules = [
    'panels/full_developer_mode/panel'
  ];
  var map = {
    '*': {
      'modules/settings_cache': 'MockSettingsCache',
      'modules/settings_service': 'MockSettingsService',
      'modules/dialog_service': 'MockDialogService',
      'modules/panel': 'MockPanel'
    }
  };

  setup(function(done) {
    loadBodyHTML('_full_developer_mode.html');

    // Create a new requirejs context
    var requireCtx = testRequire([], map, function() {});

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

    // Define MockSettingsService
    MockSettingsService = {
      back: sinon.stub()
    };
    define('MockSettingsService', function() {
      return MockSettingsService;
    });

    // Define MockDialogService
    MockDialogService = {
      show: sinon.stub().returns(Promise.resolve())
    };
    define('MockDialogService', function() {
      return MockDialogService;
    });

    // Define MockPanel
    define('MockPanel', function() {
      return function(options) {
        return {
          init: options.onInit.bind(options)
        };
      };
    });

    requireCtx(modules, function(_FullDeveloperModePanel) {
      FullDeveloperModePanel = _FullDeveloperModePanel;
      done();
    });
  });

  teardown(function() {
    document.body.innerHTML = '';
  });

  suite('full developer mode warning', function() {
    var fullDevModeWarning;
    var okBtn;
    var cancelBtn;

    setup(function() {
      fullDevModeWarning = document.querySelector('.full-dev-mode-warning');
      okBtn = fullDevModeWarning.querySelector('button[type="submit"]');
      cancelBtn = fullDevModeWarning.querySelector('button[type="reset"]');
      MockSettingsCache._settings = {
        'developer.menu.enabled': true
      };
      panel = FullDeveloperModePanel();
    });

    suite('visibility', function() {
      test('developer menu is enabled', function() {
        panel.init(document.body);
        assert.isFalse(fullDevModeWarning.hidden);
      });

      test('developer menu is disabled', function() {
        MockSettingsCache._settings['developer.menu.enabled'] = false;
        panel.init(document.body);
        assert.isTrue(fullDevModeWarning.hidden);
      });
    });

    test('click on the ok button', function() {
      panel.init(document.body);
      okBtn.dispatchEvent(new Event('click'));
      sinon.assert.calledWith(MockDialogService.show,
        'full-developer-mode-final-warning');
    });

    test('click on the cancel button', function() {
      panel.init(document.body);
      cancelBtn.dispatchEvent(new Event('click'));
      sinon.assert.called(MockSettingsService.back);
    });
  });

  suite('enable developer menu warning', function() {
    var devMenuDisabledWarning;
    var closeBtn;

    setup(function() {
      devMenuDisabledWarning =
        document.querySelector('.dev-menu-disabled-warning');
      closeBtn = devMenuDisabledWarning.querySelector('button[type="submit"]');
      MockSettingsCache._settings = {
        'developer.menu.enabled': false
      };
      panel = FullDeveloperModePanel();
    });

    suite('visibility', function() {
      test('developer menu is enabled', function() {
        panel.init(document.body);
        assert.isFalse(devMenuDisabledWarning.hidden);
      });

      test('developer menu is disabled', function() {
        MockSettingsCache._settings['developer.menu.enabled'] = true;
        panel.init(document.body);
        assert.isTrue(devMenuDisabledWarning.hidden);
      });
    });

    test('click on the close button', function() {
      panel.init(document.body);
      closeBtn.dispatchEvent(new Event('click'));
      sinon.assert.called(MockSettingsService.back);
    });
  });
});
