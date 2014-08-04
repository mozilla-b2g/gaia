'use strict';

/* global LayoutManager, InputMethodManager, L10nLoader, CandidatePanelManager,
          ActiveTargetsManager, UpperCaseStateManager, SettingsPromiseManager,
          LayoutRenderingManager, PerformanceTimer, LayoutLoader,
          InputMethodLoader, StateManager, MockInputMethod, MockInputContext,
          MockEventTarget, Promise */

require('/js/keyboard/performance_timer.js');
require('/js/keyboard/input_method_manager.js');
require('/js/keyboard/layout_manager.js');
require('/js/keyboard/layout_loader.js');
require('/js/keyboard/settings.js');
require('/js/keyboard/l10n_loader.js');
require('/js/keyboard/active_targets_manager.js');
require('/js/keyboard/candidate_panel_manager.js');
require('/js/keyboard/upper_case_state_manager.js');
require('/js/keyboard/layout_rendering_manager.js');

require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_navigator_input_method.js');

require('/js/keyboard/state_manager.js');

suite('StateManager', function() {
  var manager;
  var app;
  var realMozInputMethod;
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
      perfTimer: this.sinon.stub(PerformanceTimer.prototype)
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
    setup(function(done) {
      document.hidden = false;
      navigator.mozInputMethod.setInputContext(new MockInputContext());
      app.inputContext = navigator.mozInputMethod.inputcontext;

      var p = Promise.resolve();
      var p2 = Promise.resolve();
      var p3 = Promise.resolve();

      app.layoutManager.currentModifiedLayout = {
        imEngine: 'bar'
      };

      app.layoutManager.switchCurrentLayout.returns(p);
      app.inputMethodManager.switchCurrentIMEngine.returns(p2);
      app.layoutRenderingManager.updateLayoutRendering.returns(p3);

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

      assert.isTrue(app.layoutManager.switchCurrentLayout.calledWith('foo'));
      p.then(function() {
        assert.isTrue(app.upperCaseStateManager.reset.calledOnce);
        assert.isTrue(
          app.inputMethodManager.switchCurrentIMEngine.calledWith('bar'));
        assert.isTrue(app.upperCaseStateManager.reset.calledBefore(
          app.inputMethodManager.switchCurrentIMEngine),
          'Reset the state before engine activates.');

        return p2;
      }, function() {
        assert.isTrue(false, 'Should not reject.');
      }).then(function() {
        assert.isTrue(app.candidatePanelManager.hideFullPanel.calledOnce);
        assert.isTrue(app.candidatePanelManager.updateCandidates.calledOnce);
        assert.isTrue(app.targetHandlersManager
          .activeTargetsManager.clearAllTargets.calledOnce);

        assert.isTrue(
          app.layoutRenderingManager.updateLayoutRendering.calledOnce);

        return p3;
      }, function() {
        assert.isTrue(false, 'Should not reject.');
      }).then(function() {
        assert.isTrue(app.l10nLoader.load.calledOnce);
        assert.isTrue(app.l10nLoader.load.calledOn(app.l10nLoader));
      }, function() {
        assert.isTrue(false, 'Should not reject.');
      }).then(done, done);
    });

    test('hashchange', function(done) {
      window.location.hash = '#foo2';
      var evt = {
        type: 'hashchange'
      };

      var p = Promise.resolve();
      var p2 = Promise.resolve();
      var p3 = Promise.resolve();

      app.layoutManager.currentModifiedLayout = {
        imEngine: 'bar2'
      };

      app.layoutManager.switchCurrentLayout.returns(p);
      app.inputMethodManager.switchCurrentIMEngine.returns(p2);
      app.layoutRenderingManager.updateLayoutRendering.returns(p3);

      windowStub.dispatchEvent(evt);

      // Start layout switching
      assert.isTrue(app.inputMethodManager.updateInputContextData.calledTwice);

      assert.isTrue(
        app.layoutManager.switchCurrentLayout.getCall(1).calledWith('foo2'));
      p.then(function() {
        assert.isTrue(app.upperCaseStateManager.reset.calledTwice);
        assert.isTrue(app.inputMethodManager.switchCurrentIMEngine
          .getCall(1).calledWith('bar2'));
        assert.isTrue(app.upperCaseStateManager.reset.getCall(1).calledBefore(
          app.inputMethodManager.switchCurrentIMEngine.getCall(1)),
          'Reset the state before engine activates.');

        return p2;
      }).then(function() {
        assert.isTrue(app.candidatePanelManager.hideFullPanel.calledTwice);
        assert.isTrue(app.candidatePanelManager.updateCandidates.calledTwice);
        assert.isTrue(app.targetHandlersManager
          .activeTargetsManager.clearAllTargets.calledTwice);

        assert.isTrue(
          app.layoutRenderingManager.updateLayoutRendering.calledTwice);

        return p3;
      }).then(function() {
        assert.isTrue(app.l10nLoader.load.calledTwice);
        assert.isTrue(app.l10nLoader.load.getCall(1).calledOn(app.l10nLoader));
      }).then(done, done);
    });

    suite('not active', function() {
      setup(function() {
        document.hidden = true;

        var evt = {
          type: 'visibilitychange'
        };

        windowStub.dispatchEvent(evt);

        assert.isTrue(app.candidatePanelManager.hideFullPanel.calledTwice);
        assert.isTrue(app.candidatePanelManager.updateCandidates.calledTwice);
        assert.isTrue(app.targetHandlersManager
          .activeTargetsManager.clearAllTargets.calledTwice);
        assert.isTrue(app.inputMethodManager.switchCurrentIMEngine
          .getCall(1).calledWith('default'));

        navigator.mozInputMethod.setInputContext();
        app.inputContext = null;

        assert.isFalse(app.candidatePanelManager.hideFullPanel.calledThrice,
          'Should not disable current layout again.');
        assert.isFalse(app.candidatePanelManager.updateCandidates.calledThrice,
          'Should not disable current layout again.');
        assert.isFalse(app.targetHandlersManager
          .activeTargetsManager.clearAllTargets.calledThrice,
          'Should not disable current layout again.');
        assert.isFalse(
          app.inputMethodManager.switchCurrentIMEngine.calledThrice,
          'Should not disable current layout again.');
      });

      test('not active', function() {
      });

      test('re-active right away', function(done) {
        var p = Promise.resolve();
        var p2 = Promise.resolve();
        var p3 = Promise.resolve();

        app.layoutManager.switchCurrentLayout.returns(p);
        app.inputMethodManager.switchCurrentIMEngine.returns(p2);
        app.layoutRenderingManager.updateLayoutRendering.returns(p3);

        document.hidden = false;
        var evt = {
          type: 'visibilitychange'
        };
        windowStub.dispatchEvent(evt);

        navigator.mozInputMethod.setInputContext(new MockInputContext());
        app.inputContext = navigator.mozInputMethod.inputcontext;

        assert.isFalse(app.layoutManager.loader.getLayoutAsync.calledOnce,
          'Should not try to preload layout.');
        assert.isFalse(
          app.inputMethodManager.loader.getInputMethodAsync.calledOnce,
          'Should not try to preload IMEngine.');
        assert.isFalse(app.l10nLoader.load.calledTwice);

        assert.isTrue(
          app.inputMethodManager.updateInputContextData.calledTwice);

        assert.isTrue(app.layoutManager.switchCurrentLayout.calledWith('foo'));
        p.then(function() {
          assert.isTrue(app.upperCaseStateManager.reset.calledTwice);
          assert.isTrue(app.inputMethodManager.switchCurrentIMEngine
            .getCall(2).calledWith('bar'));
          assert.isTrue(app.upperCaseStateManager.reset.getCall(1).calledBefore(
            app.inputMethodManager.switchCurrentIMEngine.getCall(2)),
            'Reset the state before engine activates.');

          return p2;
        }).then(function() {
          assert.isTrue(app.candidatePanelManager.hideFullPanel.calledThrice);
          assert.isTrue(
            app.candidatePanelManager.updateCandidates.calledThrice);
          assert.isTrue(app.targetHandlersManager
            .activeTargetsManager.clearAllTargets.calledThrice);

          assert.isTrue(
            app.layoutRenderingManager.updateLayoutRendering.calledTwice);

          return p3;
        }).then(function() {
          assert.isTrue(app.l10nLoader.load.calledTwice);
          assert.isTrue(
            app.l10nLoader.load.getCall(1).calledOn(app.l10nLoader));
        }).then(done, done);
      });
    });
  });

  suite('start with hidden', function() {
    setup(function(done) {
      document.hidden = true;

      var layout = { imEngine: 'bar' };
      var p = Promise.resolve(layout);
      var p2 = Promise.resolve({});

      app.layoutManager.loader.getLayoutAsync.returns(p);
      app.inputMethodManager.loader.getInputMethodAsync.returns(p2);

      manager.start();

      assert.isTrue(
        window.addEventListener.calledWith('hashchange', manager));
      assert.isTrue(
        window.addEventListener.calledWith('visibilitychange', manager));

      assert.isTrue(app.layoutManager.loader.getLayoutAsync.calledWith('foo'));
      p.then(function() {
        assert.isTrue(
          app.inputMethodManager.loader.getInputMethodAsync.calledWith('bar'));
        return p2;
      }, function() {
        assert.isTrue(false, 'Should not reject.');
      }).then(function() {
        assert.isTrue(app.l10nLoader.load.calledOnce);
        assert.isTrue(app.l10nLoader.load.calledOn(app.l10nLoader));
      }, function() {
        assert.isTrue(false, 'Should not reject.');
      }).then(done, done);
    });

    test('hashchange', function(done) {
      window.location.hash = '#foo2';
      var evt = {
        type: 'hashchange'
      };

      var layout = { imEngine: 'bar2' };
      var p = Promise.resolve(layout);
      var p2 = Promise.resolve({});

      app.layoutManager.loader.getLayoutAsync.returns(p);
      app.inputMethodManager.loader.getInputMethodAsync.returns(p2);

      windowStub.dispatchEvent(evt);

      assert.isTrue(app.layoutManager.loader.getLayoutAsync.calledWith('foo2'),
        'Start loading foo2 when hashchanged');
      p.then(function() {
        assert.isTrue(
          app.inputMethodManager.loader.getInputMethodAsync.calledWith('bar2'),
          'Start loading bar2 when hashchanged');
        return p2;
      }).then(function() {
        return;
      }).then(done, done);
    });

    suite('active', function() {
      var p, p2, p3;

      setup(function() {
        document.hidden = false;

        var evt = {
          type: 'visibilitychange'
        };

        windowStub.dispatchEvent(evt);

        assert.isFalse(app.layoutManager.switchCurrentLayout.calledOnce,
          'Not launched yet with visibilitychange only.');

        p = Promise.resolve();
        p2 = Promise.resolve();
        p3 = Promise.resolve();

        app.layoutManager.currentModifiedLayout = {
          imEngine: 'bar'
        };

        app.layoutManager.switchCurrentLayout.returns(p);
        app.inputMethodManager.switchCurrentIMEngine.returns(p2);
        app.layoutRenderingManager.updateLayoutRendering.returns(p3);

        navigator.mozInputMethod.setInputContext(new MockInputContext());
        app.inputContext = navigator.mozInputMethod.inputcontext;

        assert.isFalse(app.layoutManager.loader.getLayoutAsync.calledTwice,
          'Should not try to preload layout again.');
        assert.isFalse(
          app.inputMethodManager.loader.getInputMethodAsync.calledTwice,
          'Should not try to preload IMEngine again.');
        assert.isFalse(app.l10nLoader.load.calledTwice);

        assert.isTrue(app.inputMethodManager.updateInputContextData.calledOnce);

        assert.isTrue(app.layoutManager.switchCurrentLayout.calledWith('foo'));
      });

      test('active', function(done) {
        p.then(function() {
          assert.isTrue(app.upperCaseStateManager.reset.calledOnce);
          assert.isTrue(
            app.inputMethodManager.switchCurrentIMEngine.calledWith('bar'));
          assert.isTrue(app.upperCaseStateManager.reset.calledBefore(
            app.inputMethodManager.switchCurrentIMEngine),
            'Reset the state before engine activates.');

          return p2;
        }).then(function() {
          assert.isTrue(app.candidatePanelManager.hideFullPanel.calledOnce);
          assert.isTrue(app.candidatePanelManager.updateCandidates.calledOnce);
          assert.isTrue(app.targetHandlersManager
            .activeTargetsManager.clearAllTargets.calledOnce);

          assert.isTrue(
            app.layoutRenderingManager.updateLayoutRendering.calledOnce);

          return p3;
        }).then(function() {
          assert.isTrue(app.l10nLoader.load.calledTwice);
          assert.isTrue(
            app.l10nLoader.load.getCall(1).calledOn(app.l10nLoader));
        }).then(done, done);
      });

      test('de-active right away', function(done) {
        document.hidden = true;

        var evt = {
          type: 'visibilitychange'
        };

        windowStub.dispatchEvent(evt);

        assert.isTrue(app.candidatePanelManager.hideFullPanel.calledOnce);
        assert.isTrue(app.candidatePanelManager.updateCandidates.calledOnce);
        assert.isTrue(app.targetHandlersManager
          .activeTargetsManager.clearAllTargets.calledOnce);
        assert.isTrue(
          app.inputMethodManager.switchCurrentIMEngine.calledWith('default'));

        navigator.mozInputMethod.setInputContext();
        app.inputContext = null;

        assert.isFalse(app.candidatePanelManager.hideFullPanel.calledThrice,
          'Should not disable current layout again.');
        assert.isFalse(app.candidatePanelManager.updateCandidates.calledThrice,
          'Should not disable current layout again.');
        assert.isFalse(app.targetHandlersManager
          .activeTargetsManager.clearAllTargets.calledThrice,
          'Should not disable current layout again.');
        assert.isFalse(
          app.inputMethodManager.switchCurrentIMEngine.calledThrice,
          'Should not disable current layout again.');

        p.then(function() {
          assert.isFalse(
            app.inputMethodManager.switchCurrentIMEngine.calledWith('bar'),
            'Loading stops.');

          return p2;
        }).then(function() {
          assert.isFalse(
            app.layoutRenderingManager.updateLayoutRendering.calledOnce,
            'Loading stops.');

          return p3;
        }).then(function() {
          assert.isFalse(app.l10nLoader.load.calledTwice);
        }).then(done, done);
      });
    });
  });
});
