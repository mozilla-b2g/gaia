'use strict';

/* global GeneralSettingsGroupView, HandwritingSettingsGroupView,
          KeyboardSettingsApp */

require('/js/settings/close_locks.js');
require('/js/settings/general_settings.js');
require('/js/settings/handwriting_settings.js');

require('/js/settings/keyboard_settings_app.js');

suite('KeyboardSettingsApp', function() {
  var app;

  var realMozActivity;

  var headerStub;
  var stubGeneralSettingsGroupView;
  var stubHandwritingSettingsGroupView;

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

    headerStub = document.createElement('gaia-header');
    this.sinon.spy(headerStub, 'addEventListener');
    this.sinon.spy(headerStub, 'removeEventListener');

    window.SettingsPromiseManager = this.sinon.stub();

    stubGeneralSettingsGroupView =
      this.sinon.stub(Object.create(GeneralSettingsGroupView.prototype));
    this.sinon.stub(window, 'GeneralSettingsGroupView')
      .returns(stubGeneralSettingsGroupView);

    stubHandwritingSettingsGroupView =
      this.sinon.stub(Object.create(HandwritingSettingsGroupView.prototype));
    this.sinon.stub(window, 'HandwritingSettingsGroupView')
      .returns(stubHandwritingSettingsGroupView);

    this.sinon.stub(document, 'getElementById').returns(headerStub);

    app = new KeyboardSettingsApp();
  });

  teardown(function() {
    window.MozActivity = realMozActivity;
  });

  suite('start', function() {
    setup(function() {
      app.start();

      assert.isTrue(window.SettingsPromiseManager.calledOnce);
      assert.isTrue(stubGeneralSettingsGroupView.start.calledOnce);
      assert.isTrue(stubHandwritingSettingsGroupView.start.calledOnce);

      assert.isTrue(document.getElementById.calledWith('header'));
      assert.isTrue(headerStub.addEventListener.calledWith('action', app));

      assert.isTrue(
        document.addEventListener.calledWith('visibilitychange', app));
    });

    teardown(function() {
      app.stop();

      assert.isTrue(stubGeneralSettingsGroupView.stop.calledOnce);
      assert.isTrue(stubHandwritingSettingsGroupView.stop.calledOnce);

      assert.isTrue(headerStub.removeEventListener.calledWith('action', app));

      assert.isTrue(
        document.removeEventListener.calledWith('visibilitychange', app));
    });

    test('start/stop', function() {});

    test('back', function() {
      app.handleEvent({
        type: 'action'
      });

      assert.isTrue(window.MozActivity.calledWith({
        name: 'moz_configure_window',
        data: { target: 'device' }
      }));
    });

    test('visibilitychange to hidden', function() {
      isHidden = true;
      app.handleEvent({
        type: 'visibilitychange'
      });

      assert.isTrue(window.close.calledOnce);
    });

    test('visibilitychange to visible w/ stay awake lock', function() {
      var lock = app.closeLockManager.requestLock('stayAwake');

      isHidden = true;
      app.handleEvent({
        type: 'visibilitychange'
      });
      assert.isFalse(window.close.calledOnce);

      isHidden = false;
      app.handleEvent({
        type: 'visibilitychange'
      });
      assert.isFalse(window.close.calledOnce);

      lock.unlock();
      assert.isFalse(window.close.calledOnce);
    });
  });
});
