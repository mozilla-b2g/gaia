'use strict';

/* global ActiveTargetsManager, AlternativesCharMenuManager, UserPressManager,
          KeyboardConsole */

require('/js/keyboard/active_targets_manager.js');
require('/js/keyboard/alternatives_char_menu_manager.js');
require('/js/keyboard/handwriting_pads_manager.js');
require('/js/keyboard/user_press_manager.js');
require('/js/keyboard/console.js');

suite('ActiveTargetsManager', function() {
  var app;
  var manager;
  var userPressManagerStub;
  var alternativesCharMenuManagerStub;

  setup(function() {
    // Stub the depending constructors and have them returns a stub instance.
    alternativesCharMenuManagerStub =
      this.sinon.stub(AlternativesCharMenuManager.prototype);
    this.sinon.stub(window, 'AlternativesCharMenuManager')
      .returns(alternativesCharMenuManagerStub);
    userPressManagerStub = this.sinon.stub(UserPressManager.prototype);
    this.sinon.stub(window, 'UserPressManager').returns(userPressManagerStub);

    this.sinon.stub(window, 'setTimeout', function () {
      return 1;
    });
    this.sinon.stub(window, 'clearTimeout');

    app = {
      console: this.sinon.stub(KeyboardConsole.prototype)
    };

    manager = new ActiveTargetsManager(app);
    manager.ontargetactivated = this.sinon.stub();
    manager.ontargetlongpressed = this.sinon.stub();
    manager.ontargetmoved = this.sinon.stub();
    manager.ontargetmovedout = this.sinon.stub();
    manager.ontargetmovedin = this.sinon.stub();
    manager.ontargetcommitted = this.sinon.stub();
    manager.ontargetcancelled = this.sinon.stub();
    manager.ontargetdoubletapped = this.sinon.stub();
    manager.onnewtargetwillactivate = this.sinon.stub();
    manager.start();

    assert.isTrue(window.UserPressManager.calledWithNew());
    assert.isTrue(window.UserPressManager.calledWith(app));
    assert.isTrue(userPressManagerStub.start.calledOnce);

    assert.isTrue(window.AlternativesCharMenuManager.calledWithNew());
    assert.isTrue(window.AlternativesCharMenuManager.calledWith(app));
    assert.isTrue(alternativesCharMenuManagerStub.start.calledOnce);
  });

  test('stop', function() {
    manager.stop();

    assert.isTrue(userPressManagerStub.stop.calledOnce);
    assert.isTrue(alternativesCharMenuManagerStub.stop.calledOnce);
    assert.isTrue(window.clearTimeout.calledOnce);
  });

  suite('start first press', function() {
    var id0 = 0;
    var press0 = {
      target: {
        text: '1',
      }
    };

    setup(function() {
      alternativesCharMenuManagerStub.isShown = false;

      userPressManagerStub.onpressstart(press0, id0);

      assert.isTrue(
        manager.ontargetactivated.calledWith(press0.target, press0));
      assert.isTrue(window.clearTimeout.calledOnce);
      assert.isTrue(window.setTimeout.calledOnce);
      assert.equal(
        window.setTimeout.getCall(0).args[1], manager.LONG_PRESS_TIMEOUT);
    });

    test('press move (ignore same target), press end', function() {
      userPressManagerStub.onpressmove(press0, id0);

      assert.isFalse(window.clearTimeout.calledTwice);
      assert.isFalse(window.setTimeout.calledTwice);
      assert.isFalse(manager.ontargetmovedout.called);
      assert.isFalse(manager.ontargetmovedin.called);
      assert.isFalse(alternativesCharMenuManagerStub.hide.calledTwice);
      assert.isTrue(
        manager.ontargetmoved.calledWith(press0.target, press0));

      var pressEnd = {
        target: {
          text: 'e'
        }
      };
      userPressManagerStub.onpressend(pressEnd, id0);

      assert.isTrue(alternativesCharMenuManagerStub.hide.calledOnce);
      assert.isTrue(
        manager.ontargetcommitted.calledWith(press0.target));
      assert.isTrue(window.clearTimeout.calledThrice);
    });

    test('press end', function() {
      var pressEnd = {
        target: {
          text: 'e'
        }
      };
      userPressManagerStub.onpressend(pressEnd, id0);

      assert.isTrue(alternativesCharMenuManagerStub.hide.calledOnce);
      assert.isTrue(
        manager.ontargetcommitted.calledWith(press0.target));
      assert.isTrue(window.clearTimeout.calledThrice);
    });

    test('press end (moved press)', function() {
      var pressEnd = {
        target: {
          text: 'e'
        },
        moved: true
      };
      userPressManagerStub.onpressend(pressEnd, id0);

      assert.isTrue(alternativesCharMenuManagerStub.hide.calledOnce);
      assert.isTrue(
        manager.ontargetcommitted.calledWith(press0.target));
      assert.isTrue(window.clearTimeout.calledThrice);
    });

    test('press move to handwriting pad', function() {
      var pressMove = {
        target: {
          isHandwritingPad: true
        },
        moved: true
      };
      userPressManagerStub.onpressmove(pressMove, id0);

      assert.isTrue(window.clearTimeout.calledTwice);
      assert.isTrue(window.setTimeout.calledTwice);
      assert.isTrue(manager.ontargetmovedout.called);
      assert.isTrue(manager.ontargetmovedin.called);
      assert.isTrue(alternativesCharMenuManagerStub.hide.calledOnce);
    });

    test('double tap (within DOUBLE_TAP_TIMEOUT)', function() {
      var pressEnd = {
        target: press0.target
      };
      userPressManagerStub.onpressend(pressEnd, id0);

      assert.isTrue(manager.ontargetcommitted.calledOnce);
      assert.isFalse(manager.ontargetdoubletapped.calledOnce,
        'ontargetdoubletapped should not be called yet.');
      assert.isTrue(
        manager.ontargetcommitted.calledWith(press0.target));

      userPressManagerStub.onpressstart(press0, id0);
      userPressManagerStub.onpressend(pressEnd, id0);

      assert.isTrue(manager.ontargetcommitted.calledOnce);
      assert.isTrue(manager.ontargetdoubletapped.calledOnce);
      assert.isTrue(
        manager.ontargetdoubletapped.calledWith(press0.target));
    });

    test('double tap (after DOUBLE_TAP_TIMEOUT)', function() {
      var pressEnd = {
        target: press0.target
      };
      userPressManagerStub.onpressend(pressEnd, id0);

      assert.isTrue(alternativesCharMenuManagerStub.hide.calledOnce);
      assert.isTrue(manager.ontargetcommitted.calledOnce);
      assert.isFalse(manager.ontargetdoubletapped.calledOnce);
      assert.isTrue(
        manager.ontargetcommitted.calledWith(press0.target));
      assert.equal(window.setTimeout.getCall(1).args[1],
        manager.DOUBLE_TAP_TIMEOUT);
      window.setTimeout.getCall(1).args[0].call(window);

      userPressManagerStub.onpressstart(press0, id0);
      userPressManagerStub.onpressend(pressEnd, id0);

      assert.isTrue(manager.ontargetcommitted.calledTwice);
      assert.isFalse(manager.ontargetdoubletapped.calledOnce,
        'ontargetdoubletapped should not be called.');
      assert.isTrue(
        manager.ontargetcommitted.getCall(1).calledWith(press0.target));
    });

    test('double tap (with an intermediate different target)', function() {
      var pressEnd = {
        target: press0.target
      };
      userPressManagerStub.onpressend(pressEnd, id0);

      assert.isTrue(alternativesCharMenuManagerStub.hide.calledOnce);
      assert.isTrue(manager.ontargetcommitted.calledOnce);
      assert.isFalse(manager.ontargetdoubletapped.calledOnce);
      assert.isTrue(
        manager.ontargetcommitted.calledWith(press0.target));
      assert.equal(window.setTimeout.getCall(1).args[1],
        manager.DOUBLE_TAP_TIMEOUT);

      // Touch another target in the middle
      var press1 = {
        target: {
          text: '2'
        }
      };

      userPressManagerStub.onpressstart(press1, id0);
      userPressManagerStub.onpressend(press1, id0);

      assert.isTrue(manager.ontargetcommitted.calledTwice);
      assert.isTrue(
        manager.ontargetcommitted.getCall(1).calledWith(press1.target));

      userPressManagerStub.onpressstart(press0, id0);
      userPressManagerStub.onpressend(pressEnd, id0);

      assert.isTrue(manager.ontargetcommitted.calledThrice,
                   'ontargetcommitted should be called for the 3rd time.');
      assert.isFalse(manager.ontargetdoubletapped.calledOnce,
        'ontargetdoubletapped should not be called.');
      assert.isTrue(
        manager.ontargetcommitted.getCall(2).calledWith(press0.target));
    });

    test('tapping on a different target will clear ' + 
	 'the double tap timer', function() {
      var pressEnd = {
        target: press0.target
      };
      userPressManagerStub.onpressend(pressEnd, id0);

      assert.isTrue(alternativesCharMenuManagerStub.hide.calledOnce);
      assert.isTrue(manager.ontargetcommitted.calledOnce);
      assert.isFalse(manager.ontargetdoubletapped.calledOnce);
      assert.isTrue(
        manager.ontargetcommitted.calledWith(press0.target));
      assert.equal(window.setTimeout.getCall(1).args[1],
        manager.DOUBLE_TAP_TIMEOUT);

      // Touch another target
      var press1 = {
        target: {
          text: '2'
        }
      };

      userPressManagerStub.onpressstart(press1, id0);
      userPressManagerStub.onpressend(press1, id0);

      assert.equal(window.clearTimeout.callCount, 6);

      assert.isTrue(manager.ontargetcommitted.calledTwice);
      assert.isTrue(
        manager.ontargetcommitted.getCall(1).calledWith(press1.target));
    });

    test('triple tap (within DOUBLE_TAP_TIMEOUT)', function() {
      var pressEnd = {
        target: press0.target
      };
      userPressManagerStub.onpressend(pressEnd, id0);

      assert.isTrue(manager.ontargetcommitted.calledOnce);
      assert.isFalse(manager.ontargetdoubletapped.calledOnce);
      assert.isTrue(
        manager.ontargetcommitted.calledWith(press0.target));

      userPressManagerStub.onpressstart(press0, id0);
      userPressManagerStub.onpressend(pressEnd, id0);

      assert.isTrue(manager.ontargetcommitted.calledOnce);
      assert.isTrue(manager.ontargetdoubletapped.calledOnce);
      assert.isTrue(
        manager.ontargetdoubletapped.calledWith(press0.target));

      userPressManagerStub.onpressstart(press0, id0);
      userPressManagerStub.onpressend(pressEnd, id0);

      assert.isTrue(manager.ontargetcommitted.calledTwice);
      assert.isTrue(manager.ontargetdoubletapped.calledOnce,
        'ontargetdoubletapped should not be called again.');
      assert.isTrue(
        manager.ontargetcommitted.getCall(1).calledWith(press0.target));
    });

    suite('clearAllTargets', function() {
      setup(function() {
        manager.clearAllTargets();

        assert.isTrue(alternativesCharMenuManagerStub.hide.calledOnce);
        assert.isTrue(
          manager.ontargetcancelled.calledWith(press0.target));
        assert.isTrue(window.clearTimeout.calledTwice);
      });

      test('ignore press end', function() {
        var pressEnd = {
          target: {
            text: 'e'
          }
        };
        userPressManagerStub.onpressend(pressEnd, id0);

        assert.isFalse(manager.ontargetcommitted.called);
        assert.isFalse(alternativesCharMenuManagerStub.hide.calledTwice);
      });

      suite('ignore press moved', function() {
        setup(function() {
          var pressMove = {
            target: {
              text: 'm'
            }
          };

          alternativesCharMenuManagerStub.isMenuTarget.returns(false);
          alternativesCharMenuManagerStub.isInMenuArea.returns(false);

          userPressManagerStub.onpressmove(pressMove, id0);

          assert.isFalse(manager.ontargetmovedout.called);
          assert.isFalse(manager.ontargetmovedin.called);
          assert.isFalse(alternativesCharMenuManagerStub.hide.calledTwice);
        });

        test('ignore press end', function() {
          var pressEnd = {
            target: {
              text: 'e'
            }
          };
          userPressManagerStub.onpressend(pressEnd, id0);

          assert.isFalse(manager.ontargetcommitted.called);
          assert.isFalse(alternativesCharMenuManagerStub.hide.calledTwice);
        });
      });
    });

    suite('trigger long press, without alt char menu', function() {
      setup(function() {
        window.setTimeout.getCall(0).args[0].call(window);

        assert.isTrue(
          manager.ontargetlongpressed.calledWith(press0.target));
        assert.isTrue(
          alternativesCharMenuManagerStub.show.calledWith(press0.target));
      });

      test('press end', function() {
        var pressEnd = {
          target: {
            text: 'e'
          }
        };
        userPressManagerStub.onpressend(pressEnd, id0);

        assert.isTrue(alternativesCharMenuManagerStub.hide.calledOnce);
        assert.isTrue(
          manager.ontargetcommitted.calledWith(press0.target));
        assert.isTrue(window.clearTimeout.calledThrice);
      });
    });

    suite('trigger long press, with alt char menu', function() {
      var altTarget;

      setup(function() {
        altTarget = {
          text: 'a'
        };

        alternativesCharMenuManagerStub.isShown = true;
        alternativesCharMenuManagerStub
          .isInMenuArea.withArgs(press0).returns(true);
        alternativesCharMenuManagerStub.getMenuTarget.returns(altTarget);
        alternativesCharMenuManagerStub
          .isMenuTarget.withArgs(altTarget).returns(true);

        window.setTimeout.getCall(0).args[0].call(window);

        assert.isTrue(
          manager.ontargetlongpressed.calledWith(press0.target));
        assert.isTrue(
          manager.ontargetmovedout.calledWith(press0.target));
        assert.isTrue(
          manager.ontargetmovedin.calledWith(altTarget));
      });

      test('press end', function() {
        var pressEnd = {
          target: {
            text: 'e'
          }
        };
        userPressManagerStub.onpressend(pressEnd, id0);

        assert.isTrue(alternativesCharMenuManagerStub.hide.calledOnce);
        assert.isTrue(
          manager.ontargetcommitted.calledWith(altTarget));
        assert.equal(window.clearTimeout.callCount, 4);
      });

      suite('ignore second press', function() {
        var id1 = 1;
        var press1 = {
          target: {
            text: '2'
          }
        };

        setup(function() {
          userPressManagerStub.onpressstart(press1, id1);

          assert.isFalse(manager.ontargetactivated.calledTwice);
          assert.isFalse(window.clearTimeout.calledThrice);
          assert.isFalse(window.setTimeout.calledThrice);
        });

        test('ignore second press, press end first press', function() {
          var pressMove = {
            target: {
            text: 'm'
          }
          };
          userPressManagerStub.onpressmove(pressMove, id1);

          assert.isFalse(manager.ontargetmovedout.calledTwice);
          assert.isFalse(manager.ontargetmovedin.calledTwice);

          var pressEnd = {
            target: {
            text: 'e'
          }
          };
          userPressManagerStub.onpressend(pressEnd, id1);

          assert.isFalse(manager.ontargetcommitted.called);

          var pressEnd2 = {
            target: {
            text: 'e'
          }
          };
          userPressManagerStub.onpressend(pressEnd2, id0);

          assert.isTrue(alternativesCharMenuManagerStub.hide.calledOnce);
          assert.isTrue(
            manager.ontargetcommitted.calledWith(altTarget));
          assert.equal(window.clearTimeout.callCount, 4);
        });
      });
    });

    suite('press moved', function() {
      var movedTarget;
      var pressMove;

      setup(function() {
        alternativesCharMenuManagerStub.isMenuTarget.returns(false);
        alternativesCharMenuManagerStub.isInMenuArea.returns(false);

        var oldTarget = press0.target;
        movedTarget = {
          text: 'm'
        };
        pressMove = {
          target: movedTarget
        };

        userPressManagerStub.onpressmove(pressMove, id0);

        assert.isTrue(
          manager.ontargetmovedout.calledWith(oldTarget));
        assert.isTrue(
          manager.ontargetmovedin.calledWith(movedTarget));
        assert.isTrue(alternativesCharMenuManagerStub.hide.calledOnce);
        assert.isTrue(window.clearTimeout.calledTwice);
        assert.isTrue(window.setTimeout.calledTwice);
      });

      test('press end', function() {
        var pressEnd = {
          target: {
            text: 'e'
          }
        };
        userPressManagerStub.onpressend(pressEnd, id0);

        assert.isTrue(alternativesCharMenuManagerStub.hide.calledTwice);
        assert.isTrue(
          manager.ontargetcommitted.calledWith(movedTarget));
        assert.equal(window.clearTimeout.callCount, 4);
      });

      suite('trigger long press, without alt char menu', function() {
        setup(function() {
          window.setTimeout.getCall(1).args[0].call(window);

          assert.isTrue(
            manager.ontargetlongpressed.calledWith(movedTarget));
          assert.isTrue(
            alternativesCharMenuManagerStub.show.calledWith(movedTarget));
        });

        test('press end', function() {
          var pressEnd = {
            target: {
            text: 'e'
          }
          };
          userPressManagerStub.onpressend(pressEnd, id0);

          assert.isTrue(alternativesCharMenuManagerStub.hide.calledTwice);
          assert.isTrue(
            manager.ontargetcommitted.calledWith(movedTarget));
          assert.equal(window.clearTimeout.callCount, 4);
        });
      });
    });

    suite('start second press', function() {
      var id1 = 1;
      var press1 = {
        target: {
          text: '2'
        }
      };

      setup(function() {
        userPressManagerStub.onpressstart(press1, id1);

        assert.isTrue(manager.onnewtargetwillactivate.calledWith(press0.target),
          'onnewtargetwillactivate called.');

        assert.isTrue(manager.ontargetactivated.calledWith(press1.target));

        assert.equal(window.clearTimeout.callCount, 2);
        assert.equal(window.setTimeout.callCount, 1);
      });

      test('press end second press, and first press', function() {
        var pressEnd = {
          target: {
            text: 'e'
          }
        };
        userPressManagerStub.onpressend(pressEnd, id1);

        assert.isTrue(alternativesCharMenuManagerStub.hide.calledOnce);
        assert.isTrue(
          manager.ontargetcommitted.calledWith(press1.target));
        assert.equal(window.clearTimeout.callCount, 4);

        var pressEnd2 = {
          target: {
            text: 'e'
          }
        };
        userPressManagerStub.onpressend(pressEnd2, id0);

        assert.isTrue(alternativesCharMenuManagerStub.hide.calledTwice,
          'No additional calls to hide()');
        assert.isTrue(manager.ontargetcommitted.calledTwice,
          'No additional calls to ontargetcommitted');
      });

      test('press end first press, and second press', function() {
        var pressEnd = {
          target: {
            text: 'e'
          }
        };
        userPressManagerStub.onpressend(pressEnd, id0);

        assert.isTrue(alternativesCharMenuManagerStub.hide.calledOnce);
        assert.isTrue(
          manager.ontargetcommitted.calledWith(press0.target));
        assert.equal(window.clearTimeout.callCount, 4);

        var pressEnd2 = {
          target: {
            text: 'e'
          }
        };
        userPressManagerStub.onpressend(pressEnd2, id1);

        assert.isTrue(alternativesCharMenuManagerStub.hide.calledTwice,
          'No additional calls to hide()');
        assert.isTrue(manager.ontargetcommitted.calledTwice,
          'No additional calls to ontargetcommitted');
      });
    });
  });

  suite('start first press (on a selection)', function() {
    var id0 = 0;
    var press0 = {
      target: {
        text: '1',
        selection: 'true'
      }
    };

    setup(function() {
      alternativesCharMenuManagerStub.isShown = false;

      userPressManagerStub.onpressstart(press0, id0);

      assert.isTrue(
        manager.ontargetactivated.calledWith(press0.target));
      assert.isTrue(window.clearTimeout.calledOnce);
      assert.isTrue(window.setTimeout.calledOnce);
      assert.equal(
        window.setTimeout.getCall(0).args[1], manager.LONG_PRESS_TIMEOUT);
    });

    test('press end', function() {
      var pressEnd = {
        target: press0.target
      };
      userPressManagerStub.onpressend(pressEnd, id0);

      assert.isTrue(alternativesCharMenuManagerStub.hide.calledOnce);
      assert.isTrue(
        manager.ontargetcommitted.calledWith(press0.target));
      assert.isTrue(window.clearTimeout.calledThrice);
    });

    test('press move and press end (moved press)', function() {
      var pressMove = {
        target: press0.target,
        moved: true
      };
      userPressManagerStub.onpressmove(pressMove, id0);

      var pressEnd = {
        target: press0.target,
        moved: true
      };
      userPressManagerStub.onpressend(pressEnd, id0);

      assert.isTrue(alternativesCharMenuManagerStub.hide.calledOnce);
      assert.isTrue(
        manager.ontargetcancelled.calledWith(press0.target),
        'target should be cancelled.');
      assert.isTrue(window.clearTimeout.calledTwice);
    });
  });

  suite('start first press on handwriting pad', function() {
    var id0 = 0;
    var press0 = {
      target: {
        isHandwritingPad: true
      }
    };

    setup(function() {
      alternativesCharMenuManagerStub.isShown = false;

      userPressManagerStub.onpressstart(press0, id0);

      assert.isTrue(
        manager.ontargetactivated.calledWith(press0.target));
      assert.isTrue(window.clearTimeout.calledOnce);
      assert.isTrue(window.setTimeout.calledOnce);
      assert.equal(
        window.setTimeout.getCall(0).args[1], manager.LONG_PRESS_TIMEOUT);

      manager.blockNewUserPress = true;
      manager.blockTargetMovedOut = true;
    });

    test('ignore new press after start handwriting', function() {
      var newPress = {
        target: {
          text: 'n'
        }
      };
      var id1 = 1;

      userPressManagerStub.onpressstart(newPress, id1);
      assert.isFalse(
        manager.ontargetactivated.calledWith(newPress.target));
      assert.isFalse(window.clearTimeout.calledTwice);
      assert.isFalse(window.setTimeout.calledTwice);
    });

    test('press move on handwriting pad, press end', function() {
      userPressManagerStub.onpressmove(press0, id0);

      assert.isFalse(window.setTimeout.calledTwice);
      assert.isFalse(manager.ontargetmovedout.called);
      assert.isTrue(manager.ontargetmoved.called);
      assert.isFalse(manager.ontargetmovedin.called);
      assert.isFalse(alternativesCharMenuManagerStub.hide.called);

      // Press end
      userPressManagerStub.onpressend(press0, id0);

      assert.isTrue(alternativesCharMenuManagerStub.hide.calledOnce);
      assert.isTrue(window.clearTimeout.calledThrice);
      assert.isTrue(window.setTimeout.calledTwice);
      assert.isTrue(manager.ontargetcommitted.called);
    });

    test('press move out handwriting pad, press end', function() {
      var pressMove = {
        target: {
          text: 'm'
        }
      };

      userPressManagerStub.onpressmove(pressMove, id0);

      assert.isFalse(window.setTimeout.calledTwice);
      assert.isFalse(manager.ontargetmovedout.called);
      assert.isFalse(manager.ontargetmovedin.called);
      assert.isFalse(alternativesCharMenuManagerStub.hide.called);

      // Press end
      userPressManagerStub.onpressend(press0, id0);

      assert.isTrue(alternativesCharMenuManagerStub.hide.calledOnce);
      assert.isTrue(window.clearTimeout.calledThrice);
      assert.isTrue(window.setTimeout.calledTwice);
      assert.isTrue(manager.ontargetcommitted.called);
    });
  });
});
