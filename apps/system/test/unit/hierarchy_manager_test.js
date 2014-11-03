/* global MocksHelper, BaseModule */
'use strict';

require('/shared/test/unit/mocks/mock_system.js');

var mocksForHierarchyManager = new MocksHelper([
  'System'
]).init();

suite('system/HierarchyManager', function() {
  var hierarchyManager, fakeAppWindowManager, fakeSimLockDialogManager;
  mocksForHierarchyManager.attachTestHelpers();

  setup(function(done) {
    requireApp('system/js/base_module.js');
    requireApp('system/js/hierarchy_manager.js', done);
  });

  suite('focus request', function() {
    setup(function() {
      fakeAppWindowManager = {
        name: 'fakeAppWindowManager',
        HIERARCHY_PRIORITY: 10,
        isActive: function() {},
        focus: function() {}
      };
      fakeSimLockDialogManager = {
        name: 'fakeSimLockDialogManager',
        HIERARCHY_PRIORITY: 11,
        isActive: function() {},
        focus: function() {}
      };
      hierarchyManager = BaseModule.instantiate('HierarchyManager');
      hierarchyManager.start();
    });

    teardown(function() {
      hierarchyManager.stop();
    });

    test('low priority module requests to be focused', function() {
      var stubFocus = this.sinon.stub(fakeAppWindowManager, 'focus');
      this.sinon.stub(fakeAppWindowManager, 'isActive').returns(true);
      this.sinon.stub(fakeSimLockDialogManager, 'isActive').returns(true);
      hierarchyManager.addHierarchy(fakeAppWindowManager);
      hierarchyManager.addHierarchy(fakeSimLockDialogManager);
      hierarchyManager.focus(fakeAppWindowManager);
      assert.isFalse(stubFocus.called);
    });

    test('high priority module requests to be focused', function() {
      var stubFocus = this.sinon.stub(fakeSimLockDialogManager, 'focus');
      this.sinon.stub(fakeAppWindowManager, 'isActive').returns(true);
      this.sinon.stub(fakeSimLockDialogManager, 'isActive').returns(true);
      hierarchyManager.addHierarchy(fakeAppWindowManager);
      hierarchyManager.addHierarchy(fakeSimLockDialogManager);
      hierarchyManager.focus(fakeSimLockDialogManager);
      assert.isTrue(stubFocus.called);
    });
  });
  suite('removeHierarchy', function() {
    setup(function() {
      fakeAppWindowManager = {
        name: 'fakeAppWindowManager',
        HIERARCHY_PRIORITY: 10,
        isActive: function() {}
      };
      hierarchyManager = BaseModule.instantiate('HierarchyManager');
      hierarchyManager.start();
    });

    teardown(function() {
      hierarchyManager.stop();
    });

    test('unwatch the hierarchy',
      function() {
        hierarchyManager.addHierarchy(fakeAppWindowManager);
        hierarchyManager.removeHierarchy(fakeAppWindowManager);
        assert.equal(hierarchyManager._ui_list.length, 0);
      });
  });

  suite('addHierarchy', function() {
    setup(function() {
      fakeAppWindowManager = {
        name: 'fakeAppWindowManager',
        HIERARCHY_PRIORITY: 10,
        isActive: function() {}
      };
      fakeSimLockDialogManager = {
        name: 'fakeSimLockDialogManager',
        HIERARCHY_PRIORITY: 11,
        isActive: function() {}
      };
      hierarchyManager = BaseModule.instantiate('HierarchyManager');
      hierarchyManager.start();
    });

    teardown(function() {
      hierarchyManager.stop();
    });

    test('No watching modules are active',
      function() {
        var stubPublish = this.sinon.stub(hierarchyManager, 'publish');
        this.sinon.stub(fakeAppWindowManager, 'isActive').returns(false);
        this.sinon.stub(fakeSimLockDialogManager, 'isActive').returns(false);
        hierarchyManager.addHierarchy(fakeAppWindowManager);
        assert.equal(hierarchyManager._topMost, null);
        assert.isFalse(stubPublish.called);
        hierarchyManager.addHierarchy(fakeSimLockDialogManager);
        assert.equal(hierarchyManager._topMost, null);
        assert.isFalse(stubPublish.called);
      });

    test('Only appWindowManager is active',
      function() {
        var stubPublish = this.sinon.stub(hierarchyManager, 'publish');
        this.sinon.stub(fakeAppWindowManager, 'isActive').returns(true);
        this.sinon.stub(fakeSimLockDialogManager, 'isActive').returns(false);
        hierarchyManager.addHierarchy(fakeAppWindowManager);
        assert.equal(hierarchyManager._topMost, fakeAppWindowManager);
        assert.isTrue(stubPublish.calledWith('changed'));
        hierarchyManager.addHierarchy(fakeSimLockDialogManager);
        assert.equal(hierarchyManager._topMost, fakeAppWindowManager);
        assert.isTrue(stubPublish.calledOnce);
      });

    test('Only simLockDialogManager is active',
      function() {
        var stubPublish = this.sinon.stub(hierarchyManager, 'publish');
        this.sinon.stub(fakeAppWindowManager, 'isActive').returns(false);
        this.sinon.stub(fakeSimLockDialogManager, 'isActive').returns(true);
        hierarchyManager.addHierarchy(fakeAppWindowManager);
        assert.equal(hierarchyManager._topMost, null);
        assert.isFalse(stubPublish.called);
        hierarchyManager.addHierarchy(fakeSimLockDialogManager);
        assert.equal(hierarchyManager._topMost, fakeSimLockDialogManager);
        assert.isTrue(stubPublish.calledWith('changed'));
      });

    test('Both are active',
      function() {
        var stubPublish = this.sinon.stub(hierarchyManager, 'publish');
        this.sinon.stub(fakeAppWindowManager, 'isActive').returns(true);
        this.sinon.stub(fakeSimLockDialogManager, 'isActive').returns(true);
        hierarchyManager.addHierarchy(fakeAppWindowManager);
        assert.equal(hierarchyManager._topMost, fakeAppWindowManager);
        assert.isTrue(stubPublish.calledWith('changed'));
        hierarchyManager.addHierarchy(fakeSimLockDialogManager);
        assert.equal(hierarchyManager._topMost, fakeSimLockDialogManager);
        assert.isTrue(stubPublish.calledTwice);
      });
  });
});
