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
    setup(function() {
      target = {
        keyCode: 99
      };
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

    test('move', function() {
      activeTargetsManagerStub.ontargetmoved(target);

      assert.isTrue(handlerStub.move.calledOnce);
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

    test('New Target activated', function() {
      activeTargetsManagerStub.onnewtargetwillactivate(target);

      assert.isTrue(handlerStub.newTargetActivate.calledOnce);
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

      test('move', function() {
        activeTargetsManagerStub.ontargetmoved(target);

        assert.isTrue(handlerStub.move.calledOnce);
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

      test('New target activated', function() {
        activeTargetsManagerStub.onnewtargetwillactivate(target);

        assert.isTrue(handlerStub.newTargetActivate.calledOnce);
      });
    });
  });

  suite('moveIn', function() {
    var target;
    setup(function() {
      target = {
        keyCode: 99
      };
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

    test('move', function() {
      activeTargetsManagerStub.ontargetmoved(target);

      assert.isTrue(handlerStub.move.calledOnce);
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

    test('New target activated', function() {
      activeTargetsManagerStub.onnewtargetwillactivate(target);

      assert.isTrue(handlerStub.newTargetActivate.calledOnce);
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

      test('move', function() {
        activeTargetsManagerStub.ontargetmoved(target);

        assert.isTrue(handlerStub.move.calledOnce);
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

      test('New target activated', function() {
        activeTargetsManagerStub.onnewtargetwillactivate(target);

        assert.isTrue(handlerStub.newTargetActivate.calledOnce);
      });
    });
  });

  suite('activate different targets', function() {
    test('DismissSuggestionsTargetHandler', function() {
      var target = {
        isDismissSuggestionsButton: true
      };

      activeTargetsManagerStub.ontargetactivated(target);

      assert.isTrue(
        window.DismissSuggestionsTargetHandler.calledWith(target, app));

      assert.isTrue(handlerStub.activate.calledOnce);
    });

    test('CandidateSelectionTargetHandler', function() {
      var target = {
        selection: 'foo'
      };

      activeTargetsManagerStub.ontargetactivated(target);

      assert.isTrue(
        window.CandidateSelectionTargetHandler.calledWith(target, app));

      assert.isTrue(handlerStub.activate.calledOnce);
    });

    test('CompositeTargetHandler', function() {
      var target = {
        compositeKey: 'lol'
      };

      activeTargetsManagerStub.ontargetactivated(target);

      assert.isTrue(
        window.CompositeTargetHandler.calledWith(target, app));

      assert.isTrue(handlerStub.activate.calledOnce);
    });

    test('BackspaceTargetHandler', function() {
      var target = {
        keyCode: KeyEvent.DOM_VK_BACK_SPACE
      };

      activeTargetsManagerStub.ontargetactivated(target);

      assert.isTrue(
        window.BackspaceTargetHandler.calledWith(target, app));

      assert.isTrue(handlerStub.activate.calledOnce);
    });

    test('SpaceKeyTargetHandler', function() {
      var target = {
        keyCode: KeyEvent.DOM_VK_SPACE
      };

      activeTargetsManagerStub.ontargetactivated(target);

      assert.isTrue(
        window.SpaceKeyTargetHandler.calledWith(target, app));

      assert.isTrue(handlerStub.activate.calledOnce);
    });

    test('PageSwitchingTargetHandler', function() {
      var target = {
        keyCode: KeyEvent.DOM_VK_ALT
      };

      activeTargetsManagerStub.ontargetactivated(target);

      assert.isTrue(
        window.PageSwitchingTargetHandler.calledWith(target, app));

      assert.isTrue(handlerStub.activate.calledOnce);
    });

    test('SwitchKeyboardTargetHandler', function() {
      var target = {
        keyCode: app.layoutManager.KEYCODE_SWITCH_KEYBOARD
      };

      activeTargetsManagerStub.ontargetactivated(target);

      assert.isTrue(
        window.SwitchKeyboardTargetHandler.calledWith(target, app));

      assert.isTrue(handlerStub.activate.calledOnce);
    });

    test('CapsLockTargetHandler', function() {
      var target = {
        keyCode: KeyEvent.DOM_VK_CAPS_LOCK
      };

      activeTargetsManagerStub.ontargetactivated(target);

      assert.isTrue(
        window.CapsLockTargetHandler.calledWith(target, app));

      assert.isTrue(handlerStub.activate.calledOnce);
    });

    suite('DefaultTargetHandler', function() {
      test('-99', function() {
        var target = {
          keyCode: -99
        };

        activeTargetsManagerStub.ontargetactivated(target);

        assert.isTrue(
          window.DefaultTargetHandler.calledWith(target, app));

        assert.isTrue(handlerStub.activate.calledOnce);
      });

      test('99', function() {
        var target = {
          keyCode: 99
        };

        activeTargetsManagerStub.ontargetactivated(target);

        assert.isTrue(
          window.DefaultTargetHandler.calledWith(target, app));

        assert.isTrue(handlerStub.activate.calledOnce);
      });
    });

    test('NullTargetHandler', function() {
      var target = {};

      activeTargetsManagerStub.ontargetactivated(target);

      assert.isTrue(
        window.NullTargetHandler.calledWith(target, app));

      assert.isTrue(handlerStub.activate.calledOnce);
    });

    test('HandwritingPadTargetHandler', function() {
      var target = {
        isHandwritingPad: true
      };

      activeTargetsManagerStub.ontargetactivated(target);

      assert.isTrue(
        window.HandwritingPadTargetHandler.calledWith(target, app));

      assert.isTrue(handlerStub.activate.calledOnce);
      assert.isTrue(activeTargetsManagerStub.blockNewUserPress);
      assert.isTrue(activeTargetsManagerStub.blockTargetMovedOut);

      activeTargetsManagerStub.ontargetcommitted(target);

      assert.isTrue(handlerStub.commit.calledOnce);
      assert.isFalse(activeTargetsManagerStub.blockNewUserPress);
      assert.isFalse(activeTargetsManagerStub.blockTargetMovedOut);
    });
  });
});
