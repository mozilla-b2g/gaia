/* globals loadBodyHTML*/
'use strict';

requireApp('settings/shared/test/unit/load_body_html_helper.js');

mocha.globals(['LazyLoader', 'DeviceStorageHelper']);

suite('AppStoragePanel', function() {
  var modules = ['panels/app_storage/panel'];
  var map = {
    '*': {
      'modules/settings_panel': 'MockSettingsPanel',
      'modules/app_storage': 'MockAppStorage'
    }
  };

  setup(function(done) {
    // Create a new requirejs context
    var requireCtx = testRequire([], map, function() {});
    var that = this;

    loadBodyHTML('_application_storage.html');

    window.DeviceStorageHelper = {
      showFormatedSize: function(element, l10nId, size) {return size;}
    };
    this.sinon.spy(window.DeviceStorageHelper, 'showFormatedSize');

    // Define MockAppStorage
    this.mockAppStorage = {
      isMock: true,
      enabled: true,
      storage: {
        usedPercentage: 1,
        totalSize: 1,
        usedSize: 1,
        freeSize: 1,
        observe: function() {},
        unobserve: function() {}
      }
    };
    define('MockAppStorage', function() {
      return that.mockAppStorage;
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

    requireCtx(modules, function(AppStoragePanel) {
      that.panel = AppStoragePanel();
      that.panel.init(document.body);
      done();
    });
  });

  test('observe appStorage when onBeforeShow', function() {
    this.sinon.stub(this.mockAppStorage.storage, 'observe');
    this.panel.beforeShow();
    assert.ok(this.mockAppStorage.storage.observe.calledWith(
      sinon.match('usedPercentage')));
    assert.ok(this.mockAppStorage.storage.observe.calledWith(
      sinon.match('totalSize')));
    assert.ok(this.mockAppStorage.storage.observe.calledWith(
      sinon.match('usedSize')));
    assert.ok(this.mockAppStorage.storage.observe.calledWith(
      sinon.match('freeSize')));
  });

  test('unobserve appStorage when onHide', function() {
    this.sinon.stub(this.mockAppStorage.storage, 'unobserve');
    this.panel.hide();
    assert.ok(this.mockAppStorage.storage.unobserve.calledWith(
      sinon.match('usedPercentage')));
    assert.ok(this.mockAppStorage.storage.unobserve.calledWith(
      sinon.match('totalSize')));
    assert.ok(this.mockAppStorage.storage.unobserve.calledWith(
      sinon.match('usedSize')));
    assert.ok(this.mockAppStorage.storage.unobserve.calledWith(
      sinon.match('freeSize')));
  });
});
