'use strict';
/* global MocksHelper, FxAccountsDialog, SystemDialog, LayoutManager */

require('/test/unit/mock_app_window_manager.js');
require('/test/unit/mock_layout_manager.js');
require('/test/unit/mock_system_dialog_manager.js');
require('/test/unit/mock_keyboard_manager.js');
require('/js/service.js');
require('/js/base_ui.js');
require('/js/system_dialog.js');
require('/js/fxa_dialog.js');
requireApp('system/test/unit/mock_statusbar.js');

var mocksForFxAccountsDialog = new MocksHelper([
  'AppWindowManager',
  'LayoutManager',
  'SystemDialogManager',
  'KeyboardManager',
  'StatusBar'
]).init();

suite('system/FxAccountsDialog', function() {
  var stubDispatch, container,
      fakeOptions = {
        onShow: function() {},
        onHide: function() {}
      };
  mocksForFxAccountsDialog.attachTestHelpers();

  setup(function() {
    container = document.createElement('div');
    document.body.appendChild(container);
    SystemDialog.prototype.containerElement = container;

    stubDispatch = this.sinon.stub(window, 'dispatchEvent');

    window.layoutManager = new LayoutManager();
  });

  teardown(function() {
    document.body.removeChild(container);
    SystemDialog.prototype.containerElement = container = null;

    stubDispatch.restore();

    window.layoutManager = null;
  });

  suite('Handle events', function() {
    test('Create system dialog would trigger events', function() {
      var fxAccountsDialog = new window.FxAccountsDialog(fakeOptions);
      assert.isTrue(stubDispatch.calledWithMatch(sinon.match(
          function(e) {
            return 'system-dialog-created' === e.type;
          })),
        'the event has not been fired');
      fxAccountsDialog = null;
    });

    test('Show system dialog would trigger events', function() {
      var fxAccountsDialog = new window.FxAccountsDialog(fakeOptions);
      fxAccountsDialog.show();
      assert.isTrue(stubDispatch.calledWithMatch(sinon.match(
          function(e) {
            return 'system-dialog-show' === e.type;
          })),
        'the event has not been fired');
    });

    test('Hide system dialog would trigger events', function() {
      var fxAccountsDialog = new window.FxAccountsDialog(fakeOptions);
      fxAccountsDialog.hide();
      assert.isTrue(stubDispatch.calledWithMatch(sinon.match(
          function(e) {
            return 'system-dialog-hide' === e.type;
          })),
        'the event has not been fired');
    });

    test('The attribute "onShow" should be called with reason ' +
         'after system dialog is shown.', function() {
      var fxAccountsDialog = new window.FxAccountsDialog(fakeOptions);
      var stubOnShowCallback = this.sinon.stub(fxAccountsDialog.options,
                                               'onShow');
      var fakeReason = null;
      fxAccountsDialog.onShow(fakeReason);
      assert.isTrue(stubOnShowCallback.calledWith(null));
    });

    test('The attribute "onHide" should be called with reason ' +
         'after system dialog is hidden.', function() {
      var fxAccountsDialog = new window.FxAccountsDialog(fakeOptions);
      var stubOnHideCallback = this.sinon.stub(fxAccountsDialog.options,
                                               'onHide');
      var fakeReason = 'home';
      fxAccountsDialog.onHide(fakeReason);
      assert.isTrue(stubOnHideCallback.calledWith('home'));
    });
  });

  suite('Create instance ID', function() {
    test('Create system Firefox accounts dialog ' +
         'would create instanceID = "fxa-dialog"', function() {
      var fxAccountsDialog = new window.FxAccountsDialog(fakeOptions);
      assert.equal('fxa-dialog', fxAccountsDialog.instanceID);
    });
  });

  suite('Get element', function() {
    test('Return element while called getView() function', function() {
      var fxAccountsDialog = new window.FxAccountsDialog(fakeOptions);
      var stubGetView = this.sinon.stub(fxAccountsDialog, 'getView');
      fxAccountsDialog.getView();
      assert.isTrue(stubGetView.called);
    });

    test('Create system Firefox accounts dialog ' +
         'would get dialog element.', function() {
      var fxAccountsDialog = new window.FxAccountsDialog(fakeOptions);
      assert.isNotNull(fxAccountsDialog.element);
    });

    test('Created system dialog should be hidden', function() {
      var fxAccountsDialog = new window.FxAccountsDialog(fakeOptions);
      assert.isTrue(fxAccountsDialog.element.hidden,
        'Element is created hidden.');
    });
  });

  suite('Resize functions', function() {
    var isCalled;

    setup(function(done) {
      isCalled = false;
      Object.defineProperty(FxAccountsDialog.prototype.containerElement.style,
                            'height', {
                              configurable: true,
                              set: function() {
                                isCalled = true;
                              }
                            });
      done();
    });

    teardown(function() {
      delete FxAccountsDialog.prototype.containerElement.style.height;
    });

    test('The dialog height should be updated ' +
         'while "updateHeight()" called.', function() {
      var fxAccountsDialog = new window.FxAccountsDialog(fakeOptions);
      fxAccountsDialog.updateHeight();
      assert.isTrue(isCalled);
    });

    test('The dialog height should be updated ' +
         'while resize request is coming.', function() {
      var fxAccountsDialog = new window.FxAccountsDialog(fakeOptions);
      fxAccountsDialog.resize();
      assert.isTrue(isCalled);
    });
  });
});


