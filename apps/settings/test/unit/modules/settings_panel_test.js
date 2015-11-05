'use strict';

suite('SettingsPanel', function() {
  suiteSetup(function(done) {
    testRequire([
      'modules/settings_panel',
      'modules/panel_utils',
      'modules/settings_cache',
    ], (function(settingsPanelFunc, PanelUtils, SettingsCache) {
      this.realL10n = navigator.mozL10n;

      this.PanelUtils = PanelUtils;
      this.SettingsCache = SettingsCache;
      this.SettingsPanel = settingsPanelFunc;
      done();
    }).bind(this));
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

    test('uninit()', function(done) {
      var panelElement = document.createElement('div');
      var settingsCacheRemoveEventListenerSpy =
        this.sinon.spy(this.SettingsCache, 'removeEventListener');
      var panelRemoveEventListenerSpy =
        this.sinon.spy(panelElement, 'removeEventListener');

      Promise.resolve(this.panel.init(panelElement))
      .then(function() {
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
      }.bind(this)).then(done, done);
    });

    test('beforeShow()', function(done) {
      var initSpy = sinon.spy(this.panel, 'init');
      var panelElement = document.createElement('div');
      var options = {};
      var presetSpy = sinon.spy(this.PanelUtils, 'preset');
      var settingsCacheAddEventListenerSpy =
        sinon.spy(this.SettingsCache, 'addEventListener');
      var panelAddEventListenerSpy =
        sinon.spy(panelElement, 'addEventListener');

      Promise.resolve(this.panel.beforeShow(panelElement, options))
      .then(function() {
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
      }.bind(this)).then(done, done);
    });

    test('show()', function(done) {
      var initSpy = sinon.spy(this.panel, 'init');
      var panelElement = document.createElement('div');
      var options = {};

      Promise.resolve(this.panel.show(panelElement, options))
      .then(function() {
        // init should be called when show is called at the first time.
        sinon.assert.calledWith(initSpy, panelElement, options);
      }).then(done, done);
    });

    test('hide()', function(done) {
      var panelElement = document.createElement('div');
      var settingsCacheRemoveEventListenerSpy =
        this.sinon.spy(this.SettingsCache, 'removeEventListener');
      var panelRemoveEventListenerSpy =
        this.sinon.spy(panelElement, 'removeEventListener');

      Promise.resolve(this.panel.init(panelElement))
      .then(this.panel.hide())
      .then(function() {
        // Added listeners should be removed when hiding.
        sinon.assert.calledWith(settingsCacheRemoveEventListenerSpy,
          'settingsChange');
        sinon.assert.calledWith(panelRemoveEventListenerSpy, 'change',
          this.PanelUtils.onInputChange);
        sinon.assert.calledWith(panelRemoveEventListenerSpy, 'click',
          this.PanelUtils.onLinkClick);

        settingsCacheRemoveEventListenerSpy.restore();
        panelRemoveEventListenerSpy.restore();
      }.bind(this)).then(done, done);
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
          function(done) {
            var spy = sinon.spy(this.mockOptions, internalFuncName);
            var panel = this.SettingsPanel(this.mockOptions);
            var panelElement = document.createElement('div');
            var options = {};

            Promise
            .resolve(panel[funcName](panelElement, options))
            .then(function() {
              sinon.assert.calledWith(spy, panelElement, options);
            }).then(done, done);
      });
    });

    ['hide', 'beforeHide'].forEach(function(funcName) {
      var internalFuncName = convertToInternalFuncName(funcName);
      test(internalFuncName + ' shoule be called when ' +
        funcName + ' is called',
          function(done) {
            var spy = sinon.spy(this.mockOptions, internalFuncName);
            var panel = this.SettingsPanel(this.mockOptions);

            Promise
            .resolve(panel[funcName]())
            .then(function() {
              sinon.assert.calledOnce(spy);
            }).then(done, done);
      });
    });

    test('onUninit should be called when uninit is called',
      function(done) {
        var spy = sinon.spy(this.mockOptions, 'onUninit');
        var panel = this.SettingsPanel(this.mockOptions);

        Promise.resolve(panel.init())
        .then(function() {
          panel.uninit();
          sinon.assert.calledOnce(spy);
        }).then(done, done);
    });

    test('onInit should be called only once', function(done) {
      var spy = sinon.spy(this.mockOptions, 'onInit');
      var panel = this.SettingsPanel(this.mockOptions);
      var panelElement = document.createElement('div');

      Promise.resolve(panel.init(panelElement))
      .then(panel.init(panelElement))
      .then(function() {
        sinon.assert.calledOnce(spy);
      }).then(done, done);
    });

    test('onUninit should not be called if it is not initialized', function() {
      var spy = sinon.spy(this.mockOptions, 'onUninit');
      var panel = this.SettingsPanel(this.mockOptions);

      panel.uninit();
      sinon.assert.notCalled(spy);
    });
  });
});
