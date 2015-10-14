'use strict';

suite('Languages Panel > ', function() {

  var modules = [
    'panels/languages/panel'
  ];
  var map = {
    '*': {
      'panels/languages/languages': 'MockLanguages',
      'modules/settings_panel': 'MockSettingsPanel'
    }
  };

  suiteSetup(function(done) {
    // Create a new requirejs context
    var requireCtx = testRequire([], map, function() {});
    var that = this;

    // Define MockSettingsPanel
    define('MockSettingsPanel', function() {
      return function(options) {
        return {
          onBeforeShow: options.onBeforeShow,
          onBeforeHide: options.onBeforeHide
        };
      };
    });

    // Define MockLanguages
    this.mockLanguages = {
      onLocalized: sinon.spy(),
      buildList: sinon.spy(),
      updateDateTime: sinon.spy(),
    };
    define('MockLanguages', function() {
      return function MockLanguages() {
        return that.mockLanguages;
      };
    });

    requireCtx(modules, function(LanguagePanel) {
      that.panel = LanguagePanel();
      done();
    });
  });

  suite('panel has not been opened yet', function() {
    setup(function() {
      // spies are not sandboxed in order to make them available early for
      // LanguagePanel to bind them;  reset them manually here.
      this.mockLanguages.onLocalized.reset();
      this.mockLanguages.buildList.reset();
    });
    test('localized fires', function() {
      window.dispatchEvent(new CustomEvent('localized'));
      assert.isFalse(
        this.mockLanguages.onLocalized.called, 'onLocalized was never called');
    });
    test('additionallanguageschange fires', function() {
      document.dispatchEvent(new CustomEvent('additionallanguageschange'));
      assert.isFalse(
        this.mockLanguages.buildList.called, 'buildList was never called');
    });
  });

  suite('panel is open', function() {
    setup(function() {
      this.panel.onBeforeShow();
      this.mockLanguages.onLocalized.reset();
      this.mockLanguages.buildList.reset();
    });
    teardown(function() {
      this.panel.onBeforeHide();
    });
    test('localized fires', function() {
      window.dispatchEvent(new CustomEvent('localized'));
      assert.ok(
        this.mockLanguages.onLocalized.called, 'onLocalized was called');
    });
    test('additionallanguageschange fires', function() {
      document.dispatchEvent(new CustomEvent('additionallanguageschange'));
      assert.ok(
        this.mockLanguages.buildList.called, 'buildList was called');
    });
  });

  suite('panel was closed', function() {
    setup(function() {
      this.panel.onBeforeShow();
      this.panel.onBeforeHide();
      this.mockLanguages.onLocalized.reset();
      this.mockLanguages.buildList.reset();
    });
    test('localized fires', function() {
      window.dispatchEvent(new CustomEvent('localized'));
      assert.isFalse(
        this.mockLanguages.onLocalized.called, 'onLocalized was never called');
    });
    test('additionallanguageschange fires', function() {
      document.dispatchEvent(new CustomEvent('additionallanguageschange'));
      assert.isFalse(
        this.mockLanguages.buildList.called, 'buildList was never called');
    });
  });

});
