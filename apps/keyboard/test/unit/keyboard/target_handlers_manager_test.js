'use strict';

/* global TargetHandlersManager, ActiveTargetsManager,
          DefaultTargetHandler, KeyEvent, LayoutManager, KeyboardConsole */

require('/js/keyboard/active_targets_manager.js');
require('/js/keyboard/target_handlers.js');
require('/js/keyboard/layout_manager.js');
require('/js/keyboard/console.js');

require('/js/keyboard/target_handlers_manager.js');

suite('TargetHandlersManager', function() {
  var manager;
  var app;
  var handlerStub;
  var activeTargetsManagerStub;

  var actions = [
    {name: 'commit', eventHandler: 'ontargetcommitted' },
    {name: 'move', eventHandler: 'ontargetmoved' },
    {name: 'moveOut', eventHandler: 'ontargetmovedout' },
    {name: 'cancel', eventHandler: 'ontargetcancelled' },
    {name: 'doubleTap', eventHandler: 'ontargetdoubletapped' },
    {name: 'newTargetActivate', eventHandler: 'onnewtargetwillactivate' }
  ];

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
    this.sinon.stub(window, 'HandwritingPadTargetHandler')
      .returns(handlerStub);

    app = {
      console: this.sinon.stub(KeyboardConsole.prototype),
      layoutManager: this.sinon.stub(LayoutManager.prototype)
    };
    manager = new TargetHandlersManager(app);
    manager.start();

    assert.isTrue(window.ActiveTargetsManager.calledWith(app));
    assert.isTrue(activeTargetsManagerStub.start.calledOnce);
  });

  suite('activate', function() {
    var target;
    setup(function(done) {
      target = {
        keyCode: 99
      };
      activeTargetsManagerStub.ontargetactivated(target);

      assert.isTrue(window.DefaultTargetHandler.calledWith(target, app));
      assert.isTrue(window.DefaultTargetHandler.calledOnce);

      manager.promiseQueue.then(function() {
        assert.isTrue(handlerStub.activate.calledOnce);
      }, function(e) {
        assert.isTrue(false, 'promiseQueue should not reject.');
      }).then(done, done);
    });

    teardown(function() {
      assert.isTrue(window.DefaultTargetHandler.calledOnce,
        'Same handler was used for every following action.');
    });

    actions.forEach(function(action) {
      test(action.name, function(done) {
        activeTargetsManagerStub[action.eventHandler](target);

        manager.promiseQueue.then(function() {
          assert.isTrue(handlerStub[action.name].calledOnce);
        }, function(e) {
          assert.isTrue(false, 'promiseQueue should not reject.');
        }).then(done, done);
      });
    });

    suite('longPress', function() {
      setup(function(done) {
        activeTargetsManagerStub.ontargetlongpressed(target);

        manager.promiseQueue.then(function() {
          assert.isTrue(handlerStub.longPress.calledOnce);
        }, function(e) {
          assert.isTrue(false, 'promiseQueue should not reject.');
        }).then(done, done);
      });

      actions.forEach(function(action) {
        test(action.name, function(done) {
          activeTargetsManagerStub[action.eventHandler](target);

          manager.promiseQueue.then(function() {
            assert.isTrue(handlerStub[action.name].calledOnce);
          }, function(e) {
            assert.isTrue(false, 'promiseQueue should not reject.');
          }).then(done, done);
        });
      });
    });
  });

  suite('moveIn', function() {
    var target;
    setup(function(done) {
      target = {
        keyCode: 99
      };
      activeTargetsManagerStub.ontargetmovedin(target);

      assert.isTrue(window.DefaultTargetHandler.calledWith(target, app));
      assert.isTrue(window.DefaultTargetHandler.calledOnce);

      manager.promiseQueue.then(function() {
        assert.isTrue(handlerStub.moveIn.calledOnce);
      }, function(e) {
        assert.isTrue(false, 'promiseQueue should not reject.');
      }).then(done, done);
    });

    teardown(function() {
      assert.isTrue(window.DefaultTargetHandler.calledOnce,
        'Same handler was used for every following action.');
    });

    actions.forEach(function(action) {
      test(action.name, function(done) {
        activeTargetsManagerStub[action.eventHandler](target);

        manager.promiseQueue.then(function() {
          assert.isTrue(handlerStub[action.name].calledOnce);
        }, function(e) {
          assert.isTrue(false, 'promiseQueue should not reject.');
        }).then(done, done);
      });
    });

    suite('longPress', function() {
      setup(function(done) {
        activeTargetsManagerStub.ontargetlongpressed(target);

        manager.promiseQueue.then(function() {
          assert.isTrue(handlerStub.longPress.calledOnce);
        }, function(e) {
          assert.isTrue(false, 'promiseQueue should not reject.');
        }).then(done, done);
      });

      actions.forEach(function(action) {
        test(action.name, function(done) {
          activeTargetsManagerStub[action.eventHandler](target);

          manager.promiseQueue.then(function() {
            assert.isTrue(handlerStub[action.name].calledOnce);
          }, function(e) {
            assert.isTrue(false, 'promiseQueue should not reject.');
          }).then(done, done);
        });
      });
    });
  });

  suite('activate different targets', function() {
    test('DismissSuggestionsTargetHandler', function(done) {
      var target = {
        isDismissSuggestionsButton: true
      };

      activeTargetsManagerStub.ontargetactivated(target);

      assert.isTrue(
        window.DismissSuggestionsTargetHandler.calledWith(target, app));

      manager.promiseQueue.then(function() {
        assert.isTrue(handlerStub.activate.calledOnce);
      }, function(e) {
        assert.isTrue(false, 'promiseQueue should not reject.');
      }).then(done, done);
    });

    test('CandidateSelectionTargetHandler', function(done) {
      var target = {
        suggestion: 'foo'
      };

      activeTargetsManagerStub.ontargetactivated(target);

      assert.isTrue(
        window.CandidateSelectionTargetHandler.calledWith(target, app));

      manager.promiseQueue.then(function() {
        assert.isTrue(handlerStub.activate.calledOnce);
      }, function(e) {
        assert.isTrue(false, 'promiseQueue should not reject.');
      }).then(done, done);
    });

    test('CompositeTargetHandler', function(done) {
      var target = {
        compositeKey: 'lol'
      };

      activeTargetsManagerStub.ontargetactivated(target);

      assert.isTrue(
        window.CompositeTargetHandler.calledWith(target, app));

      manager.promiseQueue.then(function() {
        assert.isTrue(handlerStub.activate.calledOnce);
      }, function(e) {
        assert.isTrue(false, 'promiseQueue should not reject.');
      }).then(done, done);
    });

    test('BackspaceTargetHandler', function(done) {
      var target = {
        keyCode: KeyEvent.DOM_VK_BACK_SPACE
      };

      activeTargetsManagerStub.ontargetactivated(target);

      assert.isTrue(
        window.BackspaceTargetHandler.calledWith(target, app));

      manager.promiseQueue.then(function() {
        assert.isTrue(handlerStub.activate.calledOnce);
      }, function(e) {
        assert.isTrue(false, 'promiseQueue should not reject.');
      }).then(done, done);
    });

    test('SpaceKeyTargetHandler', function(done) {
      var target = {
        keyCode: KeyEvent.DOM_VK_SPACE
      };

      activeTargetsManagerStub.ontargetactivated(target);

      assert.isTrue(
        window.SpaceKeyTargetHandler.calledWith(target, app));

      manager.promiseQueue.then(function() {
        assert.isTrue(handlerStub.activate.calledOnce);
      }, function(e) {
        assert.isTrue(false, 'promiseQueue should not reject.');
      }).then(done, done);
    });

    test('PageSwitchingTargetHandler', function(done) {
      var target = {
        keyCode: KeyEvent.DOM_VK_ALT
      };

      activeTargetsManagerStub.ontargetactivated(target);

      assert.isTrue(
        window.PageSwitchingTargetHandler.calledWith(target, app));

      manager.promiseQueue.then(function() {
        assert.isTrue(handlerStub.activate.calledOnce);
      }, function(e) {
        assert.isTrue(false, 'promiseQueue should not reject.');
      }).then(done, done);
    });

    test('SwitchKeyboardTargetHandler', function(done) {
      var target = {
        keyCode: app.layoutManager.KEYCODE_SWITCH_KEYBOARD
      };

      activeTargetsManagerStub.ontargetactivated(target);

      assert.isTrue(
        window.SwitchKeyboardTargetHandler.calledWith(target, app));

      manager.promiseQueue.then(function() {
        assert.isTrue(handlerStub.activate.calledOnce);
      }, function(e) {
        assert.isTrue(false, 'promiseQueue should not reject.');
      }).then(done, done);
    });

    test('CapsLockTargetHandler', function(done) {
      var target = {
        keyCode: KeyEvent.DOM_VK_CAPS_LOCK
      };

      activeTargetsManagerStub.ontargetactivated(target);

      assert.isTrue(
        window.CapsLockTargetHandler.calledWith(target, app));

      manager.promiseQueue.then(function() {
        assert.isTrue(handlerStub.activate.calledOnce);
      }, function(e) {
        assert.isTrue(false, 'promiseQueue should not reject.');
      }).then(done, done);
    });

    suite('DefaultTargetHandler', function() {
      test('-99', function(done) {
        var target = {
          keyCode: -99
        };

        activeTargetsManagerStub.ontargetactivated(target);

        assert.isTrue(
          window.DefaultTargetHandler.calledWith(target, app));

        manager.promiseQueue.then(function() {
          assert.isTrue(handlerStub.activate.calledOnce);
        }, function(e) {
          assert.isTrue(false, 'promiseQueue should not reject.');
        }).then(done, done);
      });

      test('99', function(done) {
        var target = {
          keyCode: 99
        };

        activeTargetsManagerStub.ontargetactivated(target);

        assert.isTrue(
          window.DefaultTargetHandler.calledWith(target, app));

        manager.promiseQueue.then(function() {
          assert.isTrue(handlerStub.activate.calledOnce);
        }, function(e) {
          assert.isTrue(false, 'promiseQueue should not reject.');
        }).then(done, done);
      });
    });

    test('NullTargetHandler', function(done) {
      var target = {};

      activeTargetsManagerStub.ontargetactivated(target);

      assert.isTrue(
        window.NullTargetHandler.calledWith(target, app));

      manager.promiseQueue.then(function() {
        assert.isTrue(handlerStub.activate.calledOnce);
      }, function(e) {
        assert.isTrue(false, 'promiseQueue should not reject.');
      }).then(done, done);
    });

    test('HandwritingPadTargetHandler', function(done) {
      var target = {
        isHandwritingPad: true
      };

      activeTargetsManagerStub.ontargetactivated(target);

      assert.isTrue(
        window.HandwritingPadTargetHandler.calledWith(target, app));

      manager.promiseQueue.then(function() {
        assert.isTrue(handlerStub.activate.calledOnce);
        assert.isTrue(activeTargetsManagerStub.blockNewUserPress);
        assert.isTrue(activeTargetsManagerStub.blockTargetMovedOut);

        activeTargetsManagerStub.ontargetcommitted(target);
      }).then(function() {
        assert.isTrue(handlerStub.commit.calledOnce);
        assert.isFalse(activeTargetsManagerStub.blockNewUserPress);
        assert.isFalse(activeTargetsManagerStub.blockTargetMovedOut);
        activeTargetsManagerStub.ontargetcommitted(target);
      }, function(e) {
        assert.isTrue(false, 'promiseQueue should not reject.');
      }).then(done, done);
    });
  });
});
