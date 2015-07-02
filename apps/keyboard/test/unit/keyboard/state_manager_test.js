'use strict';

/* global LayoutManager, InputMethodManager, L10nLoader, CandidatePanelManager,
          ActiveTargetsManager, UpperCaseStateManager, SettingsPromiseManager,
          LayoutRenderingManager, KeyboardConsole, LayoutLoader,
          InputMethodLoader, FeedbackManager, StateManager,
          AbortablePromiseQueue,
          MockInputMethod, MockInputContext, MockEventTarget */

require('/js/keyboard/console.js');
require('/js/keyboard/input_method_manager.js');
require('/js/keyboard/layout_manager.js');
require('/js/keyboard/layout_loader.js');
require('/js/keyboard/settings.js');
require('/js/keyboard/l10n_loader.js');
require('/js/keyboard/active_targets_manager.js');
require('/js/keyboard/candidate_panel_manager.js');
require('/js/keyboard/feedback_manager.js');
require('/js/keyboard/upper_case_state_manager.js');
require('/js/keyboard/layout_rendering_manager.js');
require('/js/keyboard/abortable_promise_queue.js');

require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_navigator_input_method.js');

require('/js/keyboard/state_manager.js');

suite('StateManager', function() {
  var manager;
  var app;
  var realMozInputMethod;
  var windowStub;

  var stubAbortablePromiseQueue;

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
    stubAbortablePromiseQueue =
      this.sinon.stub(AbortablePromiseQueue.prototype);
    this.sinon.stub(window, 'AbortablePromiseQueue')
      .returns(stubAbortablePromiseQueue);

    app = {
      layoutManager: this.sinon.stub(LayoutManager.prototype),
      inputMethodManager: this.sinon.stub(InputMethodManager.prototype),
      l10nLoader: this.sinon.stub(L10nLoader.prototype),
      candidatePanelManager: this.sinon.stub(CandidatePanelManager.prototype),
      feedbackManager: this.sinon.stub(FeedbackManager.prototype),
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
  });

  suite('start with not hidden', function() {
    setup(function() {
      document.hidden = false;
      navigator.mozInputMethod.setInputContext(new MockInputContext());
      app.inputContext = navigator.mozInputMethod.inputcontext;

      app.layoutManager.currentPage = {
        imEngine: 'bar'
      };

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

      // Run the queue
      assert.isTrue(stubAbortablePromiseQueue.start.calledOnce);
      assert.isTrue(stubAbortablePromiseQueue.run.calledOnce);
      var value;
      stubAbortablePromiseQueue.run.firstCall.args[0].forEach(function(task) {
        value = task(value);
      });

      assert.isTrue(app.inputMethodManager.deactivateIMEngine.calledOnce);
      assert.isTrue(app.inputMethodManager.updateInputContextData.calledOnce);
      assert.isTrue(app.inputMethodManager.deactivateIMEngine.calledBefore(
        app.inputMethodManager.updateInputContextData),
        'Engine deactivates before updateInputContextData.');

      assert.isTrue(app.candidatePanelManager.hideFullPanel.calledOnce);
      assert.isTrue(app.candidatePanelManager.updateCandidates.calledOnce);
      assert.isFalse(app.targetHandlersManager
        .activeTargetsManager.clearAllTargets.called);
      assert.isTrue(app.feedbackManager.activate.calledOnce);

      assert.isTrue(app.layoutManager.switchCurrentLayout.calledWith('foo'));

      assert.isTrue(app.upperCaseStateManager.reset.calledOnce);
      assert.isTrue(app.candidatePanelManager.reset.calledOnce);
      assert.isTrue(
        app.inputMethodManager.activateIMEngine.calledWith('bar'));
      assert.isTrue(app.upperCaseStateManager.reset.calledBefore(
        app.inputMethodManager.activateIMEngine),
        'Reset the state before engine activates.');

      assert.isTrue(
        app.layoutRenderingManager.updateLayoutRendering.calledOnce);

      assert.isTrue(app.l10nLoader.load.calledOnce);
      assert.isTrue(app.l10nLoader.load.calledOn(app.l10nLoader));
    });

    test('hashchange', function() {
      window.location.hash = '#foo2';
      var evt = {
        type: 'hashchange'
      };

      app.layoutManager.currentPage = {
        imEngine: 'bar2'
      };

      windowStub.dispatchEvent(evt);

      // Run the queue
      assert.isTrue(stubAbortablePromiseQueue.run.calledTwice);
      var value;
      stubAbortablePromiseQueue.run.getCall(1).args[0].forEach(function(task) {
        value = task(value);
      });

      // Start layout switching
      assert.isTrue(app.candidatePanelManager.hideFullPanel.calledTwice);
      assert.isTrue(app.candidatePanelManager.updateCandidates.calledTwice);
      assert.isFalse(app.targetHandlersManager
        .activeTargetsManager.clearAllTargets.called);

      assert.isTrue(app.layoutManager.switchCurrentLayout.calledWith('foo2'));

      assert.isTrue(app.upperCaseStateManager.reset.calledTwice);
      assert.isTrue(
        app.inputMethodManager.activateIMEngine.calledWith('bar2'));
      assert.isTrue(app.upperCaseStateManager.reset.calledBefore(
        app.inputMethodManager.activateIMEngine),
        'Reset the state before engine activates.');

      assert.isTrue(
        app.layoutRenderingManager.updateLayoutRendering.calledTwice);

      assert.isTrue(app.l10nLoader.load.calledTwice);
      assert.isTrue(app.l10nLoader.load.calledOn(app.l10nLoader));
    });

    suite('deactivate', function() {
      setup(function() {
        // triggers inputcontextchange
        navigator.mozInputMethod.setInputContext();
        app.inputContext = null;
      });

      test('finishing deactivation', function() {
        // Run the queue
        assert.isTrue(stubAbortablePromiseQueue.run.calledTwice);
        var value;
        stubAbortablePromiseQueue.run.getCall(1).args[0]
          .forEach(function(task) {
            value = task(value);
          });

        assert.isTrue(app.candidatePanelManager.hideFullPanel.calledTwice);
        assert.isTrue(app.candidatePanelManager.updateCandidates.calledTwice);
        assert.isTrue(app.targetHandlersManager
          .activeTargetsManager.clearAllTargets.calledOnce);
        assert.isTrue(app.feedbackManager.deactivate.calledOnce);

        assert.isTrue(app.inputMethodManager.deactivateIMEngine.calledTwice);

        // trigger visibilitychange (after inputcontextchange)

        // check if deactivation should not be called again by
        // checking hideFullPanel as an example
        app.candidatePanelManager.hideFullPanel.reset();

        document.hidden = true;
        var evt = {
          type: 'visibilitychange'
        };
        windowStub.dispatchEvent(evt);

        assert.isFalse(app.candidatePanelManager.hideFullPanel.called,
          'should not attempt to hide again.');
      });
    });
  });

  suite('start with hidden', function() {
    setup(function() {
      document.hidden = true;

      var layout = { imEngine: 'bar' };
      var getLayoutAsyncPromise = {};

      app.layoutManager.loader.getLayoutAsync.returns(getLayoutAsyncPromise);

      manager.start();

      assert.isTrue(
        window.addEventListener.calledWith('hashchange', manager));
      assert.isTrue(
        window.addEventListener.calledWith('visibilitychange', manager));

      // Run the queue
      assert.isTrue(stubAbortablePromiseQueue.start.calledOnce);
      assert.isTrue(stubAbortablePromiseQueue.run.calledOnce);
      var value;
      stubAbortablePromiseQueue.run.firstCall.args[0].forEach(function(task) {
        // "resolve" this promise
        if (value === getLayoutAsyncPromise) {
          value = layout;
        }
        value = task(value);
      });

      assert.isTrue(app.layoutManager.loader.getLayoutAsync.calledWith('foo'));

      assert.isTrue(
        app.inputMethodManager.loader.getInputMethodAsync.calledWith('bar'));

      assert.isTrue(app.l10nLoader.load.calledOnce);
      assert.isTrue(app.l10nLoader.load.calledOn(app.l10nLoader));
    });

    test('hashchange', function() {
      window.location.hash = '#foo2';
      var evt = {
        type: 'hashchange'
      };

      var layout = { imEngine: 'bar2' };
      var getLayoutAsyncPromise = {};

      app.layoutManager.loader.getLayoutAsync.returns(getLayoutAsyncPromise);

      windowStub.dispatchEvent(evt);

      // Run the queue
      assert.isTrue(stubAbortablePromiseQueue.run.calledTwice);
      var value;
      stubAbortablePromiseQueue.run.getCall(1).args[0].forEach(function(task) {
        // "resolve" this promise
        if (value === getLayoutAsyncPromise) {
          value = layout;
        }
        value = task(value);
      });

      assert.isTrue(app.layoutManager.loader.getLayoutAsync.calledWith('foo2'),
        'Start loading foo2 when hashchanged');
      assert.isTrue(
        app.inputMethodManager.loader.getInputMethodAsync.calledWith('bar2'));
    });

    suite('activate', function() {
      setup(function() {
        document.hidden = false;

        var evt = {
          type: 'visibilitychange'
        };

        windowStub.dispatchEvent(evt);

        assert.isFalse(app.layoutManager.switchCurrentLayout.calledOnce,
          'Not launched yet with visibilitychange only.');

        app.layoutManager.currentPage = {
          imEngine: 'bar'
        };

        navigator.mozInputMethod.setInputContext(new MockInputContext());
        app.inputContext = navigator.mozInputMethod.inputcontext;

        assert.isFalse(app.layoutManager.loader.getLayoutAsync.calledTwice,
          'Should not try to preload layout again.');
        assert.isFalse(
          app.inputMethodManager.loader.getInputMethodAsync.calledTwice,
          'Should not try to preload IMEngine again.');
        assert.isFalse(app.l10nLoader.load.calledTwice);
      });

      test('finishing activation', function() {
        // Run the queue
        assert.isTrue(stubAbortablePromiseQueue.run.calledTwice);
        var value;
        stubAbortablePromiseQueue.run.getCall(1).args[0]
          .forEach(function(task) {
            value = task(value);
          });

        assert.isTrue(app.inputMethodManager.deactivateIMEngine.calledOnce);
        assert.isTrue(app.inputMethodManager.updateInputContextData.calledOnce);
        assert.isTrue(app.inputMethodManager.deactivateIMEngine.calledBefore(
          app.inputMethodManager.updateInputContextData),
          'Engine deactivates before updateInputContextData.');

        assert.isTrue(app.candidatePanelManager.hideFullPanel.calledOnce);
        assert.isTrue(app.candidatePanelManager.updateCandidates.calledOnce);
        assert.isFalse(app.targetHandlersManager
          .activeTargetsManager.clearAllTargets.called);
        assert.isTrue(app.feedbackManager.activate.calledOnce);

        assert.isTrue(app.layoutManager.switchCurrentLayout.calledWith('foo'));

        assert.isTrue(app.upperCaseStateManager.reset.calledOnce);
        assert.isTrue(
          app.inputMethodManager.activateIMEngine.calledWith('bar'));
        assert.isTrue(app.upperCaseStateManager.reset.calledBefore(
          app.inputMethodManager.activateIMEngine),
          'Reset the state before engine activates.');

        assert.isTrue(
          app.layoutRenderingManager.updateLayoutRendering.calledOnce);

        assert.isTrue(app.l10nLoader.load.calledTwice);
        assert.isTrue(app.l10nLoader.load.getCall(1).calledOn(app.l10nLoader));
      });
    });
  });
});
