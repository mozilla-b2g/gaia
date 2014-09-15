'use strict';

/* global LayoutManager, InputMethodManager, L10nLoader, CandidatePanelManager,
          ActiveTargetsManager, UpperCaseStateManager, SettingsPromiseManager,
          LayoutRenderingManager, KeyboardConsole, LayoutLoader,
          InputMethodLoader, StateManager, MockInputMethod, MockInputContext,
          MockEventTarget, MockPromise, Promise */

require('/js/keyboard/console.js');
require('/js/keyboard/input_method_manager.js');
require('/js/keyboard/layout_manager.js');
require('/js/keyboard/layout_loader.js');
require('/js/keyboard/settings.js');
require('/js/keyboard/l10n_loader.js');
require('/js/keyboard/active_targets_manager.js');
require('/js/keyboard/candidate_panel_manager.js');
require('/js/keyboard/upper_case_state_manager.js');
require('/js/keyboard/layout_rendering_manager.js');
require('/shared/test/unit/mocks/mock_promise.js');

require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_navigator_input_method.js');

require('/js/keyboard/state_manager.js');

suite('StateManager', function() {
  var manager;
  var app;
  var realMozInputMethod;
  var realPromise;
  var windowStub;

  suiteSetup(function() {
    Object.defineProperty(
      document, 'hidden',
      {
        value: true,
        writable: true,
        configurable: true
      });
  });

  setup(function() {
    app = {
      layoutManager: this.sinon.stub(LayoutManager.prototype),
      inputMethodManager: this.sinon.stub(InputMethodManager.prototype),
      l10nLoader: this.sinon.stub(L10nLoader.prototype),
      candidatePanelManager: this.sinon.stub(CandidatePanelManager.prototype),
      targetHandlersManager: {
        activeTargetsManager: this.sinon.stub(ActiveTargetsManager.prototype)
      },
      upperCaseStateManager: this.sinon.stub(UpperCaseStateManager.prototype),
      setInputContext: this.sinon.stub(),
      settingsPromiseManager: this.sinon.stub(SettingsPromiseManager.prototype),
      layoutRenderingManager: this.sinon.stub(LayoutRenderingManager.prototype),
      console: this.sinon.stub(KeyboardConsole.prototype)
    };

    app.layoutManager.loader = this.sinon.stub(LayoutLoader.prototype);
    app.inputMethodManager.loader =
      this.sinon.stub(InputMethodLoader.prototype);

    windowStub = new MockEventTarget();

    this.sinon.stub(window, 'addEventListener',
      windowStub.addEventListener.bind(windowStub));
    this.sinon.stub(window, 'removeEventListener',
      windowStub.removeEventListener.bind(windowStub));

    window.location.hash = '#foo';

    realMozInputMethod = navigator.mozInputMethod;
    navigator.mozInputMethod = new MockInputMethod();

    realPromise = window.Promise;
    window.Promise = this.sinon.spy(MockPromise);

    this.sinon.stub(window, 'setTimeout');

    manager = new StateManager(app);
  });

  teardown(function() {
    manager.stop();

    assert.isTrue(
      window.removeEventListener.calledWith('hashchange', manager));
    assert.isTrue(
      window.removeEventListener.calledWith('visibilitychange', manager));

    navigator.mozInputMethod = realMozInputMethod;
    window.Promise = realPromise;
  });

  suite('start with not hidden', function() {
    setup(function() {
      document.hidden = false;
      navigator.mozInputMethod.setInputContext(new MockInputContext());
      app.inputContext = navigator.mozInputMethod.inputcontext;

      var switchCurrentLayoutPromise = Promise.resolve();
      var switchCurrentIMEnginePromise = Promise.resolve();
      var updateLayoutRenderingPromise = Promise.resolve();

      app.layoutManager.currentPage = {
        imEngine: 'bar'
      };

      app.layoutManager.switchCurrentLayout
        .returns(switchCurrentLayoutPromise);
      app.inputMethodManager.switchCurrentIMEngine
        .returns(switchCurrentIMEnginePromise);
      app.layoutRenderingManager.updateLayoutRendering
        .returns(updateLayoutRenderingPromise);

      manager.start();

      assert.isTrue(
        window.addEventListener.calledWith('hashchange', manager));
      assert.isTrue(
        window.addEventListener.calledWith('visibilitychange', manager));

      assert.isFalse(app.layoutManager.loader.getLayoutAsync.calledOnce,
        'Should not try to preload layout.');
      assert.isFalse(
        app.inputMethodManager.loader.getInputMethodAsync.calledOnce,
        'Should not try to preload IMEngine.');
      assert.isFalse(app.l10nLoader.load.calledOnce);

      assert.isTrue(app.inputMethodManager.updateInputContextData.calledOnce);

      assert.isTrue(app.candidatePanelManager.hideFullPanel.calledOnce);
      assert.isTrue(app.candidatePanelManager.updateCandidates.calledOnce);
      assert.isFalse(app.targetHandlersManager
        .activeTargetsManager.clearAllTargets.called);

      assert.isTrue(app.layoutManager.switchCurrentLayout.calledWith('foo'));

      // calling _switchCurrentIMEngine()
      var p = switchCurrentLayoutPromise;
      var pReturn = p.mFulfillToValue();
      assert.isTrue(app.upperCaseStateManager.reset.calledOnce);
      assert.isTrue(app.candidatePanelManager.reset.calledOnce);
      assert.isTrue(
        app.inputMethodManager.switchCurrentIMEngine.calledWith('bar'));
      assert.isTrue(app.upperCaseStateManager.reset.calledBefore(
        app.inputMethodManager.switchCurrentIMEngine),
        'Reset the state before engine activates.');

      assert.equal(pReturn, switchCurrentIMEnginePromise);

      // Calling _updateLayoutRendering()
      var p2 = p.mGetNextPromise();
      var p2Return = p2.mFulfillToValue();

      assert.isTrue(
        app.layoutRenderingManager.updateLayoutRendering.calledOnce);

      assert.equal(p2Return, updateLayoutRenderingPromise);
      var p3 = p2.mGetNextPromise();
      p3.mFulfillToValue();

      assert.isTrue(app.l10nLoader.load.calledOnce);
      assert.isTrue(app.l10nLoader.load.calledOn(app.l10nLoader));
    });

    test('hashchange', function() {
      window.location.hash = '#foo2';
      var evt = {
        type: 'hashchange'
      };

      var switchCurrentLayoutPromise = Promise.resolve();
      var switchCurrentIMEnginePromise = Promise.resolve();
      var updateLayoutRenderingPromise = Promise.resolve();

      app.layoutManager.currentPage = {
        imEngine: 'bar2'
      };

      app.layoutManager.switchCurrentLayout
        .returns(switchCurrentLayoutPromise);
      app.inputMethodManager.switchCurrentIMEngine
        .returns(switchCurrentIMEnginePromise);
      app.layoutRenderingManager.updateLayoutRendering
        .returns(updateLayoutRenderingPromise);

      windowStub.dispatchEvent(evt);

      // Start layout switching
      assert.isTrue(app.candidatePanelManager.hideFullPanel.calledTwice);
      assert.isTrue(app.candidatePanelManager.updateCandidates.calledTwice);
      assert.isFalse(app.targetHandlersManager
        .activeTargetsManager.clearAllTargets.called);

      assert.isTrue(app.layoutManager.switchCurrentLayout.calledWith('foo2'));

      // calling _switchCurrentIMEngine()
      var p = switchCurrentLayoutPromise;
      var pReturn = p.mFulfillToValue();
      assert.isTrue(app.upperCaseStateManager.reset.calledTwice);
      assert.isTrue(
        app.inputMethodManager.switchCurrentIMEngine.calledWith('bar2'));
      assert.isTrue(app.upperCaseStateManager.reset.calledBefore(
        app.inputMethodManager.switchCurrentIMEngine),
        'Reset the state before engine activates.');

      assert.equal(pReturn, switchCurrentIMEnginePromise);

      // Calling _updateLayoutRendering()
      var p2 = p.mGetNextPromise();
      var p2Return = p2.mFulfillToValue();

      assert.isTrue(
        app.layoutRenderingManager.updateLayoutRendering.calledTwice);

      assert.equal(p2Return, updateLayoutRenderingPromise);
      var p3 = p2.mGetNextPromise();
      p3.mFulfillToValue();

      assert.isTrue(app.l10nLoader.load.calledTwice);
      assert.isTrue(app.l10nLoader.load.calledOn(app.l10nLoader));
    });

    suite('deactivate', function() {
      var p, resolved, rejected;
      setup(function() {
        // triggers inputcontextchange
        navigator.mozInputMethod.setInputContext();
        app.inputContext = null;

        p = window.Promise.firstCall.returnValue;
        p.mExecuteCallback(function resolve() {
          resolved = true;
        }, function reject() {
          rejected = true;
        });

        assert.equal(window.setTimeout.firstCall.args[1],
          manager.DEACTIVATE_DELAY);
      });

      test('finishing deactivation', function() {
        window.setTimeout.firstCall.args[0].call(window);
        assert.isTrue(resolved);

        p.mFulfillToValue();

        assert.isTrue(app.candidatePanelManager.hideFullPanel.calledTwice);
        assert.isTrue(app.candidatePanelManager.updateCandidates.calledTwice);
        assert.isTrue(app.targetHandlersManager
          .activeTargetsManager.clearAllTargets.calledOnce);

        var p2 = p.mGetNextPromise();
        p2.mFulfillToValue();

        assert.isTrue(app.inputMethodManager.switchCurrentIMEngine
          .getCall(1).calledWith('default'));

        // trigger visibilitychange (after inputcontextchange)
        document.hidden = true;
        var evt = {
          type: 'visibilitychange'
        };
        windowStub.dispatchEvent(evt);

        assert.isFalse(window.setTimeout.calledTwice,
          'should not attempt to hide again.');
      });

      test('re-activate right away', function() {
        var switchCurrentLayoutPromise = Promise.resolve();
        var switchCurrentIMEnginePromise = Promise.resolve();
        var updateLayoutRenderingPromise = Promise.resolve();

        app.layoutManager.switchCurrentLayout
          .returns(switchCurrentLayoutPromise);
        app.inputMethodManager.switchCurrentIMEngine
          .returns(switchCurrentIMEnginePromise);
        app.layoutRenderingManager.updateLayoutRendering
          .returns(updateLayoutRenderingPromise);

        document.hidden = false;
        var evt = {
          type: 'visibilitychange'
        };
        windowStub.dispatchEvent(evt);

        navigator.mozInputMethod.setInputContext(new MockInputContext());
        app.inputContext = navigator.mozInputMethod.inputcontext;

        window.setTimeout.firstCall.args[0].call(window);
        assert.isTrue(rejected, 'Should stop unloading.');

        assert.isFalse(app.layoutManager.loader.getLayoutAsync.calledOnce,
          'Should not try to preload layout.');
        assert.isFalse(
          app.inputMethodManager.loader.getInputMethodAsync.calledOnce,
          'Should not try to preload IMEngine.');
        assert.isFalse(app.l10nLoader.load.calledTwice);

        assert.isTrue(
          app.inputMethodManager.updateInputContextData.calledTwice);

        assert.isTrue(app.candidatePanelManager.hideFullPanel.calledTwice);
        assert.isTrue(app.candidatePanelManager.updateCandidates.calledTwice);

        assert.isTrue(
          app.layoutManager.switchCurrentLayout.getCall(1).calledWith('foo'));

        // calling _switchCurrentIMEngine()
        var pLoading = switchCurrentLayoutPromise;
        var pLoadingReturn = pLoading.mFulfillToValue();
        assert.isTrue(app.upperCaseStateManager.reset.calledTwice);
        assert.isTrue(app.inputMethodManager.switchCurrentIMEngine
          .getCall(1).calledWith('bar'));
        assert.isTrue(app.upperCaseStateManager.reset.getCall(1).calledBefore(
          app.inputMethodManager.switchCurrentIMEngine.getCall(1)),
          'Reset the state before engine activates.');

        assert.equal(pLoadingReturn, switchCurrentIMEnginePromise);

        // Calling _updateLayoutRendering()
        var pLoading2 = pLoading.mGetNextPromise();
        var pLoading2Return = pLoading2.mFulfillToValue();

        assert.isTrue(
          app.layoutRenderingManager.updateLayoutRendering.calledTwice);

        assert.equal(pLoading2Return, updateLayoutRenderingPromise);
        var pLoading3 = pLoading2.mGetNextPromise();
        pLoading3.mFulfillToValue();

        assert.isTrue(app.l10nLoader.load.calledTwice);
        assert.isTrue(app.l10nLoader.load.getCall(1).calledOn(app.l10nLoader));
      });
    });
  });

  suite('start with hidden', function() {
    setup(function() {
      document.hidden = true;

      var layout = { imEngine: 'bar' };
      var getLayoutAsyncPromise = Promise.resolve();
      var getInputMethodAsyncPromise = Promise.resolve();

      app.layoutManager.loader.getLayoutAsync.returns(getLayoutAsyncPromise);
      app.inputMethodManager.loader.getInputMethodAsync
        .returns(getInputMethodAsyncPromise);

      manager.start();

      assert.isTrue(
        window.addEventListener.calledWith('hashchange', manager));
      assert.isTrue(
        window.addEventListener.calledWith('visibilitychange', manager));

      assert.isTrue(app.layoutManager.loader.getLayoutAsync.calledWith('foo'));
      var p = getLayoutAsyncPromise;
      p.mFulfillToValue(layout);

      assert.isTrue(
        app.inputMethodManager.loader.getInputMethodAsync.calledWith('bar'));

      var p2 = p.mGetNextPromise();
      var p3 = p2.catch.firstCall.returnValue;
      p3.mFulfillToValue({});

      assert.isTrue(app.l10nLoader.load.calledOnce);
      assert.isTrue(app.l10nLoader.load.calledOn(app.l10nLoader));
    });

    test('hashchange', function() {
      window.location.hash = '#foo2';
      var evt = {
        type: 'hashchange'
      };

      var layout = { imEngine: 'bar2' };
      var getLayoutAsyncPromise = Promise.resolve();
      var getInputMethodAsyncPromise = Promise.resolve();

      app.layoutManager.loader.getLayoutAsync.returns(getLayoutAsyncPromise);
      app.inputMethodManager.loader.getInputMethodAsync
        .returns(getInputMethodAsyncPromise);

      windowStub.dispatchEvent(evt);

      assert.isTrue(app.layoutManager.loader.getLayoutAsync.calledWith('foo2'),
        'Start loading foo2 when hashchanged');
      var p = getLayoutAsyncPromise;
      p.mFulfillToValue(layout);

      assert.isTrue(
        app.inputMethodManager.loader.getInputMethodAsync.calledWith('bar2'));
    });

    suite('activate', function() {
      var switchCurrentLayoutPromise;
      var switchCurrentIMEnginePromise;
      var updateLayoutRenderingPromise;

      setup(function() {
        document.hidden = false;

        var evt = {
          type: 'visibilitychange'
        };

        windowStub.dispatchEvent(evt);

        assert.isFalse(app.layoutManager.switchCurrentLayout.calledOnce,
          'Not launched yet with visibilitychange only.');

        switchCurrentLayoutPromise = Promise.resolve();
        switchCurrentIMEnginePromise = Promise.resolve();
        updateLayoutRenderingPromise = Promise.resolve();

        app.layoutManager.currentPage = {
          imEngine: 'bar'
        };

        app.layoutManager.switchCurrentLayout
          .returns(switchCurrentLayoutPromise);
        app.inputMethodManager.switchCurrentIMEngine
          .returns(switchCurrentIMEnginePromise);
        app.layoutRenderingManager.updateLayoutRendering
          .returns(updateLayoutRenderingPromise);

        navigator.mozInputMethod.setInputContext(new MockInputContext());
        app.inputContext = navigator.mozInputMethod.inputcontext;

        assert.isFalse(app.layoutManager.loader.getLayoutAsync.calledTwice,
          'Should not try to preload layout again.');
        assert.isFalse(
          app.inputMethodManager.loader.getInputMethodAsync.calledTwice,
          'Should not try to preload IMEngine again.');
        assert.isFalse(app.l10nLoader.load.calledTwice);

        assert.isTrue(app.inputMethodManager.updateInputContextData.calledOnce);

        assert.isTrue(app.candidatePanelManager.hideFullPanel.calledOnce);
        assert.isTrue(app.candidatePanelManager.updateCandidates.calledOnce);
        assert.isFalse(app.targetHandlersManager
          .activeTargetsManager.clearAllTargets.called);

        assert.isTrue(app.layoutManager.switchCurrentLayout.calledWith('foo'));
      });

      test('finishing activation', function() {
        // calling _switchCurrentIMEngine()
        var p = switchCurrentLayoutPromise;
        var pReturn = p.mFulfillToValue();
        assert.isTrue(app.upperCaseStateManager.reset.calledOnce);
        assert.isTrue(
          app.inputMethodManager.switchCurrentIMEngine.calledWith('bar'));
        assert.isTrue(app.upperCaseStateManager.reset.calledBefore(
          app.inputMethodManager.switchCurrentIMEngine),
          'Reset the state before engine activates.');

        assert.equal(pReturn, switchCurrentIMEnginePromise);

        // Calling _updateLayoutRendering()
        var p2 = p.mGetNextPromise();
        var p2Return = p2.mFulfillToValue();

        assert.isTrue(
          app.layoutRenderingManager.updateLayoutRendering.calledOnce);

        assert.equal(p2Return, updateLayoutRenderingPromise);
        var p3 = p2.mGetNextPromise();
        p3.mFulfillToValue();

        assert.isTrue(app.l10nLoader.load.calledTwice);
        assert.isTrue(app.l10nLoader.load.getCall(1).calledOn(app.l10nLoader));
      });

      test('de-activate right away', function() {
        document.hidden = true;

        var evt = {
          type: 'visibilitychange'
        };

        windowStub.dispatchEvent(evt);

        var p = window.Promise.firstCall.returnValue;
        var resolved;
        p.mExecuteCallback(function resolve() {
          resolved = true;
        }, function reject() {
          assert.isTrue(false, 'should not reject');
        });

        assert.equal(window.setTimeout.firstCall.args[1],
          manager.DEACTIVATE_DELAY);

        this.sinon.stub(window.Promise, 'reject');

        // calling _switchCurrentIMEngine()
        var pLoading = switchCurrentLayoutPromise;
        var pReturn = pLoading.mFulfillToValue();
        assert.isFalse(app.upperCaseStateManager.reset.calledOnce);
        assert.isFalse(
          app.inputMethodManager.switchCurrentIMEngine.calledWith('bar'));

        assert.equal(pReturn, window.Promise.reject.firstCall.returnValue,
          'Loading should stop when hidden.');

        var pLoading2 = pLoading.mGetNextPromise();
        pLoading2.mRejectToError();
      });
    });
  });
});
