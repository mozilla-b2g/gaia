'use strict';

/* global ActiveTargetsManager, AlternativesCharMenuManager, UserPressManager */

require('/js/keyboard/active_targets_manager.js');
require('/js/keyboard/alternatives_char_menu_manager.js');
require('/js/keyboard/user_press_manager.js');

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

    this.sinon.stub(window, 'setTimeout');
    this.sinon.stub(window, 'clearTimeout');

    app = {};

    manager = new ActiveTargetsManager(app);
    manager.ontargetactivated = this.sinon.stub();
    manager.ontargetlongpressed = this.sinon.stub();
    manager.ontargetmovedout = this.sinon.stub();
    manager.ontargetmovedin = this.sinon.stub();
    manager.ontargetcommitted = this.sinon.stub();
    manager.ontargetcancelled = this.sinon.stub();
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
        textContent: '1',
        dataset: {}
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

    test('press move (ignore same target), press end', function() {
      userPressManagerStub.onpressmove(press0, id0);

      assert.isFalse(window.clearTimeout.calledTwice);
      assert.isFalse(window.setTimeout.calledTwice);
      assert.isFalse(manager.ontargetmovedout.called);
      assert.isFalse(manager.ontargetmovedin.called);
      assert.isFalse(alternativesCharMenuManagerStub.hide.calledTwice);

      var pressEnd = {
        target: {
          textContent: 'e'
        }
      };
      userPressManagerStub.onpressend(pressEnd, id0);

      assert.isTrue(alternativesCharMenuManagerStub.hide.calledOnce);
      assert.isTrue(
        manager.ontargetcommitted.calledWith(press0.target));
      assert.isTrue(window.clearTimeout.calledTwice);
    });

    test('press end', function() {
      var pressEnd = {
        target: {
          textContent: 'e'
        }
      };
      userPressManagerStub.onpressend(pressEnd, id0);

      assert.isTrue(alternativesCharMenuManagerStub.hide.calledOnce);
      assert.isTrue(
        manager.ontargetcommitted.calledWith(press0.target));
      assert.isTrue(window.clearTimeout.calledTwice);
    });

    test('press end (moved press)', function() {
      var pressEnd = {
        target: {
          textContent: 'e'
        },
        moved: true
      };
      userPressManagerStub.onpressend(pressEnd, id0);

      assert.isTrue(alternativesCharMenuManagerStub.hide.calledOnce);
      assert.isTrue(
        manager.ontargetcommitted.calledWith(press0.target));
      assert.isTrue(window.clearTimeout.calledTwice);
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
            textContent: 'e'
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
              textContent: 'm'
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
              textContent: 'e'
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
            textContent: 'e'
          }
        };
        userPressManagerStub.onpressend(pressEnd, id0);

        assert.isTrue(alternativesCharMenuManagerStub.hide.calledOnce);
        assert.isTrue(
          manager.ontargetcommitted.calledWith(press0.target));
        assert.isTrue(window.clearTimeout.calledTwice);
      });
    });

    suite('trigger long press, with alt char menu', function() {
      var altTarget;

      setup(function() {
        altTarget = {
          textContent: 'a'
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
            textContent: 'e'
          }
        };
        userPressManagerStub.onpressend(pressEnd, id0);

        assert.isTrue(alternativesCharMenuManagerStub.hide.calledOnce);
        assert.isTrue(
          manager.ontargetcommitted.calledWith(altTarget));
        assert.equal(window.clearTimeout.callCount, 3);
      });

      suite('ignore second press', function() {
        var id1 = 1;
        var press1 = {
          target: {
            textContent: '2'
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
            textContent: 'm'
          }
          };
          userPressManagerStub.onpressmove(pressMove, id1);

          assert.isFalse(manager.ontargetmovedout.calledTwice);
          assert.isFalse(manager.ontargetmovedin.calledTwice);

          var pressEnd = {
            target: {
            textContent: 'e'
          }
          };
          userPressManagerStub.onpressend(pressEnd, id1);

          assert.isFalse(manager.ontargetcommitted.called);

          var pressEnd2 = {
            target: {
            textContent: 'e'
          }
          };
          userPressManagerStub.onpressend(pressEnd2, id0);

          assert.isTrue(alternativesCharMenuManagerStub.hide.calledOnce);
          assert.isTrue(
            manager.ontargetcommitted.calledWith(altTarget));
          assert.equal(window.clearTimeout.callCount, 3);
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
          textContent: 'm'
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
            textContent: 'e'
          }
        };
        userPressManagerStub.onpressend(pressEnd, id0);

        assert.isTrue(alternativesCharMenuManagerStub.hide.calledTwice);
        assert.isTrue(
          manager.ontargetcommitted.calledWith(movedTarget));
        assert.equal(window.clearTimeout.callCount, 3);
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
            textContent: 'e'
          }
          };
          userPressManagerStub.onpressend(pressEnd, id0);

          assert.isTrue(alternativesCharMenuManagerStub.hide.calledTwice);
          assert.isTrue(
            manager.ontargetcommitted.calledWith(movedTarget));
          assert.equal(window.clearTimeout.callCount, 3);
        });
      });
    });

    suite('start second press', function() {
      var id1 = 1;
      var press1 = {
        target: {
          textContent: '2'
        }
      };

      setup(function() {
        userPressManagerStub.onpressstart(press1, id1);

        assert.isTrue(manager.ontargetcommitted.calledWith(press0.target),
          'Commit the first press when the second press starts.');
        assert.isTrue(alternativesCharMenuManagerStub.hide.calledOnce);

        assert.isTrue(
          manager.ontargetactivated.calledWith(press1.target));

        assert.equal(window.clearTimeout.callCount, 3);
        assert.isTrue(window.setTimeout.calledTwice);
      });

      test('press end second press, and first press', function() {
        var pressEnd = {
          target: {
            textContent: 'e'
          }
        };
        userPressManagerStub.onpressend(pressEnd, id1);

        assert.isTrue(alternativesCharMenuManagerStub.hide.calledTwice);
        assert.isTrue(
          manager.ontargetcommitted.calledWith(press1.target));
        assert.equal(window.clearTimeout.callCount, 4);

        var pressEnd2 = {
          target: {
            textContent: 'e'
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
            textContent: 'e'
          }
        };
        userPressManagerStub.onpressend(pressEnd, id0);

        assert.isTrue(alternativesCharMenuManagerStub.hide.calledOnce);
        assert.isTrue(
          manager.ontargetcommitted.calledWith(press0.target));
        assert.equal(window.clearTimeout.callCount, 3);

        var pressEnd2 = {
          target: {
            textContent: 'e'
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
        textContent: '1',
        dataset: {
          selection: 'true'
        }
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
      assert.isTrue(window.clearTimeout.calledTwice);
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
});
