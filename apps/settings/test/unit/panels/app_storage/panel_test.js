/* globals loadBodyHTML*/
'use strict';

requireApp('settings/shared/test/unit/load_body_html_helper.js');

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
    this.MockAppStorage = {
      updateInfo: function () {},
      usedPercentage: 1,
      totalSize: 1,
      usedSize: 1,
      freeSize: 1,
      lowDiskSpace: false,
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
      that.storageStatus =
        document.querySelector('.apps-storage-status');
      that.lowDiskSpace =
        document.querySelector('.apps-low-disk-space');
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
    assert.ok(this.MockAppStorage.observe.calledWith(
      sinon.match('lowDiskSpace')));
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
    assert.ok(this.MockAppStorage.unobserve.calledWith(
      sinon.match('lowDiskSpace')));
  });

  test('app-storage-status is unchanged when lowDiskSpace is false',
    function() {
      this.MockAppStorage.lowDiskSpace = false;
      this.panel.beforeShow();
      assert.equal('apps-storage-status', this.storageStatus.className);
  });

  test(
    'app-storage-status is changed to app-storage-status-low' +
    'when lowDiskSpace is true',
    function() {
      this.MockAppStorage.lowDiskSpace = true;
      this.panel.beforeShow();
      assert.equal('apps-storage-status-low', this.storageStatus.className);
  });
});
