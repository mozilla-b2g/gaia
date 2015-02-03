'use strict';

/* global KeyboardApp, KeyboardConsole, InputMethodManager,
          InputMethodDatabaseLoader, LayoutManager, SettingsPromiseManager,
          L10nLoader, TargetHandlersManager, FeedbackManager,
          VisualHighlightManager, CandidatePanelManager, UpperCaseStateManager,
          LayoutRenderingManager, StateManager,
          MockInputMethodManager, HandwritingPadsManager, ViewManager */

require('/js/keyboard/console.js');
require('/js/keyboard/input_method_manager.js');
require('/js/keyboard/input_method_database_loader.js');
require('/js/keyboard/layout_manager.js');
require('/js/keyboard/settings.js');
require('/js/keyboard/l10n_loader.js');
require('/js/keyboard/target_handlers_manager.js');
require('/js/keyboard/handwriting_pads_manager.js');
require('/js/keyboard/feedback_manager.js');
require('/js/keyboard/visual_highlight_manager.js');
require('/js/keyboard/candidate_panel_manager.js');
require('/js/keyboard/upper_case_state_manager.js');
require('/js/keyboard/layout_rendering_manager.js');
require('/js/keyboard/state_manager.js');
require('/js/keyboard/view_manager.js');

requireApp('keyboard/shared/test/unit/mocks/mock_event_target.js');
requireApp('keyboard/shared/test/unit/mocks/mock_navigator_input_method.js');

require('/js/keyboard/keyboard_app.js');

