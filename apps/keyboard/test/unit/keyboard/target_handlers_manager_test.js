'use strict';

/* global TargetHandlersManager, ActiveTargetsManager,
          DefaultTargetHandler, KeyEvent, LayoutManager */

require('/js/keyboard/active_targets_manager.js');
require('/js/keyboard/target_handlers.js');
require('/js/keyboard/layout_manager.js');

require('/js/keyboard/target_handlers_manager.js');

suite('TargetHandlersManager', function() {
  var manager;
  var app;
  var handlerStub;
  var activeTargetsManagerStub;

  setup(function() {
    activeTargetsManagerStub = this.sinon.stub(ActiveTargetsManager.prototype);
    this.sinon.stub(window, 'ActiveTargetsManager')
      .returns(activeTargetsManagerStub);

    handlerStub = this.sinon.stub(DefaultTargetHandler.prototype);
    this.sinon.stub(window, 'DefaultTargetHandler')
      .returns(handlerStub);
    this.sinon.stub(window, 'NullTargetHandler')
      .returns(handlerStub);
    this.sinon.stub(window, 'SpaceKeyTargetHandler')
      .returns(handlerStub);
    this.sinon.stub(window, 'CandidateSelectionTargetHandler')
      .returns(handlerStub);
    this.sinon.stub(window, 'BackspaceTargetHandler')
      .returns(handlerStub);
    this.sinon.stub(window, 'CompositeTargetHandler')
      .returns(handlerStub);
    this.sinon.stub(window, 'PageSwitchingTargetHandler')
      .returns(handlerStub);
    this.sinon.stub(window, 'CapsLockTargetHandler')
      .returns(handlerStub);
    this.sinon.stub(window, 'SwitchKeyboardTargetHandler')
      .returns(handlerStub);
    this.sinon.stub(window, 'ToggleCandidatePanelTargetHandler')
      .returns(handlerStub);
    this.sinon.stub(window, 'DismissSuggestionsTargetHandler')
      .returns(handlerStub);

    app = {
      layoutManager: this.sinon.stub(LayoutManager.prototype)
    };
    manager = new TargetHandlersManager(app);
    manager.start();

    assert.isTrue(window.ActiveTargetsManager.calledWith(app));
    assert.isTrue(activeTargetsManagerStub.start.calledOnce);
  });

  suite('activate', function() {
    var target;
    setup(function() {
      target = {
        classList: {
          contains: this.sinon.stub()
        },
        dataset: {
          keycode: '99'
        }
      };
      target.classList.contains.returns(false);

      activeTargetsManagerStub.ontargetactivated(target);

      assert.isTrue(window.DefaultTargetHandler.calledWith(target, app));
      assert.isTrue(window.DefaultTargetHandler.calledOnce);

      assert.isTrue(handlerStub.activate.calledOnce);
    });

    teardown(function() {
      assert.isTrue(window.DefaultTargetHandler.calledOnce,
        'Same handler was used for every following action.');
    });

    test('commit', function() {
      activeTargetsManagerStub.ontargetcommitted(target);

      assert.isTrue(handlerStub.commit.calledOnce);
    });

    test('moveOut', function() {
      activeTargetsManagerStub.ontargetmovedout(target);

      assert.isTrue(handlerStub.moveOut.calledOnce);
    });

    test('cancel', function() {
      activeTargetsManagerStub.ontargetcancelled(target);

      assert.isTrue(handlerStub.cancel.calledOnce);
    });

    test('doubleTap', function() {
      activeTargetsManagerStub.ontargetdoubletapped(target);

      assert.isTrue(handlerStub.doubleTap.calledOnce);
    });

    suite('longPress', function() {
      setup(function() {
        activeTargetsManagerStub.ontargetlongpressed(target);

        assert.isTrue(handlerStub.longPress.calledOnce);
      });

      test('commit', function() {
        activeTargetsManagerStub.ontargetcommitted(target);

        assert.isTrue(handlerStub.commit.calledOnce);
      });

      test('moveOut', function() {
        activeTargetsManagerStub.ontargetmovedout(target);

        assert.isTrue(handlerStub.moveOut.calledOnce);
      });

      test('cancel', function() {
        activeTargetsManagerStub.ontargetcancelled(target);

        assert.isTrue(handlerStub.cancel.calledOnce);
      });

      test('doubleTap', function() {
        activeTargetsManagerStub.ontargetdoubletapped(target);

        assert.isTrue(handlerStub.doubleTap.calledOnce);
      });
    });
  });

  suite('moveIn', function() {
    var target;
    setup(function() {
      target = {
        classList: {
          contains: this.sinon.stub()
        },
        dataset: {
          keycode: '99'
        }
      };
      target.classList.contains.returns(false);

      activeTargetsManagerStub.ontargetmovedin(target);

      assert.isTrue(window.DefaultTargetHandler.calledWith(target, app));
      assert.isTrue(window.DefaultTargetHandler.calledOnce);

      assert.isTrue(handlerStub.moveIn.calledOnce);
    });

    teardown(function() {
      assert.isTrue(window.DefaultTargetHandler.calledOnce,
        'Same handler was used for every following action.');
    });

    test('commit', function() {
      activeTargetsManagerStub.ontargetcommitted(target);

      assert.isTrue(handlerStub.commit.calledOnce);
    });

    test('moveOut', function() {
      activeTargetsManagerStub.ontargetmovedout(target);

      assert.isTrue(handlerStub.moveOut.calledOnce);
    });

    test('cancel', function() {
      activeTargetsManagerStub.ontargetcancelled(target);

      assert.isTrue(handlerStub.cancel.calledOnce);
    });

    test('doubleTap', function() {
      activeTargetsManagerStub.ontargetdoubletapped(target);

      assert.isTrue(handlerStub.doubleTap.calledOnce);
    });

    suite('longPress', function() {
      setup(function() {
        activeTargetsManagerStub.ontargetlongpressed(target);

        assert.isTrue(handlerStub.longPress.calledOnce);
      });

      test('commit', function() {
        activeTargetsManagerStub.ontargetcommitted(target);

        assert.isTrue(handlerStub.commit.calledOnce);
      });

      test('moveOut', function() {
        activeTargetsManagerStub.ontargetmovedout(target);

        assert.isTrue(handlerStub.moveOut.calledOnce);
      });

      test('cancel', function() {
        activeTargetsManagerStub.ontargetcancelled(target);

        assert.isTrue(handlerStub.cancel.calledOnce);
      });

      test('doubleTap', function() {
        activeTargetsManagerStub.ontargetdoubletapped(target);

        assert.isTrue(handlerStub.doubleTap.calledOnce);
      });
    });
  });

  suite('activate different targets', function() {
    test('DismissSuggestionsTargetHandler', function() {
      var target = {
        classList: {
          contains: this.sinon.stub()
        },
        dataset: {
        }
      };
      target.classList.contains.returns(true);

      activeTargetsManagerStub.ontargetactivated(target);

      assert.isTrue(
        target.classList.contains.calledWith('dismiss-suggestions-button'));
      assert.isTrue(
        window.DismissSuggestionsTargetHandler.calledWith(target, app));

      assert.isTrue(handlerStub.activate.calledOnce);
    });

    test('CandidateSelectionTargetHandler', function() {
      var target = {
        classList: {
          contains: this.sinon.stub()
        },
        dataset: {
          selection: 'foo'
        }
      };
      target.classList.contains.returns(false);

      activeTargetsManagerStub.ontargetactivated(target);

      assert.isTrue(
        window.CandidateSelectionTargetHandler.calledWith(target, app));

      assert.isTrue(handlerStub.activate.calledOnce);
    });

    test('CompositeTargetHandler', function() {
      var target = {
        classList: {
          contains: this.sinon.stub()
        },
        dataset: {
          compositeKey: 'lol'
        }
      };
      target.classList.contains.returns(false);

      activeTargetsManagerStub.ontargetactivated(target);

      assert.isTrue(
        window.CompositeTargetHandler.calledWith(target, app));

      assert.isTrue(handlerStub.activate.calledOnce);
    });

    test('BackspaceTargetHandler', function() {
      var target = {
        classList: {
          contains: this.sinon.stub()
        },
        dataset: {
          keycode: KeyEvent.DOM_VK_BACK_SPACE
        }
      };
      target.classList.contains.returns(false);

      activeTargetsManagerStub.ontargetactivated(target);

      assert.isTrue(
        window.BackspaceTargetHandler.calledWith(target, app));

      assert.isTrue(handlerStub.activate.calledOnce);
    });


    test('SpaceKeyTargetHandler', function() {
      var target = {
        classList: {
          contains: this.sinon.stub()
        },
        dataset: {
          keycode: KeyEvent.DOM_VK_SPACE
        }
      };
      target.classList.contains.returns(false);

      activeTargetsManagerStub.ontargetactivated(target);

      assert.isTrue(
        window.SpaceKeyTargetHandler.calledWith(target, app));

      assert.isTrue(handlerStub.activate.calledOnce);
    });

    suite('PageSwitchingTargetHandler', function() {
      test('KEYCODE_BASIC_LAYOUT', function() {
        var target = {
          classList: {
            contains: this.sinon.stub()
          },
          dataset: {
            keycode: app.layoutManager.KEYCODE_BASIC_LAYOUT
          }
        };
        target.classList.contains.returns(false);

        activeTargetsManagerStub.ontargetactivated(target);

        assert.isTrue(
          window.PageSwitchingTargetHandler.calledWith(target, app));

        assert.isTrue(handlerStub.activate.calledOnce);
      });

      test('KEYCODE_ALTERNATE_LAYOUT', function() {
        var target = {
          classList: {
            contains: this.sinon.stub()
          },
          dataset: {
            keycode: app.layoutManager.KEYCODE_ALTERNATE_LAYOUT
          }
        };
        target.classList.contains.returns(false);

        activeTargetsManagerStub.ontargetactivated(target);

        assert.isTrue(
          window.PageSwitchingTargetHandler.calledWith(target, app));

        assert.isTrue(handlerStub.activate.calledOnce);
      });

      test('KeyEvent.DOM_VK_ALT', function() {
        var target = {
          classList: {
            contains: this.sinon.stub()
          },
          dataset: {
            keycode: KeyEvent.DOM_VK_ALT
          }
        };
        target.classList.contains.returns(false);

        activeTargetsManagerStub.ontargetactivated(target);

        assert.isTrue(
          window.PageSwitchingTargetHandler.calledWith(target, app));

        assert.isTrue(handlerStub.activate.calledOnce);
      });
    });

    test('SwitchKeyboardTargetHandler', function() {
      var target = {
        classList: {
          contains: this.sinon.stub()
        },
        dataset: {
          keycode: app.layoutManager.KEYCODE_SWITCH_KEYBOARD
        }
      };
      target.classList.contains.returns(false);

      activeTargetsManagerStub.ontargetactivated(target);

      assert.isTrue(
        window.SwitchKeyboardTargetHandler.calledWith(target, app));

      assert.isTrue(handlerStub.activate.calledOnce);
    });

    test('CapsLockTargetHandler', function() {
      var target = {
        classList: {
          contains: this.sinon.stub()
        },
        dataset: {
          keycode: KeyEvent.DOM_VK_CAPS_LOCK
        }
      };
      target.classList.contains.returns(false);

      activeTargetsManagerStub.ontargetactivated(target);

      assert.isTrue(
        window.CapsLockTargetHandler.calledWith(target, app));

      assert.isTrue(handlerStub.activate.calledOnce);
    });

    suite('DefaultTargetHandler', function() {
      test('-99', function() {
        var target = {
          classList: {
            contains: this.sinon.stub()
          },
          dataset: {
            keycode: '-99'
          }
        };
        target.classList.contains.returns(false);

        activeTargetsManagerStub.ontargetactivated(target);

        assert.isTrue(
          window.DefaultTargetHandler.calledWith(target, app));

        assert.isTrue(handlerStub.activate.calledOnce);
      });

      test('99', function() {
        var target = {
          classList: {
            contains: this.sinon.stub()
          },
          dataset: {
            keycode: '99'
          }
        };
        target.classList.contains.returns(false);

        activeTargetsManagerStub.ontargetactivated(target);

        assert.isTrue(
          window.DefaultTargetHandler.calledWith(target, app));

        assert.isTrue(handlerStub.activate.calledOnce);
      });
    });

    test('NullTargetHandler', function() {
      var target = {
        classList: {
          contains: this.sinon.stub()
        },
        dataset: {
        }
      };
      target.classList.contains.returns(false);

      activeTargetsManagerStub.ontargetactivated(target);

      assert.isTrue(
        window.NullTargetHandler.calledWith(target, app));

      assert.isTrue(handlerStub.activate.calledOnce);
    });
  });
});
