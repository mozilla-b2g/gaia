'use strict';
/* global MocksHelper, SimPinSystemDialog, LayoutManager */

requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_layout_manager.js');
requireApp('system/test/unit/mock_system_dialog_manager.js');
requireApp('system/test/unit/mock_keyboard_manager.js');

var mocksForSystemSimPinDialog = new MocksHelper([
  'AppWindowManager',
  'LayoutManager',
  'SystemDialogManager',
  'KeyboardManager'
]).init();

suite('system/SimPinSystemDialog', function() {
  var stubById, stubDispatch,
      fakeOptions = {
        onShow: function() {},
        onHide: function() {}
      };
  mocksForSystemSimPinDialog.attachTestHelpers();

  setup(function(done) {
    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    stubDispatch = this.sinon.stub(window, 'dispatchEvent');
    requireApp('system/js/service.js');
    requireApp('system/js/base_ui.js');
    requireApp('system/js/system_dialog.js');
    requireApp('system/js/system_simcard_dialog.js', done);
    window.layoutManager = new LayoutManager();
  });

  teardown(function() {
    window.layoutManager = null;
    stubById.restore();
    stubDispatch.restore();
  });

  suite('Handle events', function() {
    test('Create system dialog would trigger events', function() {
      var simPinSystemDialog = new window.SimPinSystemDialog(fakeOptions);
      assert.isTrue(stubDispatch.calledWithMatch(sinon.match(
          function(e) {
            return 'system-dialog-created' === e.type;
          })),
        'the event has not been fired');
      simPinSystemDialog = null;
    });

    test('Show system dialog would trigger events', function() {
      var simPinSystemDialog = new window.SimPinSystemDialog(fakeOptions);
      simPinSystemDialog.show();
      assert.isTrue(stubDispatch.calledWithMatch(sinon.match(
          function(e) {
            return 'system-dialog-show' === e.type;
          })),
        'the event has not been fired');
    });

    test('Hide system dialog would trigger events', function() {
      var simPinSystemDialog = new window.SimPinSystemDialog(fakeOptions);
      simPinSystemDialog.hide();
      assert.isTrue(stubDispatch.calledWithMatch(sinon.match(
          function(e) {
            return 'system-dialog-hide' === e.type;
          })),
        'the event has not been fired');
    });

    test('The attribute "onShow" should be called with reason ' +
         'after system dialog is shown.', function() {
      var simPinSystemDialog = new window.SimPinSystemDialog(fakeOptions);
      var stubOnShowCallback = this.sinon.stub(simPinSystemDialog.options,
                                               'onShow');
      var fakeReason = null;
      simPinSystemDialog.onShow(fakeReason);
      assert.isTrue(stubOnShowCallback.calledWith(null));
    });

    test('The attribute "onHide" should be called with reason ' +
         'after system dialog is hidden.', function() {
      var simPinSystemDialog = new window.SimPinSystemDialog(fakeOptions);
      var stubOnHideCallback = this.sinon.stub(simPinSystemDialog.options,
                                               'onHide');
      var fakeReason = 'home';
      simPinSystemDialog.onHide(fakeReason);
      assert.isTrue(stubOnHideCallback.calledWith('home'));
    });
  });

  suite('Create instance ID', function() {
    test('Create system simpin dialog ' +
         'would create instanceID = "simpin-dialog"', function() {
      var simPinSystemDialog = new window.SimPinSystemDialog(fakeOptions);
      assert.equal('simpin-dialog', simPinSystemDialog.instanceID);
    });
  });

  suite('Get element', function() {
    test('Create system simpin dialog would get dialog element.', function() {
      var simPinSystemDialog = new window.SimPinSystemDialog(fakeOptions);
      assert.isNotNull(simPinSystemDialog.element);
    });
  });

  suite('Resize functions', function() {
    var isCalled;

    setup(function(done) {
      isCalled = false;
      Object.defineProperty(SimPinSystemDialog.prototype.containerElement.style,
                            'height', {
                              configurable: true,
                              set: function() {
                                isCalled = true;
                              }
                            });
      done();
    });

    teardown(function() {
      delete SimPinSystemDialog.prototype.containerElement.style.height;
    });

    test('The dialog height should be updated ' +
         'while "updateHeight()" called.', function() {
      var simPinSystemDialog = new window.SimPinSystemDialog(fakeOptions);
      simPinSystemDialog.updateHeight();
      assert.isTrue(isCalled);
    });

    test('The dialog height should be updated ' +
         'while resize request is coming.', function() {
      var simPinSystemDialog = new window.SimPinSystemDialog(fakeOptions);
      simPinSystemDialog.resize();
      assert.isTrue(isCalled);
    });
  });
});


