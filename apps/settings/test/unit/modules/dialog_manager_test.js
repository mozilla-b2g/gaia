suite('DialogManager > ', function() {
  'use strict';

  var mockLazyLoader;
  var mockPanelCache;
  var dialogManager;
  var mockSpatialNavigationHelper, realSpatialNavigationHelper;

  var map = {
    '*': {
      'modules/panel_cache': 'PanelCache',
      'shared/lazy_loader': 'shared_mocks/mock_lazy_loader',
      'spatial_navigation_helper': 'unit/mock_spatial_navigation_helper',
    }
  };

  setup(function(done) {
    define('PanelCache', function() {
      return {
        reset: function() {},
        get: function() {}
      };
    });

    testRequire([
      'PanelCache',
      'shared_mocks/mock_lazy_loader',
      'modules/dialog_manager',
      'spatial_navigation_helper'
    ], map, function(MockPanelCache, MockLazyLoader, DialogManager,
      MockSpatialNavigationHelper) {
      mockPanelCache = MockPanelCache;
      mockLazyLoader = MockLazyLoader;
      dialogManager = DialogManager;
      mockSpatialNavigationHelper = MockSpatialNavigationHelper;
      done();
    });
  });

  suite('_transit', function() {
    var panel;
    var dialog;
    var clock;

    setup(function() {
      clock = this.sinon.useFakeTimers();
      panel = document.createElement('div');
      dialog = {
        panel: panel
      };
      this.sinon.spy(panel, 'addEventListener');
      this.sinon.spy(panel, 'removeEventListener');
    });

    test('to open', function(done) {
      dialogManager._transit('open', dialog).then(function() {
        clock.tick(150);
        assert.isTrue(dialog.panel.classList.contains('current'));
        assert.isTrue(dialog.panel.removeEventListener.called);
      }).then(done, done);

      panel.addEventListener.getCall(0).args[1]({
        propertyName: 'visibility'
      });
    });

    test('to close', function(done) {
      dialogManager._transit('close', dialog).then(function() {
        clock.tick(150);
        assert.isFalse(dialog.panel.classList.contains('current'));
        assert.isTrue(dialog.panel.removeEventListener.called);
      }).then(done, done);

      panel.addEventListener.getCall(0).args[1]({
        propertyName: 'visibility'
      });
    });
  });

  suite('_open', function() {
    var dialog;
    var panel;
    var spySNHMakeFocusable, spySNHFocus;
    setup(function() {
      realSpatialNavigationHelper = window.SpatialNavigationHelper;
      window.SpatialNavigationHelper = mockSpatialNavigationHelper;
      spySNHMakeFocusable =
        this.sinon.spy(window.SpatialNavigationHelper, 'makeFocusable');
      spySNHFocus =
        this.sinon.spy(window.SpatialNavigationHelper, 'focus');

      panel = {
        beforeShow: function() {
          return Promise.resolve();
        },
        show: function() {
          return Promise.resolve();
        }
      };

      dialog = {
        init: this.sinon.stub(),
        initUI: this.sinon.stub(),
        bindEvents: this.sinon.stub(),
        spatialNavigationId: 'SN_ID',
        panel: panel
      };

      this.sinon.stub(dialogManager, '_loadPanel', function() {
        return Promise.resolve();
      });

      this.sinon.stub(dialogManager, '_getPanel', function() {
        return panel;
      });

      this.sinon.stub(dialogManager, '_transit', function() {
        return Promise.resolve();
      });
    });

    teardown(function() {
      window.SpatialNavigationHelper = realSpatialNavigationHelper;
    });

    test('we would follow the calling sequence', function(done) {
      dialogManager._open(dialog).then(function() {
        assert.isTrue(dialog.initUI.called);
        assert.isTrue(dialog.bindEvents.called);
        assert.isTrue(spySNHMakeFocusable.calledOnce);
        assert.isTrue(spySNHFocus.calledOnce);
      }).then(done, done);
    });
  });

  suite('_close', function() {
    var dialog;
    var panel;
    var options;
    var result;
    var spySNHMakeFocusable, spySNHFocus, spySNHRemove;

    setup(function() {
      realSpatialNavigationHelper = window.SpatialNavigationHelper;
      window.SpatialNavigationHelper = mockSpatialNavigationHelper;
      spySNHMakeFocusable =
        this.sinon.spy(window.SpatialNavigationHelper, 'makeFocusable');
      spySNHFocus =
        this.sinon.spy(window.SpatialNavigationHelper, 'focus');
      spySNHRemove =
        this.sinon.spy(window.SpatialNavigationHelper, 'remove');

      options = {
        _type: 'submit'
      };

      panel = {
        beforeHide: function() {
          return Promise.resolve();
        },
        onSubmit: function() {
          return Promise.resolve(result);
        },
        onCancel: function() {
          return Promise.resolve(result);
        },
        hide: function() {
          return Promise.resolve();
        }
      };

      dialog = {
        panel: panel,
        cleanup: this.sinon.stub(),
        spatialNavigationId: 'SN_ID',
        getResult: function() {
          return result;
        },
      };

      this.sinon.stub(dialogManager, '_loadPanel', function() {
        return Promise.resolve();
      });

      this.sinon.stub(dialogManager, '_getPanel', function() {
        return panel;
      });

      this.sinon.stub(dialogManager, '_transit', function() {
        return Promise.resolve();
      });
    });

    teardown(function() {
      window.SpatialNavigationHelper = realSpatialNavigationHelper;
    });

    test('we would follow the calling sequence', function(done) {
      dialogManager._close(dialog, options).then(function() {
        assert.isTrue(dialog.cleanup.called);
        assert.isTrue(spySNHMakeFocusable.calledOnce);
        assert.isTrue(spySNHFocus.calledOnce);
        assert.isTrue(spySNHRemove.calledOnce);
      }).then(done, done);
    });

    test('if validation failed, we would call reject', function(done) {
      panel.onSubmit = function() {
        return Promise.reject();
      };

      dialogManager._close(dialog, options).then(function() {
        // This should not be called
        assert.isTrue(false);
      }, function() {
        // we will get rejected here
        assert.isTrue(true);
      }).then(done, done);
    });

    test('if dialog is not a prompt, we would get result from hide',
      function(done) {
        result = 'This is a result from panel.hide()';
        dialogManager._close(dialog, options).then(function(gotResult) {
          assert.equal(gotResult, result);
        }).then(done, done);
    });

    test('if dialog is a prompt, we would get result', function(done) {
      dialog.DIALOG_CLASS = 'prompt-dialog';
      result = 'This is a result from dialog.getResult()';
      dialogManager._close(dialog, options).then(function(gotResult) {
        assert.equal(gotResult, result);
      }).then(done, done);
    });

    test('if submit button is clicked, onSubmit will get called',
      function(done) {
        options._type = 'submit';
        this.sinon.spy(panel, 'onSubmit');
        dialogManager._close(dialog, options).then(function() {
          assert.ok(panel.onSubmit.called);
        }).then(done, done);
    });

    test('if cancel button is clicked, onCancel will get called',
      function(done) {
        options._type = 'cancel';
        this.sinon.spy(panel, 'onCancel');
        dialogManager._close(dialog, options).then(function() {
          assert.ok(panel.onCancel.called);
        }).then(done, done);
    });
  });
});
