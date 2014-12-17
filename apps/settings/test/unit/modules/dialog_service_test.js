suite('DialogService > ', function() {
  'use strict';

  var mockSettings;
  var mockDialogManager;
  var dialogService;

  var modules = [
    'unit/mock_settings',
    'DialogManager',
    'modules/dialog_service'
  ];

  var map = {
    '*': {
      'modules/dialog/panel_dialog': 'Panel',
      'modules/dialog/alert_dialog': 'Panel',
      'modules/dialog/confirm_dialog': 'Panel',
      'modules/dialog/prompt_dialog': 'Panel',
      'modules/defer': 'Defer',
      'modules/dialog_manager': 'DialogManager',
      'settings': 'unit/mock_settings'
    }
  };

  setup(function(done) {
    define('Panel', function() {
      return function() {
        return {};
      };
    });

    define('Defer', function() {
      return function() {
        var defer = {};
        defer.promise = new Promise(function(resolve, reject) {
          defer.resolve = resolve;
          defer.reject = reject;
        });
        return defer;
      };
    });

    define('DialogManager', function() {
      return {
        open: function() {},
        close: function() {}  
      };
    });

    var requireCtx = testRequire([], map, function() {});
    requireCtx(modules,
      function(MockSettings, MockDialogManager, DialogService) {
        mockSettings = MockSettings;
        mockDialogManager = MockDialogManager;
        dialogService = DialogService;
        done();
    });
  });

  suite('show', function() {
    var panelId;
    var userOptions;

    setup(function() {
      panelId = 'fakePanelId';
      userOptions = {};
    });

    suite('when navigating', function() {
      setup(function() {
        dialogService._navigating = true;
        Promise.resolve(dialogService.show(panelId, userOptions));
      });

      test('We will catch the defer object', function() {
        var pendingRequest = dialogService._pendingRequests.pop();
        assert.equal(pendingRequest.panelId, panelId);
        assert.equal(pendingRequest.userOptions, userOptions);
      });
    });

    suite('not navigating, but there is already one same dialog', function() {
      setup(function() {
        mockSettings.currentPanel = '#' + panelId;
        dialogService._navigating = false;
      });

      test('We will reject directly', function(done) {
        dialogService.show(panelId, userOptions)
        .then(function() {
          // this line should not be executed
          assert.isTrue(false);
        }, function(reason) {
          assert.equal(reason, 'You are showing the same panel #' + panelId);
        }).then(done, done);
      });
    });

    suite('not navigating, would open dialog', function() {
      setup(function() {
        this.sinon.stub(document, 'getElementById', function() {
          return document.createElement('div');
        });
        this.sinon.stub(mockDialogManager, 'open');
        this.sinon.stub(mockDialogManager, 'close');
        dialogService._navigating = false;
        dialogService.show(panelId, userOptions);
      });

      test('will do following works', function() {
        assert.isTrue(dialogService._navigating);
        assert.isTrue(mockDialogManager.open.called);
      });
    });

    suite('not navigating, would open dialog. If click on cancel button',
      function() {
        var promise;
        var resolvedResult = 'Fake Result';

        setup(function() {
          this.sinon.stub(dialogService, '_execPendingRequest');
          this.sinon.stub(document, 'getElementById', function() {
            return document.createElement('div');
          });
          this.sinon.stub(mockDialogManager, 'close', function() {
            return Promise.resolve(resolvedResult);
          });
          dialogService._navigating = false;
          promise = dialogService.show(panelId, userOptions);
          userOptions.onWrapCancel();
        });

        test('will do following works', function(done) {
          promise.then(function(result) {
            assert.equal(result.type, 'cancel');
            assert.equal(result.value, resolvedResult);
            assert.isTrue(dialogService._execPendingRequest.called);
            assert.isFalse(dialogService._navigating);
          }, function() {
            assert.isTrue(false);
          }).then(done, done);
        });
    });

    suite('not navigating, would open dialog. If click on submit button',
      function() {
        var promise;
        var resolvedResult = 'Fake Result';

        setup(function() {
          this.sinon.stub(dialogService, '_execPendingRequest');
          this.sinon.stub(document, 'getElementById', function() {
            return document.createElement('div');
          });
          this.sinon.stub(mockDialogManager, 'close', function() {
            return Promise.resolve(resolvedResult);
          });
          dialogService._navigating = false;
          promise = dialogService.show(panelId, userOptions);
          userOptions.onWrapSubmit();
        });

        test('will do following works', function(done) {
          promise.then(function(result) {
            assert.equal(result.type, 'submit');
            assert.equal(result.value, resolvedResult);
            assert.isTrue(dialogService._execPendingRequest.called);
            assert.isFalse(dialogService._navigating);
          }, function() {
            assert.isTrue(false);
          }).then(done, done);
        });
    });
  });
});
