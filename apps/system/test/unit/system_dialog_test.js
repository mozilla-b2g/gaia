'use strict';
/* global MocksHelper, SystemDialog, MockService */

requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_layout_manager.js');
requireApp('system/test/unit/mock_system_dialog_manager.js');
requireApp('system/test/unit/mock_keyboard_manager.js');
requireApp('system/shared/test/unit/mocks/mock_service.js');

var mocksForSystemDialog = new MocksHelper([
  'AppWindowManager',
  'LayoutManager',
  'SystemDialogManager',
  'KeyboardManager',
  'Service'
]).init();

suite('system/SystemDialog', function() {
  var stubById, stubDispatch,
      fakeOptions = {
        onShow: function() {},
        onHide: function() {}
      },
      fakeCustomID = 'system-dialog';
  mocksForSystemDialog.attachTestHelpers();

  setup(function(done) {
    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    stubDispatch = this.sinon.stub(window, 'dispatchEvent');
    requireApp('system/js/base_ui.js');
    requireApp('system/js/system_dialog.js', done);

    MockService.mockQueryWith('LayoutManager.height', 320);
    MockService.mockQueryWith('StatusBar.height', 30);
  });

  teardown(function() {
    stubById.restore();
    stubDispatch.restore();
    window.layoutManager = null;
  });

  suite('Handle events', function() {
    test('Create system dialog would trigger events', function() {
      var systemDialog = new window.SystemDialog(fakeOptions);
      assert.isTrue(stubDispatch.calledWithMatch(sinon.match(
          function(e) {
            return 'system-dialog-created' === e.type;
          })),
        'the event has not been fired');
      systemDialog = null;
    });

    test('Show system dialog would trigger events', function() {
      var systemDialog = new window.SystemDialog(fakeOptions);
      systemDialog.customID = fakeCustomID;
      var stubOnShow = this.sinon.stub(systemDialog, 'onShow');
      var stubUpdateHeight = this.sinon.stub(systemDialog, 'updateHeight');
      systemDialog.show();
      // Check element is hidden or not.
      assert.isFalse(systemDialog.element.hidden,
        'the element style hidden is not equal to "false" after show a dialog');
      // Check element is contained its id or not.
      var isContainCustomID =
        systemDialog.element.classList.contains(fakeCustomID);
      assert.isTrue(isContainCustomID,
        'the customID was not in element stylesheet after show a dialog');
      // Check "onShow" function is called or not.
      assert.isTrue(stubOnShow.called,
        'the dialog was not "onShow" after show a dialog');
      // Check "updateHeight" function is called or not.
      assert.isTrue(stubUpdateHeight.called,
        'the dialog was not "updateHeight" after show a dialog');
      // Check "system-dialog-show" event is fired or not.
      assert.isTrue(stubDispatch.calledWithMatch(sinon.match(
          function(e) {
            return 'system-dialog-show' === e.type;
          })),
        'the event has not been fired');
    });

    test('Hide system dialog would trigger events', function() {
      var systemDialog = new window.SystemDialog(fakeOptions);
      systemDialog.customID = fakeCustomID;
      var stubOnHide = this.sinon.stub(systemDialog, 'onHide');
      systemDialog.hide();
      // Check element is hidden or not.
      assert.isTrue(systemDialog.element.hidden,
        'the element style hidden is not equal to "True" after hide a dialog');
      // Check element is contained its id or not.
      var isContainCustomID =
        systemDialog.element.classList.contains(fakeCustomID);
      assert.isFalse(isContainCustomID,
        'the customID was in element stylesheet after hide a dialog');
      // Check "onHide" function is called or not.
      assert.isTrue(stubOnHide.called,
        'the dialog was not "onHide" after hide a dialog');
      // Check "system-dialog-hide" event is fired or not.
      assert.isTrue(stubDispatch.calledWithMatch(sinon.match(
          function(e) {
            return 'system-dialog-hide' === e.type;
          })),
        'the event has not been fired');
    });

    test('The attribute "onShow" should be called with reason ' +
         'after system dialog is shown.', function() {
      var systemDialog = new window.SystemDialog(fakeOptions);
      var stubOnShowCallback = this.sinon.stub(systemDialog.options, 'onShow');
      var fakeReason = null;
      systemDialog.onShow(fakeReason);
      assert.isTrue(stubOnShowCallback.calledWith(null));
    });

    test('The attribute "onHide" should be called with reason ' +
         'after system dialog is hidden.', function() {
      var systemDialog = new window.SystemDialog(fakeOptions);
      var stubOnHideCallback = this.sinon.stub(systemDialog.options, 'onHide');
      var fakeReason = 'home';
      systemDialog.onHide(fakeReason);
      assert.isTrue(stubOnHideCallback.calledWith('home'));
    });
  });

  suite('Resize functions', function() {
    var isCalled;

    setup(function(done) {
      isCalled = false;
      Object.defineProperty(SystemDialog.prototype.containerElement.style,
        'height', {
        configurable: true,
        set: function() {
          isCalled = true;
        }
      });
      done();
    });

    teardown(function() {
      delete SystemDialog.prototype.containerElement.style.height;
    });

    test('The dialog height should be updated ' +
         'while "updateHeight()" called.', function() {
      var systemDialog = new window.SystemDialog(fakeOptions);
      systemDialog.updateHeight();
      assert.isTrue(isCalled);
    });

    test('The dialog height should be updated ' +
         'while resize request is coming.', function() {
      var systemDialog = new window.SystemDialog(fakeOptions);
      systemDialog.resize();
      assert.isTrue(isCalled);
    });
  });
});


