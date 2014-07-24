'use strict';

suite('KeyboardPanel', function() {
  var map = {
    '*': {
      'modules/keyboard_context': 'MockKeyboardContext',
      'modules/settings_panel': 'MockSettingsPanel',
      'panels/keyboard/installed_keyboards': 'MockInstalledKeyboards',
      'panels/keyboard/enabled_layouts': 'MockEnabledLayouts'
    }
  };

  setup(function(done) {
    this.fakeRootElement = {
      querySelector: function() {}
    };

    // Create a new requirejs context
    var requireCtx = testRequire([], map, function() {});
    var that = this;

    // Define MockKeyboardContext
    define('MockKeyboardContext', function() {
      return {};
    });

    // Define MockSettingsPanel
    define('MockSettingsPanel', function() {
      return function(options) {
        return {
          init: options.onInit,
          beforeShow: options.onBeforeShow,
          beforeHide: options.onBeforeHide,
          hide: options.onHide
        };
      };
    });

    // Define MockInstalledKeyboards
    this.mockInstalledKeyboards = {
      enabled: false,
      init: function() {}
    };
    this.MockInstalledKeyboards = function() {
      return that.mockInstalledKeyboards;
    };
    define('MockInstalledKeyboards', function() {
      return that.MockInstalledKeyboards;
    });

    // Define MockEnabledLayouts
    this.mockEnabledLayouts = {
      enabled: false,
      init: function() {}
    };
    this.MockEnabledLayouts = function() {
      return that.mockEnabledLayouts;
    };
    define('MockEnabledLayouts', function() {
      return that.MockEnabledLayouts;
    });

    requireCtx([
      'panels/keyboard/panel'
    ],
    function(KeyboardPanel) {
      that.panel = KeyboardPanel();
      done();
    });
  });

  test('Init MockEnabledLayouts when onInit', function() {
    sinon.spy(this.mockInstalledKeyboards, 'init');
    sinon.spy(this.mockEnabledLayouts, 'init');
    this.panel.init(this.fakeRootElement);
    sinon.assert.called(this.mockInstalledKeyboards.init);
    sinon.assert.called(this.mockEnabledLayouts.init);
  });

  test('Enabled MockEnabledLayouts when onBeforeShow', function() {
    this.panel.beforeShow();
    assert.ok(this.mockInstalledKeyboards.enabled);
    assert.ok(this.mockEnabledLayouts.enabled);
  });

  test('Disable MockEnabledLayouts when onHide', function() {
    this.panel.hide();
    assert.ok(!this.mockInstalledKeyboards.enabled);
    assert.ok(!this.mockEnabledLayouts.enabled);
  });
});
