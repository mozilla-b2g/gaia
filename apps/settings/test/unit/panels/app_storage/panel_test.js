/* globals loadBodyHTML*/
'use strict';

require('/shared/test/unit/load_body_html_helper.js');

suite('AppStoragePanel', function() {
  var modules = ['panels/app_storage/panel'];
  var map = {
    '*': {
      'modules/settings_panel': 'MockSettingsPanel',
      'modules/app_storage': 'MockAppStorage',
      'modules/storage_helper': 'MockStorageHelper'
    }
  };

  setup(function(done) {
    // Create a new requirejs context
    var requireCtx = testRequire([], map, function() {});
    var that = this;

    loadBodyHTML('_application_storage.html');

    this.MockStorageHelper = {
      showFormatedSize: function(element, l10nId, size) {return size;}
    };
    this.sinon.spy(this.MockStorageHelper, 'showFormatedSize');

    define('MockStorageHelper', function() {
      return that.MockStorageHelper;
    });

    // Define MockAppStorage
    this.MockAppStorage = {
      updateInfo: function () {},
      usedPercentage: 1,
      totalSize: 1,
      usedSize: 1,
      freeSize: 1,
      observe: function() {},
      unobserve: function() {}
    };
    define('MockAppStorage', function() {
      return that.MockAppStorage;
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
    this.sinon.stub(this.MockAppStorage, 'observe');
    this.panel.beforeShow();
    assert.ok(this.MockAppStorage.observe.calledWith(
      sinon.match('usedPercentage')));
    assert.ok(this.MockAppStorage.observe.calledWith(
      sinon.match('totalSize')));
    assert.ok(this.MockAppStorage.observe.calledWith(
      sinon.match('usedSize')));
    assert.ok(this.MockAppStorage.observe.calledWith(
      sinon.match('freeSize')));
  });

  test('unobserve appStorage when onHide', function() {
    this.sinon.stub(this.MockAppStorage, 'unobserve');
    this.panel.hide();
    assert.ok(this.MockAppStorage.unobserve.calledWith(
      sinon.match('usedPercentage')));
    assert.ok(this.MockAppStorage.unobserve.calledWith(
      sinon.match('totalSize')));
    assert.ok(this.MockAppStorage.unobserve.calledWith(
      sinon.match('usedSize')));
    assert.ok(this.MockAppStorage.unobserve.calledWith(
      sinon.match('freeSize')));
  });
});