suite('KeyboardApp', function() {
  var consoleStub;
  var inputMethodManagerStub;
  var inputMethodDatabaseLoaderStub;
  var layoutManagerStub;
  var settingsPromiseManagerStub;
  var l10nLoaderStub;
  var targetHandlersManagerStub;
  var handwritingPadsManagerStub;
  var feedbackManagerStub;
  var visualHighlightManagerStub;
  var candidatePanelManagerStub;
  var upperCaseStateManagerStub;
  var layoutRenderingManagerStub;
  var stateManagerStub;
  var viewManagerStub;

  var app;
  var realMozInputMethod;

  setup(function() {
    realMozInputMethod = navigator.mozInputMethod;
    navigator.mozInputMethod = {
      mgmt: this.sinon.stub(MockInputMethodManager.prototype)
    };

    consoleStub = this.sinon.stub(KeyboardConsole.prototype);
    this.sinon.stub(window, 'KeyboardConsole').returns(consoleStub);

    inputMethodDatabaseLoaderStub =
      this.sinon.stub(InputMethodDatabaseLoader.prototype);
    this.sinon.stub(window, 'InputMethodDatabaseLoader')
      .returns(inputMethodDatabaseLoaderStub);

    inputMethodManagerStub = this.sinon.stub(InputMethodManager.prototype);
    this.sinon.stub(window, 'InputMethodManager')
      .returns(inputMethodManagerStub);

    layoutManagerStub = this.sinon.stub(LayoutManager.prototype);
    this.sinon.stub(window, 'LayoutManager').returns(layoutManagerStub);

    settingsPromiseManagerStub =
      this.sinon.stub(SettingsPromiseManager.prototype);
    this.sinon.stub(window, 'SettingsPromiseManager')
      .returns(settingsPromiseManagerStub);

    l10nLoaderStub = this.sinon.stub(L10nLoader.prototype);
    this.sinon.stub(window, 'L10nLoader').returns(l10nLoaderStub);

    targetHandlersManagerStub =
      this.sinon.stub(TargetHandlersManager.prototype);
    this.sinon.stub(window, 'TargetHandlersManager')
      .returns(targetHandlersManagerStub);

    handwritingPadsManagerStub =
      this.sinon.stub(HandwritingPadsManager.prototype);
    this.sinon.stub(window, 'HandwritingPadsManager')
      .returns(handwritingPadsManagerStub);

    feedbackManagerStub = this.sinon.stub(FeedbackManager.prototype);
    this.sinon.stub(window, 'FeedbackManager').returns(feedbackManagerStub);

    visualHighlightManagerStub =
      this.sinon.stub(VisualHighlightManager.prototype);
    this.sinon.stub(window, 'VisualHighlightManager')
      .returns(visualHighlightManagerStub);

    candidatePanelManagerStub =
      this.sinon.stub(CandidatePanelManager.prototype);
    this.sinon.stub(window, 'CandidatePanelManager')
      .returns(candidatePanelManagerStub);

    upperCaseStateManagerStub =
      this.sinon.stub(UpperCaseStateManager.prototype);
    this.sinon.stub(window, 'UpperCaseStateManager')
      .returns(upperCaseStateManagerStub);

    layoutRenderingManagerStub =
      this.sinon.stub(LayoutRenderingManager.prototype);
    this.sinon.stub(window, 'LayoutRenderingManager')
      .returns(layoutRenderingManagerStub);

    stateManagerStub =
      this.sinon.stub(StateManager.prototype);
    this.sinon.stub(window, 'StateManager')
      .returns(stateManagerStub);

    viewManagerStub =
      this.sinon.stub(ViewManager.prototype);
    this.sinon.stub(window, 'ViewManager')
      .returns(viewManagerStub);

    window.requestAnimationFrame = this.sinon.stub();

    app = new KeyboardApp();
    app.start();

    assert.isTrue(window.KeyboardConsole.calledWithNew());
    assert.isTrue(window.InputMethodManager.calledWithNew());
    assert.isTrue(window.InputMethodDatabaseLoader.calledWithNew());
    assert.isTrue(window.LayoutManager.calledWithNew());
    assert.isTrue(window.SettingsPromiseManager.calledWithNew());
    assert.isTrue(window.L10nLoader.calledWithNew());
    assert.isTrue(window.TargetHandlersManager.calledWithNew());
    assert.isTrue(window.FeedbackManager.calledWithNew());
    assert.isTrue(window.VisualHighlightManager.calledWithNew());
    assert.isTrue(window.CandidatePanelManager.calledWithNew());
    assert.isTrue(window.UpperCaseStateManager.calledWithNew());
    assert.isTrue(window.LayoutRenderingManager.calledWithNew());
    assert.isTrue(window.StateManager.calledWithNew());
    assert.isTrue(window.ViewManager.calledWithNew());

    assert.isTrue(window.InputMethodManager.calledWith(app));
    assert.isTrue(window.InputMethodDatabaseLoader.calledWith(app));
    assert.isTrue(window.LayoutManager.calledWith(app));
    assert.isTrue(window.TargetHandlersManager.calledWith(app));
    assert.isTrue(window.FeedbackManager.calledWith(app));
    assert.isTrue(window.VisualHighlightManager.calledWith(app));
    assert.isTrue(window.CandidatePanelManager.calledWith(app));
    assert.isTrue(window.ViewManager.calledWith(app));

    assert.isTrue(consoleStub.start.calledOnce);
    assert.isTrue(inputMethodManagerStub.start.calledOnce);
    assert.isTrue(inputMethodDatabaseLoaderStub.start.calledOnce);
    assert.isTrue(layoutManagerStub.start.calledOnce);
    assert.isTrue(targetHandlersManagerStub.start.calledOnce);
    assert.isTrue(handwritingPadsManagerStub.start.calledOnce);
    assert.isTrue(feedbackManagerStub.start.calledOnce);
    assert.isTrue(visualHighlightManagerStub.start.calledOnce);
    assert.isTrue(candidatePanelManagerStub.start.calledOnce);
    assert.isTrue(upperCaseStateManagerStub.start.calledOnce);
    assert.isTrue(layoutRenderingManagerStub.start.calledOnce);
    assert.isTrue(stateManagerStub.start.calledOnce);
    assert.isTrue(viewManagerStub.start.calledOnce);
  });

  teardown(function() {
    app.stop();

    assert.isTrue(inputMethodDatabaseLoaderStub.stop.calledOnce);
    assert.isTrue(targetHandlersManagerStub.stop.calledOnce);
    assert.isTrue(handwritingPadsManagerStub.stop.calledOnce);
    assert.isTrue(feedbackManagerStub.stop.calledOnce);
    assert.isTrue(visualHighlightManagerStub.stop.calledOnce);
    assert.isTrue(candidatePanelManagerStub.stop.calledOnce);
    assert.isTrue(upperCaseStateManagerStub.stop.calledOnce);
    assert.isTrue(layoutRenderingManagerStub.stop.calledOnce);
    assert.isTrue(stateManagerStub.stop.calledOnce);
    assert.isTrue(viewManagerStub.stop.calledOnce);

    navigator.mozInputMethod = realMozInputMethod;
  });

  test('getContainer', function() {
    var el = {};
    this.sinon.stub(document, 'getElementById').returns(el);

    var result = app.getContainer();
    assert.isTrue(
      document.getElementById.calledWith(app.CONATINER_ELEMENT_ID));
    assert.equal(result, el);
  });

  test('setInputContext', function() {
    var inputContext = {};

    app.setInputContext(inputContext);

    assert.equal(app.inputContext, inputContext);
  });

  suite('getBasicInputType', function() {
    test('without inputContext', function() {
      var result = app.getBasicInputType();
      assert.equal(result, 'text');
    });

    test('inputType = url', function() {
      app.inputContext = {
        inputType: 'url'
      };

      var result = app.getBasicInputType();
      assert.equal(result, 'url');
    });

    test('inputType = tel', function() {
      app.inputContext = {
        inputType: 'tel'
      };

      var result = app.getBasicInputType();
      assert.equal(result, 'tel');
    });

    test('inputType = email', function() {
      app.inputContext = {
        inputType: 'email'
      };

      var result = app.getBasicInputType();
      assert.equal(result, 'email');
    });

    test('inputType = text', function() {
      app.inputContext = {
        inputType: 'text'
      };

      var result = app.getBasicInputType();
      assert.equal(result, 'text');
    });

    test('inputType = password', function() {
      app.inputContext = {
        inputType: 'password'
      };

      var result = app.getBasicInputType();
      assert.equal(result, 'text');
    });

    test('inputType = search', function() {
      app.inputContext = {
        inputType: 'search'
      };

      var result = app.getBasicInputType();
      assert.equal(result, 'search');
    });

    test('inputType = foo', function() {
      app.inputContext = {
        inputType: 'foo'
      };

      var result = app.getBasicInputType();
      assert.equal(result, 'text');
    });

    test('inputType = number', function() {
      app.inputContext = {
        inputType: 'number'
      };

      var result = app.getBasicInputType();
      assert.equal(result, 'number');
    });

    test('inputType = range', function() {
      app.inputContext = {
        inputType: 'range'
      };

      var result = app.getBasicInputType();
      assert.equal(result, 'number');
    });
  });

  test('supportsSwitching', function() {
    navigator.mozInputMethod.mgmt.supportsSwitching.returns(true);

    var result = app.supportsSwitching();
    assert.isTrue(navigator.mozInputMethod.mgmt.supportsSwitching.calledOnce);
    assert.isTrue(result);
  });

  test('setLayoutPage', function() {
    app.inputMethodManager.currentIMEngine = {
      setLayoutPage: this.sinon.stub()
    };
    app.layoutManager.currentPageIndex = 42;

    app.setLayoutPage(12);

    assert.isTrue(
      app.layoutManager.updateLayoutPage.calledWith(12));
    assert.isTrue(
      app.layoutRenderingManager.updateLayoutRendering.calledOnce);
    assert.isTrue(
      app.inputMethodManager.currentIMEngine.setLayoutPage.calledWith(42));
  });
});
