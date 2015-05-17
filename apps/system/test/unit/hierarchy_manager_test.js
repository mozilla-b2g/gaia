/* global MocksHelper, BaseModule, MockAppWindow, MockAttentionWindow */
'use strict';


requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_attention_window.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/hierarchy_manager.js');

var mocksForHierarchyManager = new MocksHelper([
  'LazyLoader'
]).init();

suite('system/HierarchyManager', function() {
  var subject;
  mocksForHierarchyManager.attachTestHelpers();

  var fakeAttentionWindowManager = {
    name: 'AttentionWindowManager',
    EVENT_PREFIX: 'attwm',
    isActive: function() {},
    getActiveWindow: function() {},
    setHierarchy: function() {},
    respondToHierarchyEvent: function() {}
  };
  var fakeAppWindowManager = {
    name: 'AppWindowManager',
    EVENT_PREFIX: 'awm',
    isActive: function() {},
    getActiveWindow: function() {},
    setHierarchy: function() {},
    respondToHierarchyEvent: function() {}
  };
  var fakeActionMenu = {
    name: 'ActionMenu',
    EVENT_PREFIX: 'actionmenu',
    isActive: function() {},
    getActiveWindow: function() {},
    setHierarchy: function() {},
    respondToHierarchyEvent: function() {}
  };
  var fakeSystemDialogManager = {
    name: 'SystemDialogManager',
    EVENT_PREFIX: 'sdm',
    isActive: function() {},
    setHierarchy: function() {},
    respondToHierarchyEvent: function() {}
  };
  var fakeRocketbar = {
    name: 'Rocketbar',
    EVENT_PREFIX: 'rb',
    isActive: function() {},
    getActiveWindow: function() {},
    setHierarchy: function() {},
    respondToHierarchyEvent: function() {}
  };
  var fakeInitLogoHandler = {
    name: 'InitLogoHandler',
    EVENT_PREFIX: 'il',
    isActive: function() {},
    setHierarchy: function() {},
    respondToHierarchyEvent: function() {}
  };
  var fakeTaskManager = {
    name: 'TaskManager',
    EVENT_PREFIX: 'tm',
    isActive: function() {},
    setHierarchy: function() {},
    respondToHierarchyEvent: function() {}
  };

  setup(function() {
    subject = BaseModule.instantiate('HierarchyManager');
    subject.start();
  });

  teardown(function() {
    subject.stop();
  });

  suite('Update top most window', function() {
    test('should update top most window when window is opened', function() {
      this.sinon.stub(subject, 'publish');
      this.sinon.stub(subject, 'getTopMostWindow').returns(new MockAppWindow());
      window.dispatchEvent(new CustomEvent('windowopened'));
      assert.isTrue(subject.publish.calledWith('topmostwindowchanged'));
      var oldTop = subject.getTopMostWindow();
      subject.getTopMostWindow.returns(oldTop);
      window.dispatchEvent(new CustomEvent('windowopened'));
      assert.isTrue(subject.publish.calledOnce);
    });
  });

  suite('Get top most window', function() {
    setup(function() {
      subject.registerHierarchy(fakeAppWindowManager);
      subject.registerHierarchy(fakeAttentionWindowManager);
    });

    teardown(function() {
      subject.unregisterHierarchy(fakeAppWindowManager);
      subject.unregisterHierarchy(fakeAttentionWindowManager);
    });

    test('Should get top most window instance ' +
         'if there is active window manager and it is having active window',
      function() {
        var fakeAppWindow = new MockAppWindow();
        this.sinon.stub(fakeAppWindowManager, 'getActiveWindow')
            .returns(fakeAppWindow);
        this.sinon.stub(fakeAppWindowManager, 'isActive').returns(true);
        assert.equal(subject.getTopMostWindow(), fakeAppWindow);

        var fakeAttentionWindow = new MockAttentionWindow();
        this.sinon.stub(fakeAttentionWindowManager, 'getActiveWindow')
            .returns(fakeAttentionWindow);
        this.sinon.stub(fakeAttentionWindowManager, 'isActive').returns(true);

        assert.equal(subject.getTopMostWindow(), fakeAttentionWindow);
      });

    test('Should get undefined if there is no active window manager',
      function() {
        this.sinon.stub(fakeAppWindowManager, 'isActive').returns(false);
        assert.isUndefined(subject.getTopMostWindow());
      });
  });

  suite('Update Hierarchy', function() {
    setup(function() {
      subject.registerHierarchy(fakeAppWindowManager);
      subject.registerHierarchy(fakeActionMenu);
      subject.registerHierarchy(fakeSystemDialogManager);
      subject.registerHierarchy(fakeRocketbar);
    });

    teardown(function() {
      subject.unregisterHierarchy(fakeAppWindowManager);
      subject.unregisterHierarchy(fakeActionMenu);
      subject.unregisterHierarchy(fakeSystemDialogManager);
      subject.unregisterHierarchy(fakeRocketbar);
    });

    test('-activated/-activating/-deactivating/-deactivated',
      function() {
        subject.registerHierarchy(fakeInitLogoHandler);
        var stubILisActive = this.sinon.stub(fakeInitLogoHandler, 'isActive');
        stubILisActive.returns(true);
        window.dispatchEvent(
          new CustomEvent(fakeInitLogoHandler.EVENT_PREFIX + '-activated'));
        assert.equal(subject.getTopMostUI(), fakeInitLogoHandler);
        subject.unregisterHierarchy(fakeInitLogoHandler);
        assert.isNull(subject.getTopMostUI());

        var stubAWMisActive = this.sinon.stub(fakeAppWindowManager, 'isActive');
        stubAWMisActive.returns(true);
        window.dispatchEvent(
          new CustomEvent(fakeAppWindowManager.EVENT_PREFIX + '-activated'));
        assert.equal(subject.getTopMostUI(), fakeAppWindowManager);

        stubAWMisActive.returns(false);
        window.dispatchEvent(
          new CustomEvent(fakeAppWindowManager.EVENT_PREFIX + '-deactivated'));
        assert.isNull(subject.getTopMostUI());

        var stubRBisActive = this.sinon.stub(fakeRocketbar, 'isActive');
        stubRBisActive.returns(true);
        window.dispatchEvent(
          new CustomEvent(fakeRocketbar.EVENT_PREFIX + '-activated'));

        assert.equal(subject.getTopMostUI(), fakeRocketbar);
        stubAWMisActive.returns(true);

        window.dispatchEvent(
          new CustomEvent(fakeAppWindowManager.EVENT_PREFIX + '-activated'));
        assert.equal(subject.getTopMostUI(), fakeRocketbar);

        stubRBisActive.returns(false);
        window.dispatchEvent(
          new CustomEvent(fakeRocketbar.EVENT_PREFIX + '-deactivated'));
        assert.equal(subject.getTopMostUI(), fakeAppWindowManager);

        var stubAMisActive = this.sinon.stub(fakeActionMenu, 'isActive');
        stubAMisActive.returns(true);
        window.dispatchEvent(
          new CustomEvent(fakeActionMenu.EVENT_PREFIX + '-activated'));
        assert.equal(subject.getTopMostUI(), fakeActionMenu);
        stubAMisActive.returns(false);
        window.dispatchEvent(
          new CustomEvent(fakeActionMenu.EVENT_PREFIX + '-deactivated'));
        assert.equal(subject.getTopMostUI(), fakeAppWindowManager);
      });
  });

  suite('focus request', function() {
    test('should not focus when lower priority module ' +
      'requests to be focused', function() {
        this.sinon.stub(fakeAppWindowManager, 'setHierarchy');
        this.sinon.stub(fakeAppWindowManager, 'isActive').returns(true);
        this.sinon.stub(fakeSystemDialogManager, 'isActive').returns(true);
        this.sinon.stub(fakeSystemDialogManager, 'setHierarchy').returns(true);
        subject.registerHierarchy(fakeAppWindowManager);
        subject.registerHierarchy(fakeSystemDialogManager);
        subject.focus(fakeAppWindowManager);
        assert.isTrue(fakeAppWindowManager.setHierarchy.calledWith(false));
      });

    test('should focus when higher priority module requests to be focused',
      function() {
        this.sinon.stub(fakeSystemDialogManager, 'setHierarchy');
        this.sinon.stub(fakeAppWindowManager, 'isActive').returns(true);
        this.sinon.stub(fakeSystemDialogManager, 'isActive').returns(true);
        subject.registerHierarchy(fakeAppWindowManager);
        subject.registerHierarchy(fakeSystemDialogManager);
        subject.focus(fakeSystemDialogManager);
        assert.isTrue(fakeSystemDialogManager.setHierarchy.calledWith(true));
      });

    test('should not blur lower priority module ' +
      'when higher priority module is not focused successfully', function() {
        this.sinon.stub(fakeAppWindowManager, 'setHierarchy');
        this.sinon.stub(fakeAppWindowManager, 'isActive').returns(true);
        this.sinon.stub(fakeSystemDialogManager, 'isActive').returns(true);
        this.sinon.stub(fakeSystemDialogManager, 'setHierarchy').returns(false);
        subject.registerHierarchy(fakeAppWindowManager);
        subject.registerHierarchy(fakeSystemDialogManager);
        subject.focus(fakeAppWindowManager);
        assert.isFalse(fakeAppWindowManager.setHierarchy.calledOnce);
      });

    test('should focus top most without a module', function() {
      this.sinon.stub(fakeAppWindowManager, 'setHierarchy');
      this.sinon.stub(fakeAppWindowManager, 'isActive').returns(true);
      // use registerHierarchy to update top most
      subject.registerHierarchy(fakeAppWindowManager);
      subject.focus();
      assert.isTrue(fakeAppWindowManager.setHierarchy.called);
    });
  });

  suite('unregisterHierarchy', function() {
    test('unwatch the hierarchy',
      function() {
        subject.registerHierarchy(fakeAppWindowManager);
        subject.unregisterHierarchy(fakeAppWindowManager);
        assert.equal(subject._ui_list.length, 0);
      });
  });

  suite('registerHierarchy', function() {
    test('Should update _ui_list and call updateHierarchy when registering',
      function() {
        this.sinon.stub(subject, 'updateHierarchy');
        subject.registerHierarchy(fakeAppWindowManager);
        assert.equal(subject._ui_list.length, 1);
        assert.isTrue(subject.updateHierarchy.calledOnce);

        subject.registerHierarchy(fakeSystemDialogManager);
        assert.equal(subject._ui_list.length, 2);
        assert.isTrue(subject.updateHierarchy.calledTwice);

        subject.registerHierarchy(fakeRocketbar);
        assert.equal(subject._ui_list.length, 3);
        assert.isTrue(subject.updateHierarchy.calledThrice);
      });
  });

  suite('respondToHierarchyEvent hierarchy events', function() {
    setup(function() {
      subject.registerHierarchy(fakeSystemDialogManager);
      subject.registerHierarchy(fakeRocketbar);
      subject.registerHierarchy(fakeActionMenu);
      subject.registerHierarchy(fakeTaskManager);
      subject.registerHierarchy(fakeAppWindowManager);
      subject.registerHierarchy(fakeAttentionWindowManager);
    });

    teardown(function() {
      subject.unregisterHierarchy(fakeSystemDialogManager);
      subject.unregisterHierarchy(fakeRocketbar);
      subject.unregisterHierarchy(fakeActionMenu);
      subject.unregisterHierarchy(fakeTaskManager);
      subject.unregisterHierarchy(fakeAppWindowManager);
      subject.unregisterHierarchy(fakeAttentionWindowManager);
    });

    test('Should broadcast event from top to bottom until blocked', function() {
      this.sinon.stub(fakeRocketbar, 'isActive').returns(true);
      this.sinon.stub(fakeSystemDialogManager, 'isActive').returns(true);
      this.sinon.stub(fakeActionMenu, 'isActive').returns(true);
      this.sinon.stub(fakeAppWindowManager, 'isActive').returns(true);
      this.sinon.stub(fakeTaskManager, 'isActive').returns(true);
      this.sinon.stub(fakeAttentionWindowManager, 'isActive').returns(true);
      this.sinon.stub(fakeRocketbar,
        'respondToHierarchyEvent').returns(true);
      this.sinon.stub(fakeSystemDialogManager,
        'respondToHierarchyEvent').returns(true);
      this.sinon.stub(fakeActionMenu,
        'respondToHierarchyEvent').returns(true);
      this.sinon.stub(fakeAppWindowManager,
        'respondToHierarchyEvent').returns(false);
      this.sinon.stub(fakeTaskManager,
        'respondToHierarchyEvent').returns(true);
      this.sinon.stub(fakeAttentionWindowManager,
        'respondToHierarchyEvent').returns(true);
      var homeEvt = new CustomEvent('home');
      window.dispatchEvent(homeEvt);
      assert.isTrue(fakeAttentionWindowManager
        .respondToHierarchyEvent.calledWith(homeEvt));
      assert.isTrue(fakeRocketbar
        .respondToHierarchyEvent.calledWith(homeEvt));
      assert.isTrue(fakeSystemDialogManager
        .respondToHierarchyEvent.calledWith(homeEvt));
      assert.isTrue(fakeActionMenu
        .respondToHierarchyEvent.calledWith(homeEvt));
      assert.isTrue(fakeAppWindowManager
        .respondToHierarchyEvent.calledWith(homeEvt));
      assert.isFalse(fakeTaskManager
        .respondToHierarchyEvent.calledWith(homeEvt));
    });

    test('Should skip broadcasting if an module is inactive', function() {
      this.sinon.stub(fakeRocketbar, 'isActive').returns(true);
      this.sinon.stub(fakeSystemDialogManager, 'isActive').returns(true);
      this.sinon.stub(fakeAppWindowManager, 'isActive').returns(false);
      this.sinon.stub(fakeActionMenu, 'isActive').returns(true);
      this.sinon.stub(fakeTaskManager, 'isActive').returns(true);
      this.sinon.stub(fakeAttentionWindowManager, 'isActive').returns(true);
      this.sinon.stub(fakeRocketbar,
        'respondToHierarchyEvent').returns(true);
      this.sinon.stub(fakeSystemDialogManager,
        'respondToHierarchyEvent').returns(true);
      this.sinon.stub(fakeAppWindowManager,
        'respondToHierarchyEvent').returns(false);
      this.sinon.stub(fakeTaskManager,
        'respondToHierarchyEvent').returns(true);
      this.sinon.stub(fakeActionMenu,
        'respondToHierarchyEvent').returns(true);
      this.sinon.stub(fakeAttentionWindowManager,
        'respondToHierarchyEvent').returns(true);
      var homeEvt = new CustomEvent('home');
      window.dispatchEvent(homeEvt);
      assert.isTrue(fakeAttentionWindowManager
        .respondToHierarchyEvent.calledWith(homeEvt));
      assert.isTrue(fakeRocketbar
        .respondToHierarchyEvent.calledWith(homeEvt));
      assert.isTrue(fakeActionMenu
        .respondToHierarchyEvent.calledWith(homeEvt));
      assert.isTrue(fakeSystemDialogManager
        .respondToHierarchyEvent.calledWith(homeEvt));
      assert.isFalse(fakeAppWindowManager
        .respondToHierarchyEvent.calledWith(homeEvt));
      assert.isTrue(fakeTaskManager
        .respondToHierarchyEvent.calledWith(homeEvt));
    });

    test('Deliver to the last person in the list if not catched',
      function() {
      this.sinon.stub(fakeRocketbar, 'isActive').returns(false);
      this.sinon.stub(fakeSystemDialogManager, 'isActive').returns(false);
      this.sinon.stub(fakeAppWindowManager, 'isActive').returns(false);
      this.sinon.stub(fakeTaskManager, 'isActive').returns(false);
      this.sinon.stub(fakeActionMenu, 'isActive').returns(false);
      this.sinon.stub(fakeAttentionWindowManager, 'isActive').returns(false);
      this.sinon.stub(fakeRocketbar,
        'respondToHierarchyEvent').returns(true);
      this.sinon.stub(fakeSystemDialogManager,
        'respondToHierarchyEvent').returns(true);
      this.sinon.stub(fakeAppWindowManager,
        'respondToHierarchyEvent').returns(true);
      this.sinon.stub(fakeTaskManager,
        'respondToHierarchyEvent').returns(true);
      this.sinon.stub(fakeActionMenu,
        'respondToHierarchyEvent').returns(true);
      this.sinon.stub(fakeAttentionWindowManager,
        'respondToHierarchyEvent').returns(true);
      var holdhomeEvt = new CustomEvent('holdhome');
      window.dispatchEvent(holdhomeEvt);
      assert.isFalse(fakeAttentionWindowManager
        .respondToHierarchyEvent.calledWith(holdhomeEvt));
      assert.isFalse(fakeRocketbar
        .respondToHierarchyEvent.calledWith(holdhomeEvt));
      assert.isFalse(fakeSystemDialogManager
        .respondToHierarchyEvent.calledWith(holdhomeEvt));
      assert.isFalse(fakeActionMenu
        .respondToHierarchyEvent.calledWith(holdhomeEvt));
      assert.isFalse(fakeAppWindowManager
        .respondToHierarchyEvent.calledWith(holdhomeEvt));
      assert.isTrue(fakeTaskManager
        .respondToHierarchyEvent.calledWith(holdhomeEvt));
      });
  });
});
