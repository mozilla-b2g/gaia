'use strict';

mocha.setup({
  globals: [
    'Settings',
    'MockL10n',
    'LazyLoader',
    'startupLocale',
    'initLocale'
  ]
});

suite('SettingsPanel', function() {
  suiteSetup(function(done) {
    testRequire([
      'modules/settings_panel',
      'modules/panel_utils',
      'modules/settings_cache',
      'unit/mock_l10n'
    ], (function(settingsPanelFunc, PanelUtils, SettingsCache, MockL10n) {
      this.realL10n = navigator.mozL10n;
      navigator.mozL10n = MockL10n;

      this.PanelUtils = PanelUtils;
      this.SettingsCache = SettingsCache;
      this.SettingsPanel = settingsPanelFunc;
      done();
    }).bind(this));
  });

  suiteTeardown(function() {
    navigator.mozL10n = this.realL10n;
    this.realL10n = null;
  });

  suite('Basic functions', function() {
    setup(function() {
      this.panel = this.SettingsPanel();
    });

    teardown(function() {
      this.panel = null;
    });

    test('init()', function() {
      var panelElement = document.createElement('div');
      var activateSpy = sinon.spy(this.PanelUtils, 'activate');

      // initialized should be false by default.
      assert.isFalse(this.panel.initialized);

      this.panel.init(panelElement);

      // initialized should be true after initialized.
      assert.isTrue(this.panel.initialized);
      // PanelUtils.activate should be called with the panel element.
      sinon.assert.calledWith(activateSpy, panelElement);

      activateSpy.restore();
    });

    test('uninit()', function() {
      var panelElement = document.createElement('div');
      var settingsCacheRemoveEventListenerSpy =
        sinon.spy(this.SettingsCache, 'removeEventListener');
      var panelRemoveEventListenerSpy =
        sinon.spy(panelElement, 'removeEventListener');

      this.panel.init(panelElement);
      assert.isTrue(this.panel.initialized);

      this.panel.uninit();
      // initialized is false after uninitialized.
      assert.isFalse(this.panel.initialized);

      // Added listeners should be removed when uninit.
      sinon.assert.calledWith(settingsCacheRemoveEventListenerSpy,
        'settingsChange');
      sinon.assert.calledWith(panelRemoveEventListenerSpy, 'change',
        this.PanelUtils.onInputChange);
      sinon.assert.calledWith(panelRemoveEventListenerSpy, 'click',
        this.PanelUtils.onLinkClick);

      settingsCacheRemoveEventListenerSpy.restore();
      panelRemoveEventListenerSpy.restore();
    });

    test('beforeShow()', function() {
      var initSpy = sinon.spy(this.panel, 'init');
      var panelElement = document.createElement('div');
      var options = {};
      var presetSpy = sinon.spy(this.PanelUtils, 'preset');
      var settingsCacheAddEventListenerSpy =
        sinon.spy(this.SettingsCache, 'addEventListener');
      var panelAddEventListenerSpy =
        sinon.spy(panelElement, 'addEventListener');

      this.panel.beforeShow(panelElement, options);
      // init should be called when beforeShow is called at the first time.
      sinon.assert.calledWith(initSpy, panelElement, options);
      // PanelUtils.preset should be called with the panel element.
      sinon.assert.calledWith(presetSpy, panelElement);
      // Related listeners should be added.
      sinon.assert.calledWith(settingsCacheAddEventListenerSpy,
        'settingsChange');
      sinon.assert.calledWith(panelAddEventListenerSpy, 'change',
        this.PanelUtils.onInputChange);
      sinon.assert.calledWith(panelAddEventListenerSpy, 'click',
        this.PanelUtils.onLinkClick);

      presetSpy.restore();
      settingsCacheAddEventListenerSpy.restore();
      panelAddEventListenerSpy.restore();
    });

    test('show()', function() {
      var initSpy = sinon.spy(this.panel, 'init');
      var panelElement = document.createElement('div');
      var options = {};

      this.panel.show(panelElement, options);
      // init should be called when show is called at the first time.
      sinon.assert.calledWith(initSpy, panelElement, options);
    });

    test('hide()', function() {
      var panelElement = document.createElement('div');
      var settingsCacheRemoveEventListenerSpy =
        sinon.spy(this.SettingsCache, 'removeEventListener');
      var panelRemoveEventListenerSpy =
        sinon.spy(panelElement, 'removeEventListener');

      this.panel.init(panelElement);
      this.panel.hide();

      // Added listeners should be removed when hiding.
      sinon.assert.calledWith(settingsCacheRemoveEventListenerSpy,
        'settingsChange');
      sinon.assert.calledWith(panelRemoveEventListenerSpy, 'change',
        this.PanelUtils.onInputChange);
      sinon.assert.calledWith(panelRemoveEventListenerSpy, 'click',
        this.PanelUtils.onLinkClick);

      settingsCacheRemoveEventListenerSpy.restore();
      panelRemoveEventListenerSpy.restore();
    });
  });

  suite('Internal functions', function() {
    setup(function() {
      this.mockOptions = {
        onInit: function() {},
        onUninit: function() {},
        onShow: function() {},
        onHide: function() {},
        onBeforeShow: function() {},
        onBeforeHide: function() {}
      };
    });

    teardown(function() {
      this.mockOptions = null;
    });

    function convertToInternalFuncName(name) {
      return 'on' + name.charAt(0).toUpperCase() + name.slice(1);
    }

    ['init', 'show', 'beforeShow'].forEach(function(funcName) {
      var internalFuncName = convertToInternalFuncName(funcName);
      test(internalFuncName + ' should be called when ' +
        funcName + ' is called',
          function() {
            var spy = sinon.spy(this.mockOptions, internalFuncName);
            var panel = this.SettingsPanel(this.mockOptions);
            var panelElement = document.createElement('div');
            var options = {};

            panel[funcName](panelElement, options);
            sinon.assert.calledWith(spy, panelElement, options);
      });
    });

    ['hide', 'beforeHide'].forEach(function(funcName) {
      var internalFuncName = convertToInternalFuncName(funcName);
      test(internalFuncName + ' shoule be called when ' +
        funcName + ' is called',
          function() {
            var spy = sinon.spy(this.mockOptions, internalFuncName);
            var panel = this.SettingsPanel(this.mockOptions);

            panel[funcName]();
            sinon.assert.calledOnce(spy);
      });
    });

    test('onUninit should be called when uninit is called',
      function() {
        var spy = sinon.spy(this.mockOptions, 'onUninit');
        var panel = this.SettingsPanel(this.mockOptions);

        panel.init();
        panel.uninit();
        sinon.assert.calledOnce(spy);
    });

    test('onInit should be called only once', function() {
      var spy = sinon.spy(this.mockOptions, 'onInit');
      var panel = this.SettingsPanel(this.mockOptions);
      var panelElement = document.createElement('div');

      panel.init(panelElement);
      panel.init(panelElement);
      sinon.assert.calledOnce(spy);
    });

    test('onUninit should not be called if it is not initialized', function() {
      var spy = sinon.spy(this.mockOptions, 'onUninit');
      var panel = this.SettingsPanel(this.mockOptions);

      panel.uninit();
      sinon.assert.notCalled(spy);
    });
  });
});
