'use strict';

/* global KeyEvent, MockInputMethodManager, FeedbackManager,
          VisualHighlightManager, CandidatePanelManager, LayoutManager,
          DefaultTargetHandler, NullTargetHandler, SpaceKeyTargetHandler,
          CandidateSelectionTargetHandler, CompositeTargetHandler,
          PageSwitchingTargetHandler, CapsLockTargetHandler,
          SwitchKeyboardTargetHandler, ToggleCandidatePanelTargetHandler,
          DismissSuggestionsTargetHandler, BackspaceTargetHandler,
          KeyboardConsole, HandwritingPadsManager,
          HandwritingPadTargetHandler */

require('/js/keyboard/handwriting_pads_manager.js');
require('/js/keyboard/target_handlers.js');
require('/js/keyboard/feedback_manager.js');
require('/js/keyboard/visual_highlight_manager.js');
require('/js/keyboard/candidate_panel_manager.js');
require('/js/keyboard/layout_manager.js');

require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_navigator_input_method.js');
require('/js/keyboard/console.js');

suite('target handlers', function() {
  var app;
  var realMozInputMethod;

  setup(function() {
    realMozInputMethod = navigator.mozInputMethod;
    navigator.mozInputMethod = {
      mgmt: this.sinon.stub(MockInputMethodManager.prototype)
    };

    this.sinon.stub(window, 'setTimeout');
    this.sinon.stub(window, 'clearTimeout');
    this.sinon.stub(window, 'setInterval');
    this.sinon.stub(window, 'clearInterval');

    app = {
      console: this.sinon.stub(KeyboardConsole.prototype),
      feedbackManager: this.sinon.stub(FeedbackManager.prototype),
      visualHighlightManager: this.sinon.stub(VisualHighlightManager.prototype),
      candidatePanelManager: this.sinon.stub(CandidatePanelManager.prototype),
      handwritingPadsManager: this.sinon.stub(HandwritingPadsManager.prototype),
      setLayoutPage: this.sinon.stub(),
      layoutManager: this.sinon.stub(LayoutManager.prototype),
      upperCaseStateManager: {
        isUpperCase: false,
        switchUpperCaseState: this.sinon.stub()
      },
      inputMethodManager: {
        currentIMEngine: {
          click: this.sinon.stub(),
          select: this.sinon.stub(),
          dismissSuggestions: this.sinon.stub(),
          empty: this.sinon.stub()
        }
      },
      targetHandlersManager: {
        activeTargetsManager: {
          clearAllTargets: this.sinon.stub()
        }
      }
    };

    app.layoutManager.currentPage = {
      imEngine: 'not-latin'
    };

  });

  teardown(function() {
    navigator.mozInputMethod = realMozInputMethod;
  });

  suite('DefaultTargetHandler', function() {
    var handler;
    var target;
    setup(function() {
      target = {
        keyCode: 99,
        keyCodeUpper: 999,
        longPressValue: '$$',
        longPressKeyCode: 9999
      };

      handler = new DefaultTargetHandler(target, app);
    });

    suite('activate', function() {
      setup(function() {
        handler.activate();

        assert.isTrue(app.feedbackManager.triggerFeedback.calledWith(target));
        assert.isTrue(app.feedbackManager.triggerFeedback.calledOnce);

        assert.isTrue(app.visualHighlightManager.show.calledWith(target));
        assert.isTrue(app.visualHighlightManager.show.calledOnce);
      });

      test('commit', function() {
        handler.commit();

        assert.isTrue(
          app.inputMethodManager.currentIMEngine.click.calledWith(99));
        assert.isTrue(app.inputMethodManager.currentIMEngine.click.calledOnce);

        assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
        assert.isTrue(app.visualHighlightManager.hide.calledOnce);
      });

      test('move', function() {
        handler.move();
      });

      test('moveOut', function() {
        handler.moveOut();

        assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
        assert.isTrue(app.visualHighlightManager.hide.calledOnce);
      });

      test('cancel', function() {
        handler.cancel();

        assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
        assert.isTrue(app.visualHighlightManager.hide.calledOnce);
      });

      test('doubleTap', function() {
        handler.doubleTap();

        assert.isTrue(
          app.inputMethodManager.currentIMEngine.click.calledWith(99));
        assert.isTrue(app.inputMethodManager.currentIMEngine.click.calledOnce);

        assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
        assert.isTrue(app.visualHighlightManager.hide.calledOnce);
      });

      test('new target activated', function() {
        handler.newTargetActivate();

        assert.isTrue(
          app.inputMethodManager.currentIMEngine.click.calledWith(99));
        assert.isTrue(app.inputMethodManager.currentIMEngine.click.calledOnce);

        assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
        assert.isTrue(app.visualHighlightManager.hide.calledOnce);

        handler.commit();
        // Won't commit again
        assert.isTrue(app.inputMethodManager.currentIMEngine.click.calledOnce);
      });

      suite('longPress', function() {
        setup(function() {
          handler.longPress();

          assert.isTrue(
            app.inputMethodManager.currentIMEngine.click.calledWith(9999));
          assert.isTrue(
            app.inputMethodManager.currentIMEngine.click.calledOnce);

          assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
          assert.isTrue(app.visualHighlightManager.hide.calledOnce);
        });

        test('commit', function() {
          handler.commit();

          assert.isTrue(
            app.inputMethodManager.currentIMEngine.click.calledOnce,
            'Do nothing');
        });

        test('move', function() {
          handler.move();
        });

        test('moveOut', function() {
          handler.moveOut();

          assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
          assert.isTrue(app.visualHighlightManager.hide.calledTwice);
        });

        test('cancel', function() {
          handler.cancel();

          assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
          assert.isTrue(app.visualHighlightManager.hide.calledTwice);
        });

        test('doubleTap', function() {
          handler.doubleTap();

          assert.isTrue(
            app.inputMethodManager.currentIMEngine.click.calledOnce,
            'Do nothing');
        });
      });
    });

    suite('moveIn', function() {
      setup(function() {
        handler.moveIn();

        assert.isTrue(app.visualHighlightManager.show.calledWith(target));
        assert.isTrue(app.visualHighlightManager.show.calledOnce);
      });

      test('commit', function() {
        handler.commit();

        assert.isTrue(
          app.inputMethodManager.currentIMEngine.click.calledWith(99));
        assert.isTrue(app.inputMethodManager.currentIMEngine.click.calledOnce);

        assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
        assert.isTrue(app.visualHighlightManager.hide.calledOnce);
      });

      test('move', function() {
        handler.move();
      });

      test('moveOut', function() {
        handler.moveOut();

        assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
        assert.isTrue(app.visualHighlightManager.hide.calledOnce);
      });

      test('cancel', function() {
        handler.cancel();

        assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
        assert.isTrue(app.visualHighlightManager.hide.calledOnce);
      });

      test('doubleTap', function() {
        handler.doubleTap();

        assert.isTrue(
          app.inputMethodManager.currentIMEngine.click.calledWith(99));
        assert.isTrue(app.inputMethodManager.currentIMEngine.click.calledOnce);

        assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
        assert.isTrue(app.visualHighlightManager.hide.calledOnce);
      });

      suite('longPress', function() {
        setup(function() {
          handler.longPress();

          assert.isTrue(
            app.inputMethodManager.currentIMEngine.click.calledWith(9999));
          assert.isTrue(
            app.inputMethodManager.currentIMEngine.click.calledOnce);

          assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
          assert.isTrue(app.visualHighlightManager.hide.calledOnce);
        });

        test('commit', function() {
          handler.commit();

          assert.isTrue(
            app.inputMethodManager.currentIMEngine.click.calledOnce,
            'Do nothing');
        });

        test('move', function() {
          handler.move();
        });

        test('moveOut', function() {
          handler.moveOut();

          assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
          assert.isTrue(app.visualHighlightManager.hide.calledTwice);
        });

        test('cancel', function() {
          handler.cancel();

          assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
          assert.isTrue(app.visualHighlightManager.hide.calledTwice);
        });

        test('doubleTap', function() {
          handler.doubleTap();

          assert.isTrue(
            app.inputMethodManager.currentIMEngine.click.calledOnce,
            'Do nothing');
        });
      });
    });
  });

  suite('NullTargetHandler', function() {
    var handler;
    var target;
    setup(function() {
      target = {};

      handler = new NullTargetHandler(target, app);
    });

    test('activate', function() {
      handler.activate();
    });

    test('longPress', function() {
      handler.longPress();
    });

    test('moveIn', function() {
      handler.activate();
    });

    test('move', function() {
      handler.move();
    });

    test('moveOut', function() {
      handler.activate();
    });

    test('commit', function() {
      handler.activate();
    });

    test('cancel', function() {
      handler.activate();
    });

    test('doubleTap', function() {
      handler.activate();
    });
  });

  suite('SpaceKeyTargetHandler', function() {
    var handler;
    var target;
    setup(function() {
      target = {};

      handler = new SpaceKeyTargetHandler(target, app);
    });

    test('activate', function() {
      assert.equal(handler.activate, DefaultTargetHandler.prototype.activate,
        'function not overwritten');
    });

    test('longPress', function() {
      handler.longPress();

      assert.isTrue(app.targetHandlersManager
        .activeTargetsManager.clearAllTargets.calledOnce);

      assert.isTrue(navigator.mozInputMethod.mgmt.hide.calledOnce);

      assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
      assert.isTrue(app.visualHighlightManager.hide.calledOnce);
    });

    test('moveIn', function() {
      assert.equal(handler.moveIn, DefaultTargetHandler.prototype.moveIn,
        'function not overwritten');
    });

    test('move', function() {
      handler.move();
    });

    test('moveOut', function() {
      assert.equal(handler.moveOut, DefaultTargetHandler.prototype.moveOut,
        'function not overwritten');
    });

    test('commit', function() {
      assert.equal(handler.commit, DefaultTargetHandler.prototype.commit,
        'function not overwritten');
    });

    test('cancel', function() {
      assert.equal(handler.cancel, DefaultTargetHandler.prototype.cancel,
        'function not overwritten');
    });

    test('doubleTap', function() {
      assert.equal(handler.doubleTap, DefaultTargetHandler.prototype.doubleTap,
        'function not overwritten');
    });
  });

  suite('CandidateSelectionTargetHandler', function() {
    var handler;
    var target;
    setup(function() {
      target = {
        data: 'data',
        text: 'text'
      };

      handler = new CandidateSelectionTargetHandler(target, app);
    });

    test('activate', function() {
      assert.equal(handler.activate, DefaultTargetHandler.prototype.activate,
        'function not overwritten');
    });

    test('longPress', function() {
      assert.equal(handler.longPress, DefaultTargetHandler.prototype.longPress,
        'function not overwritten');
    });

    test('moveIn', function() {
      assert.equal(handler.moveIn, DefaultTargetHandler.prototype.moveIn,
        'function not overwritten');
    });

    test('move', function() {
      handler.move();
    });

    test('moveOut', function() {
      assert.equal(handler.moveOut, DefaultTargetHandler.prototype.moveOut,
        'function not overwritten');
    });

    test('commit', function() {
      handler.commit();

      assert.isTrue(app.candidatePanelManager.hideFullPanel.calledOnce);

      assert.isTrue(app.inputMethodManager.currentIMEngine.
        select.calledWith('text', 'data'));
      assert.isTrue(app.inputMethodManager.currentIMEngine.
        select.calledOnce);

      assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
      assert.isTrue(app.visualHighlightManager.hide.calledOnce);
    });

    test('cancel', function() {
      assert.equal(handler.cancel, DefaultTargetHandler.prototype.cancel,
        'function not overwritten');
    });

    test('doubleTap', function() {
      assert.equal(handler.doubleTap, DefaultTargetHandler.prototype.doubleTap,
        'function not overwritten');
    });
  });

  suite('BackspaceTargetHandler', function() {
    var handler;
    var target;
    setup(function() {
      target = {
      };

      handler = new BackspaceTargetHandler(target, app);
    });

    test('longPress', function() {
      assert.equal(handler.longPress, DefaultTargetHandler.prototype.longPress,
        'function not overwritten');
    });

    suite('activate', function() {
      setup(function() {
        handler.activate();

        assert.isTrue(app.feedbackManager.triggerFeedback.calledWith(target));
        assert.isTrue(app.feedbackManager.triggerFeedback.calledOnce);

        assert.isTrue(app.visualHighlightManager.show.calledWith(target));
        assert.isTrue(app.visualHighlightManager.show.calledOnce);

        assert.isTrue(window.setTimeout.calledOnce);
        assert.equal(
          window.setTimeout.getCall(0).args[1], handler.REPEAT_TIMEOUT);
      });

      test('commit', function() {
        handler.commit();

        assert.isTrue(
          app.inputMethodManager.currentIMEngine.click
          .calledWith(KeyEvent.DOM_VK_BACK_SPACE, null, false));
        assert.isTrue(app.inputMethodManager.currentIMEngine.click.calledOnce);

        assert.isTrue(window.clearTimeout.calledOnce);
        assert.isTrue(window.clearInterval.calledOnce);

        assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
        assert.isTrue(app.visualHighlightManager.hide.calledOnce);
      });

      test('move', function() {
        handler.move();
      });

      test('moveOut', function() {
        handler.moveOut();

        assert.isTrue(window.clearTimeout.calledOnce);
        assert.isTrue(window.clearInterval.calledOnce);

        assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
        assert.isTrue(app.visualHighlightManager.hide.calledOnce);
      });

      test('cancel', function() {
        handler.cancel();

        assert.isTrue(window.clearTimeout.calledOnce);
        assert.isTrue(window.clearInterval.calledOnce);

        assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
        assert.isTrue(app.visualHighlightManager.hide.calledOnce);
      });

      test('doubleTap', function() {
        handler.doubleTap();

        assert.isTrue(
          app.inputMethodManager.currentIMEngine.click
          .calledWith(KeyEvent.DOM_VK_BACK_SPACE, null, false));
        assert.isTrue(app.inputMethodManager.currentIMEngine.click.calledOnce);

        assert.isTrue(window.clearTimeout.calledOnce);
        assert.isTrue(window.clearInterval.calledOnce);

        assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
        assert.isTrue(app.visualHighlightManager.hide.calledOnce);
      });

      suite('after REPEAT_TIMEOUT', function() {
        setup(function() {
          window.setTimeout.getCall(0).args[0].call(window);

          assert.isTrue(
            app.inputMethodManager.currentIMEngine.click
            .calledWith(KeyEvent.DOM_VK_BACK_SPACE, null, true));
          assert.isTrue(app.inputMethodManager.currentIMEngine.click
            .calledOnce);

          assert.isTrue(window.setInterval.calledOnce);
          assert.equal(
            window.setInterval.getCall(0).args[1], handler.REPEAT_RATE);
        });

        test('commit', function() {
          handler.commit();

          assert.isTrue(
            app.inputMethodManager.currentIMEngine.click.getCall(1)
            .calledWith(KeyEvent.DOM_VK_BACK_SPACE, null, false));
          assert.isTrue(
            app.inputMethodManager.currentIMEngine.click.calledTwice);

          assert.isTrue(window.clearTimeout.calledOnce);
          assert.isTrue(window.clearInterval.calledOnce);

          assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
          assert.isTrue(app.visualHighlightManager.hide.calledOnce);
        });

        test('move', function() {
          handler.move();
        });

        test('moveOut', function() {
          handler.moveOut();

          assert.isTrue(window.clearTimeout.calledOnce);
          assert.isTrue(window.clearInterval.calledOnce);

          assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
          assert.isTrue(app.visualHighlightManager.hide.calledOnce);
        });

        test('cancel', function() {
          handler.cancel();

          assert.isTrue(window.clearTimeout.calledOnce);
          assert.isTrue(window.clearInterval.calledOnce);

          assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
          assert.isTrue(app.visualHighlightManager.hide.calledOnce);
        });

        test('doubleTap', function() {
          handler.doubleTap();

          assert.isTrue(
            app.inputMethodManager.currentIMEngine.click.getCall(1)
            .calledWith(KeyEvent.DOM_VK_BACK_SPACE, null, false));
          assert.isTrue(
            app.inputMethodManager.currentIMEngine.click.calledTwice);

          assert.isTrue(window.clearTimeout.calledOnce);
          assert.isTrue(window.clearInterval.calledOnce);

          assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
          assert.isTrue(app.visualHighlightManager.hide.calledOnce);
        });

        suite('after REPEAT_RATE', function() {
          setup(function() {
            window.setInterval.getCall(0).args[0].call(window);

            assert.isTrue(
              app.inputMethodManager.currentIMEngine.click.getCall(1)
              .calledWith(KeyEvent.DOM_VK_BACK_SPACE, null, true));
            assert.isTrue(app.inputMethodManager.currentIMEngine.click
              .calledTwice);

            assert.isTrue(window.setInterval.calledOnce);
            assert.equal(
              window.setInterval.getCall(0).args[1], handler.REPEAT_RATE);
          });

          test('commit', function() {
            handler.commit();

            assert.isTrue(
              app.inputMethodManager.currentIMEngine.click.getCall(2)
              .calledWith(KeyEvent.DOM_VK_BACK_SPACE, null, false));
            assert.isTrue(
              app.inputMethodManager.currentIMEngine.click.calledThrice);

            assert.isTrue(window.clearTimeout.calledOnce);
            assert.isTrue(window.clearInterval.calledOnce);

            assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
            assert.isTrue(app.visualHighlightManager.hide.calledOnce);
          });

          test('move', function() {
            handler.move();
          });

          test('moveOut', function() {
            handler.moveOut();

            assert.isTrue(window.clearTimeout.calledOnce);
            assert.isTrue(window.clearInterval.calledOnce);

            assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
            assert.isTrue(app.visualHighlightManager.hide.calledOnce);
          });

          test('cancel', function() {
            handler.cancel();

            assert.isTrue(window.clearTimeout.calledOnce);
            assert.isTrue(window.clearInterval.calledOnce);

            assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
            assert.isTrue(app.visualHighlightManager.hide.calledOnce);
          });

          test('doubleTap', function() {
            handler.doubleTap();

            assert.isTrue(
              app.inputMethodManager.currentIMEngine.click.getCall(2)
              .calledWith(KeyEvent.DOM_VK_BACK_SPACE, null, false));
            assert.isTrue(
              app.inputMethodManager.currentIMEngine.click.calledThrice);

            assert.isTrue(window.clearTimeout.calledOnce);
            assert.isTrue(window.clearInterval.calledOnce);

            assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
            assert.isTrue(app.visualHighlightManager.hide.calledOnce);
          });
        });
      });
    });

    suite('moveIn', function() {
      setup(function() {
        handler.moveIn();

        assert.isFalse(app.feedbackManager.triggerFeedback.calledOnce);
        assert.isFalse(app.visualHighlightManager.show.calledOnce);
        assert.isFalse(window.setTimeout.calledOnce);
        assert.isFalse(window.setInterval.calledOnce);
      });

      teardown(function() {
        assert.isFalse(app.inputMethodManager.currentIMEngine.click.calledOnce,
          'Should not be called whatsoever.');
      });

      test('commit', function() {
        handler.commit();
      });

      test('move', function() {
        handler.move();
      });

      test('moveOut', function() {
        handler.moveOut();
      });

      test('cancel', function() {
        handler.cancel();
      });

      test('doubleTap', function() {
        handler.doubleTap();
      });
    });
  });

  suite('CompositeTargetHandler', function() {
    var handler;
    var target;
    setup(function() {
      target = {
        compositeKey: 'lol'
      };

      handler = new CompositeTargetHandler(target, app);
    });

    test('activate', function() {
      assert.equal(handler.activate, DefaultTargetHandler.prototype.activate,
        'function not overwritten');
    });

    test('longPress', function() {
      assert.equal(handler.longPress, DefaultTargetHandler.prototype.longPress,
        'function not overwritten');
    });

    test('moveIn', function() {
      assert.equal(handler.moveIn, DefaultTargetHandler.prototype.moveIn,
        'function not overwritten');
    });

    test('move', function() {
      assert.equal(handler.move, DefaultTargetHandler.prototype.move,
        'function not overwritten');
    });

    test('moveOut', function() {
      assert.equal(handler.moveOut, DefaultTargetHandler.prototype.moveOut,
        'function not overwritten');
    });

    test('commit', function(done) {
      var p = handler.commit();

      assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
      assert.isTrue(app.visualHighlightManager.hide.calledOnce);

      p.then(function() {
        for (var i = 0; i < 'lol'.length; i++) {
          assert.isTrue(app.inputMethodManager.currentIMEngine.click
            .getCall(i).calledWith('lol'.charCodeAt(i)));
        }
      }).then(done, done);
    });

    test('commit (with engine.handleKey)', function() {
      app.inputMethodManager.currentIMEngine.handleKey = this.sinon.stub();
      handler.commit();

      assert.isTrue(app.inputMethodManager.currentIMEngine.handleKey
        .calledWith({ key: 'lol', printable: true }));

      assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
      assert.isTrue(app.visualHighlightManager.hide.calledOnce);
    });

    test('cancel', function() {
      assert.equal(handler.cancel, DefaultTargetHandler.prototype.cancel,
        'function not overwritten');
    });

    test('doubleTap', function() {
      assert.equal(handler.doubleTap, DefaultTargetHandler.prototype.doubleTap,
        'function not overwritten');
    });
  });

  suite('CapsLockTargetHandler', function() {
    var handler;
    var target;
    setup(function() {
      target = {};
      handler = new CapsLockTargetHandler(target, app);
    });

    test('activate', function() {
      handler.activate();

      assert.isTrue(app.upperCaseStateManager.switchUpperCaseState
                    .calledWith({
        isUpperCaseLocked: true
      }));

      assert.isTrue(app.feedbackManager.triggerFeedback.calledWith(target));
      assert.isTrue(app.feedbackManager.triggerFeedback.calledOnce);

      assert.isTrue(app.visualHighlightManager.show.calledWith(target));
      assert.isTrue(app.visualHighlightManager.show.calledOnce);
    });

    test('longPress', function() {
      assert.equal(handler.longPress, DefaultTargetHandler.prototype.longPress,
        'function not overwritten');
    });

    test('moveIn', function() {
      assert.equal(handler.moveIn, DefaultTargetHandler.prototype.moveIn,
        'function not overwritten');
    });

    test('move', function() {
      assert.equal(handler.move, DefaultTargetHandler.prototype.move,
        'function not overwritten');
    });

    test('moveOut', function() {
      assert.equal(handler.moveOut, DefaultTargetHandler.prototype.moveOut,
        'function not overwritten');
    });

    test('commit', function() {
      handler.commit();

      assert.isTrue(app.upperCaseStateManager.switchUpperCaseState.calledWith({
        isUpperCase: true,
        isUpperCaseLocked: false
      }));

      assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
      assert.isTrue(app.visualHighlightManager.hide.calledOnce);
    });

    test('combo key - activate and then with new arget activated', function() {
      handler.newTargetActivate();
      handler.commit();

      assert.isTrue(app.upperCaseStateManager.switchUpperCaseState
                    .calledWith({
        isUpperCase: false,
        isUpperCaseLocked: false
      }));

      assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
      assert.isTrue(app.visualHighlightManager.hide.calledOnce);
    });

    test('cancel', function() {
      assert.equal(handler.cancel, DefaultTargetHandler.prototype.cancel,
        'function not overwritten');
    });

    test('doubleTap', function() {
      handler.doubleTap();

      assert.isTrue(app.upperCaseStateManager.switchUpperCaseState.calledWith({
        isUpperCaseLocked: true
      }));

      assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
      assert.isTrue(app.visualHighlightManager.hide.calledOnce);
    });
  });

  suite('PageSwitchingTargetHandler', function() {
    var handler;
    var target;
    setup(function() {
      target = {
        keyCode: KeyEvent.DOM_VK_ALT,
        targetPage: 99
      };

      handler = new PageSwitchingTargetHandler(target, app);
    });

    test('activate', function() {
      assert.equal(handler.activate, DefaultTargetHandler.prototype.activate,
        'function not overwritten');
    });

    test('longPress', function() {
      assert.equal(handler.longPress, DefaultTargetHandler.prototype.longPress,
        'function not overwritten');
    });

    test('moveIn', function() {
      assert.equal(handler.moveIn, DefaultTargetHandler.prototype.moveIn,
        'function not overwritten');
    });

    test('move', function() {
      assert.equal(handler.move, DefaultTargetHandler.prototype.move,
        'function not overwritten');
    });

    test('moveOut', function() {
      assert.equal(handler.moveOut, DefaultTargetHandler.prototype.moveOut,
        'function not overwritten');
    });

    test('cancel', function() {
      assert.equal(handler.cancel, DefaultTargetHandler.prototype.cancel,
        'function not overwritten');
    });

    test('doubleTap', function() {
      assert.equal(handler.doubleTap, DefaultTargetHandler.prototype.doubleTap,
        'function not overwritten');
    });

    test('commit', function() {
      handler.commit();

      assert.isTrue(app.setLayoutPage.calledWith(99));
      assert.isTrue(app.setLayoutPage.calledOnce);

      assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
      assert.isTrue(app.visualHighlightManager.hide.calledOnce);

      assert.isTrue(app.inputMethodManager.currentIMEngine.empty.calledOnce);
    });
  });

  suite('SwitchKeyboardTargetHandler', function() {
    var handler;
    var target;
    setup(function() {
      target = {};

      handler = new SwitchKeyboardTargetHandler(target, app);
    });

    test('activate', function() {
      assert.equal(handler.activate, DefaultTargetHandler.prototype.activate,
        'function not overwritten');
    });

    test('longPress', function() {
      handler.longPress();

      assert.isTrue(app.targetHandlersManager
        .activeTargetsManager.clearAllTargets.calledOnce);

      assert.isTrue(navigator.mozInputMethod.mgmt.showAll.calledOnce);

      assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
      assert.isTrue(app.visualHighlightManager.hide.calledOnce);
    });

    test('moveIn', function() {
      assert.equal(handler.moveIn, DefaultTargetHandler.prototype.moveIn,
        'function not overwritten');
    });

    test('move', function() {
      assert.equal(handler.move, DefaultTargetHandler.prototype.move,
        'function not overwritten');
    });

    test('moveOut', function() {
      assert.equal(handler.moveOut, DefaultTargetHandler.prototype.moveOut,
        'function not overwritten');
    });

    test('commit', function() {
      handler.commit();

      assert.isTrue(app.targetHandlersManager
        .activeTargetsManager.clearAllTargets.calledOnce);

      assert.isTrue(navigator.mozInputMethod.mgmt.next.calledOnce);

      assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
      assert.isTrue(app.visualHighlightManager.hide.calledOnce);
    });

    test('cancel', function() {
      assert.equal(handler.cancel, DefaultTargetHandler.prototype.cancel,
        'function not overwritten');
    });

    test('doubleTap', function() {
      assert.equal(handler.doubleTap, DefaultTargetHandler.prototype.doubleTap,
        'function not overwritten');
    });
  });

  suite('ToggleCandidatePanelTargetHandler', function() {
    var handler;
    var target;
    setup(function() {
      target = {};

      handler = new ToggleCandidatePanelTargetHandler(target, app);
    });

    test('activate', function() {
      assert.equal(handler.activate, DefaultTargetHandler.prototype.activate,
        'function not overwritten');
    });

    test('longPress', function() {
      assert.equal(handler.longPress, DefaultTargetHandler.prototype.longPress,
        'function not overwritten');
    });

    test('moveIn', function() {
      assert.equal(handler.moveIn, DefaultTargetHandler.prototype.moveIn,
        'function not overwritten');
    });

    test('move', function() {
      assert.equal(handler.move, DefaultTargetHandler.prototype.move,
        'function not overwritten');
    });

    test('moveOut', function() {
      assert.equal(handler.moveOut, DefaultTargetHandler.prototype.moveOut,
        'function not overwritten');
    });

    test('commit', function() {
      handler.commit();

      assert.isTrue(app.candidatePanelManager.toggleFullPanel.calledOnce);

      assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
      assert.isTrue(app.visualHighlightManager.hide.calledOnce);
    });

    test('cancel', function() {
      assert.equal(handler.cancel, DefaultTargetHandler.prototype.cancel,
        'function not overwritten');
    });

    test('doubleTap', function() {
      assert.equal(handler.doubleTap, DefaultTargetHandler.prototype.doubleTap,
        'function not overwritten');
    });
  });

  suite('DismissSuggestionsTargetHandler', function() {
    var handler;
    var target;
    setup(function() {
      target = {};

      handler = new DismissSuggestionsTargetHandler(target, app);
    });

    test('activate', function() {
      assert.equal(handler.activate, DefaultTargetHandler.prototype.activate,
        'function not overwritten');
    });

    test('longPress', function() {
      assert.equal(handler.longPress, DefaultTargetHandler.prototype.longPress,
        'function not overwritten');
    });

    test('moveIn', function() {
      assert.equal(handler.moveIn, DefaultTargetHandler.prototype.moveIn,
        'function not overwritten');
    });

    test('move', function() {
      assert.equal(handler.move, DefaultTargetHandler.prototype.move,
        'function not overwritten');
    });

    test('moveOut', function() {
      assert.equal(handler.moveOut, DefaultTargetHandler.prototype.moveOut,
        'function not overwritten');
    });

    test('commit', function() {
      handler.commit();

      assert.isTrue(
        app.inputMethodManager.currentIMEngine.dismissSuggestions.calledOnce);

      assert.isTrue(app.visualHighlightManager.hide.calledWith(target));
      assert.isTrue(app.visualHighlightManager.hide.calledOnce);
    });

    test('cancel', function() {
      assert.equal(handler.cancel, DefaultTargetHandler.prototype.cancel,
        'function not overwritten');
    });

    test('doubleTap', function() {
      assert.equal(handler.doubleTap, DefaultTargetHandler.prototype.doubleTap,
        'function not overwritten');
    });
  });

  suite('HandwritingPadTargetHandler', function() {
    var handler;
    var target;
    var press;
    setup(function() {
      target = {isHandwritingPad: true};
      press = {
        target: target
      };

      handler = new HandwritingPadTargetHandler(target, app);
    });

    test('activate', function() {
      handler.activate(press);
      assert.isTrue(
        app.handwritingPadsManager.handlePressStart.calledWith(press));
      assert.isTrue(app.handwritingPadsManager.handlePressStart.calledOnce);
    });

    test('longPress', function() {
      assert.equal(handler.longPress, DefaultTargetHandler.prototype.longPress,
        'function not overwritten');
    });

    test('move', function() {
      handler.move(press);
      assert.isTrue(
        app.handwritingPadsManager.handlePressMove.calledWith(press));
      assert.isTrue(app.handwritingPadsManager.handlePressMove.calledOnce);
    });

    test('moveIn', function() {
      handler.moveIn(press);
      assert.isTrue(
        app.handwritingPadsManager.handlePressStart.calledWith(press));
      assert.isTrue(app.handwritingPadsManager.handlePressStart.calledOnce);
    });

    test('moveOut', function() {
      handler.moveOut();
    });

    test('commit', function() {
      handler.commit();

      assert.isTrue(app.handwritingPadsManager.handlePressEnd.calledOnce);
    });

    test('cancel', function() {
      assert.equal(handler.cancel, DefaultTargetHandler.prototype.cancel,
        'function not overwritten');
    });

    test('doubleTap', function() {
      assert.equal(handler.doubleTap, DefaultTargetHandler.prototype.doubleTap,
        'function not overwritten');
    });
  });
});
