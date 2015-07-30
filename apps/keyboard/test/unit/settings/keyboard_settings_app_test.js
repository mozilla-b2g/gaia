'use strict';

/* global KeyboardSettingsApp, PanelController, DialogController,
          PromiseStorage */

require('/js/settings/close_locks.js');
require('/js/settings/base_view.js');
require('/js/settings/general_panel.js');
require('/js/settings/panel_controller.js');
require('/js/shared/promise_storage.js');

require('/js/settings/keyboard_settings_app.js');

suite('KeyboardSettingsApp', function() {
  var app;

  var realMozActivity;

  var stubPanelController;
  var stubDialogController;
  var stubPerferencesStore;

  var isHidden;

  suiteSetup(function() {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: function() {
        return isHidden;
      }
    });
  });

  suiteTeardown(function() {
    delete document.hidden;
  });

  setup(function() {
    isHidden = false;

    realMozActivity = window.MozActivity;
    window.MozActivity = this.sinon.stub();

    this.sinon.stub(window, 'close');
    this.sinon.stub(document, 'addEventListener');
    this.sinon.stub(document, 'removeEventListener');

    window.SettingsPromiseManager = this.sinon.stub();

    stubPanelController =
      this.sinon.stub(Object.create(PanelController.prototype));
    this.sinon.stub(window, 'PanelController')
      .returns(stubPanelController);

    stubDialogController =
      this.sinon.stub(Object.create(DialogController.prototype));
    this.sinon.stub(window, 'DialogController')
      .returns(stubDialogController);

    stubPerferencesStore =
      this.sinon.stub(Object.create(PromiseStorage.prototype));
    this.sinon.stub(window, 'PromiseStorage')
      .returns(stubPerferencesStore);

    app = new KeyboardSettingsApp();
  });

  teardown(function() {
    window.MozActivity = realMozActivity;
  });

  suite('start', function() {
    var skipStopOnTeardown;

    setup(function() {
      skipStopOnTeardown = false;

      app.start();

      assert.isTrue(window.SettingsPromiseManager.calledOnce);

      assert.isTrue(stubPanelController.start.calledOnce);
      assert.isTrue(window.PanelController.calledWith(app));
      assert.isTrue(stubDialogController.start.calledOnce);

      assert.isTrue(
        window.PromiseStorage.calledWith(app.PREFERENCES_STORE_NAME));
      assert.isTrue(stubPerferencesStore.start.calledOnce);

      assert.isTrue(
        document.addEventListener.calledWith('visibilitychange', app));
    });

    teardown(function() {
      if (!skipStopOnTeardown) {
        app.stop();
      }

      assert.isTrue(stubPanelController.stop.calledOnce);
      assert.isTrue(stubDialogController.stop.calledOnce);
      assert.isTrue(stubPerferencesStore.stop.calledOnce);

      assert.isTrue(
        document.removeEventListener.calledWith('visibilitychange', app));
    });

    test('requestClose', function() {
      app.requestClose();

      assert.isTrue(window.MozActivity.calledWith({
        name: 'moz_configure_window',
        data: { target: 'device' }
      }));
    });

    test('visibilitychange to hidden', function() {
      isHidden = true;
      skipStopOnTeardown = true;

      this.sinon.spy(app, 'stop');

      app.handleEvent({
        type: 'visibilitychange'
      });

      assert.isTrue(window.close.calledOnce);
      assert.isTrue(app.stop.calledOnce);
    });

    test('visibilitychange to visible w/ stay awake lock', function() {
      var lock = app.closeLockManager.requestLock('stayAwake');

      isHidden = true;

      this.sinon.spy(app, 'stop');

      app.handleEvent({
        type: 'visibilitychange'
      });
      assert.isFalse(window.close.calledOnce);
      assert.isFalse(app.stop.calledOnce);

      isHidden = false;
      app.handleEvent({
        type: 'visibilitychange'
      });
      assert.isFalse(window.close.calledOnce);
      assert.isFalse(app.stop.calledOnce);

      lock.unlock();
      assert.isFalse(window.close.calledOnce);
      assert.isFalse(app.stop.calledOnce);
    });
  });
});
