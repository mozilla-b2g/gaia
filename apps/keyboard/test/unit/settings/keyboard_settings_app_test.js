'use strict';

/* global GeneralSettingsGroupView, HandwritingSettingsGroupView,
          KeyboardSettingsApp, UserDictionaryListPanel, PanelController,
          UserDictionaryEditDialog */

require('/js/settings/close_locks.js');
require('/js/settings/general_settings.js');
require('/js/settings/handwriting_settings.js');
require('/js/settings/panel_controller.js');
require('/js/settings/user_dictionary_edit_dialog.js');
require('/js/settings/user_dictionary_list_panel.js');

require('/js/settings/keyboard_settings_app.js');

suite('KeyboardSettingsApp', function() {
  var app;

  var realMozActivity;

  var headerStub;
  var menuUDStub;
  var rootPanelStub;
  var stubGetElemById;
  var stubGeneralSettingsGroupView;
  var stubHandwritingSettingsGroupView;
  var stubPanelController;
  var stubUserDictionaryListPanel;
  var stubUserDictionaryEditDialog;

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

    menuUDStub = document.createElement('a');
    this.sinon.spy(menuUDStub, 'addEventListener');
    this.sinon.spy(menuUDStub, 'removeEventListener');

    rootPanelStub = document.createElement('section');
    this.sinon.spy(rootPanelStub, 'addEventListener');
    this.sinon.spy(rootPanelStub, 'removeEventListener');

    window.SettingsPromiseManager = this.sinon.stub();

    stubGeneralSettingsGroupView =
      this.sinon.stub(Object.create(GeneralSettingsGroupView.prototype));
    this.sinon.stub(window, 'GeneralSettingsGroupView')
      .returns(stubGeneralSettingsGroupView);

    stubHandwritingSettingsGroupView =
      this.sinon.stub(Object.create(HandwritingSettingsGroupView.prototype));
    this.sinon.stub(window, 'HandwritingSettingsGroupView')
      .returns(stubHandwritingSettingsGroupView);

    stubPanelController =
      this.sinon.stub(Object.create(PanelController.prototype));
    this.sinon.stub(window, 'PanelController')
      .returns(stubPanelController);

    stubUserDictionaryListPanel =
      this.sinon.stub(Object.create(UserDictionaryListPanel.prototype));
    this.sinon.stub(window, 'UserDictionaryListPanel')
      .returns(stubUserDictionaryListPanel);

    stubUserDictionaryEditDialog =
      this.sinon.stub(Object.create(UserDictionaryEditDialog.prototype));
    this.sinon.stub(window, 'UserDictionaryEditDialog')
      .returns(stubUserDictionaryEditDialog);

    stubGetElemById = this.sinon.stub(document, 'getElementById', function(id){
      switch (id) {
        case 'menu-userdict':
          return menuUDStub;
        case 'root-header':
          return headerStub;
        case 'root':
          return rootPanelStub;
      }
    });

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
      assert.isTrue(stubGeneralSettingsGroupView.start.calledOnce);
      assert.isTrue(stubHandwritingSettingsGroupView.start.calledOnce);
      assert.isTrue(stubPanelController.start.calledOnce);

      assert.isTrue(document.getElementById.calledWith('root'));
      assert.isTrue(document.getElementById.calledWith('root-header'));
      assert.isTrue(document.getElementById.calledWith('menu-userdict'));

      assert.equal(PanelController.getCall(0).args[0], rootPanelStub);
      assert.equal(UserDictionaryListPanel.getCall(0).args[0], app);

      assert.isTrue(menuUDStub.addEventListener.calledWith('click', app));
      assert.isTrue(headerStub.addEventListener.calledWith('action', app));

      assert.isTrue(
        document.addEventListener.calledWith('visibilitychange', app));
    });

    teardown(function() {
      if (!skipStopOnTeardown) {
        app.stop();
      }

      assert.isTrue(stubGeneralSettingsGroupView.stop.calledOnce);
      assert.isTrue(stubHandwritingSettingsGroupView.stop.calledOnce);
      assert.isTrue(stubPanelController.stop.calledOnce);
      assert.isTrue(stubUserDictionaryListPanel.uninit.calledOnce);
      assert.isTrue(stubUserDictionaryEditDialog.uninit.calledOnce);

      assert.isTrue(menuUDStub.removeEventListener.calledWith('click', app));
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

    test('click', function() {
      var evt = {
        type: 'click',
        preventDefault: this.sinon.spy()
      };

      app.handleEvent(evt);

      assert.isTrue(app.panelController.navigateToPanel.calledWith(
        app.userDictionaryListPanel));

      assert.isTrue(evt.preventDefault.called);
    });
  });

  test('Should not bind click event if without UserDictionary', function() {
    var oldPanelController = window.PanelController;
    window.PanelController = undefined;

    app.start();

    assert.isFalse(stubGetElemById.calledWith('menu-userdict'));

    app.stop();

    window.PanelController = oldPanelController;
  });
});
