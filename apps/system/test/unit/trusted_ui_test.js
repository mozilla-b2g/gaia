/*global TrustedUIManager, MockAppWindow, MockTaskManager, MockService,
         MockInputWindowManager, MockStatusBar, MocksHelper,
         inputWindowManager */

'use strict';
require('/test/unit/mock_app_window.js');
require('/test/unit/mock_task_manager.js');
require('/test/unit/mock_input_window_manager.js');
requireApp('system/test/unit/mock_statusbar.js');
requireApp('system/shared/test/unit/mocks/mock_service.js');

var mocksForBrowser = new MocksHelper([
  'AppWindow',
  'InputWindowManager',
  'TaskManager',
  'Service',
  'StatusBar'
]).init();

suite('system/TrustedUIManager', function() {
  mocksForBrowser.attachTestHelpers();

  var fakeAppConfig = {
    url: 'app://www.fake/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake/ManifestURL',
    origin: 'app://www.fake'
  };

  var fakeApp, realTaskManager, realInputWindowManager;
  var initElementIds = ['dialog-overlay', 'trustedui-container',
      'trustedui-inner', 'trustedui-frame-container', 'trustedui-title',
      'screen', 'statusbar-loading', 'trustedui-throbber', 'trustedui-header',
      'trustedui-error-title', 'trustedui-error-message',
      'trustedui-error-close'];

  function attachElements(elementsIdNames) {
    for (var i = 0; i < elementsIdNames.length; i++) {
      var element = document.createElement('div');
      element.id = elementsIdNames[i];
      document.body.appendChild(element);
    }
  }

  function deAttachElements(elementsIdNames) {
    for (var i = 0; i < elementsIdNames.length; i++) {
      var element = document.getElementById(elementsIdNames[i]);
      document.body.removeChild(element);
    }
  }

  suiteSetup(function(done) {
    window.TrustedUiValueSelector = function() {};
    window.TrustedUiValueSelector.prototype.start = function() {};

    realTaskManager = window.taskManager;
    window.taskManager = new MockTaskManager();
    realInputWindowManager = window.inputWindowManager;
    window.inputWindowManager = new MockInputWindowManager();
    fakeApp = new MockAppWindow(fakeAppConfig);

    MockService.currentApp = fakeApp;
    attachElements(initElementIds);
    window.TrustedUIManager = null;
    requireApp('system/js/trusted_ui.js', done);
  });

  suiteTeardown(function() {
    window.TrustedUiValueSelector = null;
    window.inputWindowManager = realInputWindowManager;
    window.taskManager = realTaskManager;
    deAttachElements(initElementIds);
    TrustedUIManager.stop();
  });

  setup(function() {
    TrustedUIManager.start();
  });

  teardown(function() {
    TrustedUIManager.stop();
  });

  suite('TrustedUI/open', function() {
    test('currentStack is not empty', function() {
      TrustedUIManager._dialogStacks['app://www.fake'] = ['testdialog'];
      TrustedUIManager._lastDisplayedApp = fakeApp;

      var stubScreenLock = this.sinon.stub(screen, 'mozLockOrientation');
      var stubHideAllFrames = this.sinon.stub(TrustedUIManager,
        '_hideAllFrames');
      var stubMakeDialogHidden = this.sinon.stub(TrustedUIManager,
        '_makeDialogHidden');
      var stubPushNewDialog = this.sinon.stub(TrustedUIManager,
        '_pushNewDialog');
      var stubGetTopDialogResult = 'getTopDialogFakeResult';
      this.sinon.stub(TrustedUIManager, '_getTopDialog')
        .returns(stubGetTopDialogResult);
      TrustedUIManager.open('appName', 'testFrame', 'testChromeEventId',
        'testOnCancelCB');

      assert.isTrue(stubScreenLock.calledWith('portrait'));
      assert.isTrue(stubHideAllFrames.calledOnce);
      assert.isTrue(stubMakeDialogHidden.calledWith(stubGetTopDialogResult));
      assert.isTrue(stubPushNewDialog.calledWith('appName', 'testFrame',
        'testChromeEventId', 'testOnCancelCB'));

    });

    test('currentStack is empty', function() {
      TrustedUIManager._dialogStacks['app://www.fake'] = [];
      TrustedUIManager._lastDisplayedApp = fakeApp;
      TrustedUIManager.popupContainer.classList.add('closing');
      var stubScreenLock = this.sinon.stub(screen, 'mozLockOrientation');
      var stubHideAllFrames = this.sinon.stub(TrustedUIManager,
        '_hideAllFrames');
      var stubHideCallerApp = this.sinon.stub(TrustedUIManager,
        '_hideCallerApp');
      var stubPushNewDialog = this.sinon.stub(TrustedUIManager,
        '_pushNewDialog');
      TrustedUIManager.open('appName', 'testFrame', 'testChromeEventId',
        'testOnCancelCB');

      assert.isTrue(stubScreenLock.calledWith('portrait'));
      assert.isTrue(stubHideAllFrames.calledOnce);
      assert.isTrue(TrustedUIManager.popupContainer.classList.contains('up'));
      assert.isFalse(TrustedUIManager.popupContainer.classList
        .contains('closing'));
      stubHideCallerApp.getCall(0).args[1]();
      assert.isFalse(TrustedUIManager.popupContainer.classList.contains('up'));
      assert.isTrue(stubPushNewDialog.calledWith('appName', 'testFrame',
        'testChromeEventId', 'testOnCancelCB'));
    });
  });

  suite('TrustedUI/close', function() {
    test('currentStack is empty', function() {
      TrustedUIManager._dialogStacks['app://www.fake'] = [];
      TrustedUIManager._lastDisplayedApp = fakeApp;
      var testCallbackSpy = this.sinon.spy();
      var stubRestoreOrientation = this.sinon.stub(TrustedUIManager,
        '_restoreOrientation');
      TrustedUIManager.close('testChromeEventId', testCallbackSpy,
        'app://www.fake');

      assert.isTrue(stubRestoreOrientation.calledOnce);
      assert.isTrue(testCallbackSpy.called);
    });

    test('currentStack has one dialog', function() {
      TrustedUIManager._dialogStacks['app://www.fake'] = ['test'];
      TrustedUIManager._lastDisplayedApp = fakeApp;
      window.taskManager.is_shown = false;
      var stubCloseDialog = this.sinon.stub(TrustedUIManager,
        '_closeDialog');
      var stubRestoreCallerApp = this.sinon.stub(TrustedUIManager,
        '_restoreCallerApp');
      var stubHide = this.sinon.stub(TrustedUIManager, '_hide');
      var stubFocus = this.sinon.stub(window, 'focus');
      TrustedUIManager.close('testChromeEventId', null, null);
      assert.isTrue(stubRestoreCallerApp.calledWith(fakeApp));
      TrustedUIManager.popupContainer.dispatchEvent(
        new CustomEvent('transitionend'));

      assert.isTrue(stubCloseDialog.calledWith('testChromeEventId', null));
      assert.isTrue(stubHide.calledOnce);
      assert.isTrue(stubFocus.calledOnce);

    });

    test('currentStack has more than one dialog', function() {
      TrustedUIManager._dialogStacks['app://www.fake'] = ['test', 'test2'];
      TrustedUIManager._lastDisplayedApp = fakeApp;
      var stubCloseDialog = this.sinon.stub(TrustedUIManager,
        '_closeDialog');
      TrustedUIManager.close('testChromeEventId', null, 'app://www.fake');

      assert.isTrue(stubCloseDialog.calledWith('testChromeEventId',
        'app://www.fake'));
    });
  });

  test('_pushNewDialog', function() {
    TrustedUIManager._dialogStacks['app://www.fake'] = ['test'];
    TrustedUIManager._lastDisplayedApp = fakeApp;
    var fakeFrame = document.createElement('iframe');
    fakeFrame.name = 'testFrameName';
    var stubMakeDialogVisible = this.sinon.stub(TrustedUIManager,
      '_makeDialogVisible');
    var stubHandleBrowserEvent = this.sinon.stub(TrustedUIManager,
      'handleBrowserEvent');
    TrustedUIManager._pushNewDialog('testName', fakeFrame,
      'testChromeEventId', 'testCancelCB');
    assert.equal(fakeFrame.dataset.frameName, 'testFrameName');
    assert.equal(fakeFrame.dataset.frameType, 'popup');
    assert.equal(fakeFrame.dataset.frameOrigin, 'app://www.fake');

    assert.equal(stubHandleBrowserEvent.callCount, 0);
    fakeFrame.dispatchEvent(new CustomEvent('mozbrowsererror'));
    assert.equal(stubHandleBrowserEvent.callCount, 1);
    fakeFrame.dispatchEvent(new CustomEvent('mozbrowserclose'));
    assert.equal(stubHandleBrowserEvent.callCount, 2);
    fakeFrame.dispatchEvent(new CustomEvent('mozbrowserloadstart'));
    assert.equal(stubHandleBrowserEvent.callCount, 3);
    fakeFrame.dispatchEvent(new CustomEvent('mozbrowserloadend'));
    assert.equal(stubHandleBrowserEvent.callCount, 4);

    var fakeDialog = {
      name: 'testName',
      frame: fakeFrame,
      chromeEventId: 'testChromeEventId',
      onCancelCB: 'testCancelCB'
    };
    assert.deepEqual(TrustedUIManager.currentStack[1], fakeDialog);

    assert.equal(TrustedUIManager.dialogTitle.textContent, 'testName');
    assert.deepEqual(fakeFrame.parentNode, TrustedUIManager.container);
    assert.isTrue(stubMakeDialogVisible.calledWith(fakeDialog));
  });
  
  suite('handleEvent', function() {
    test('home', function() {
      var stubHideTrustedApp = this.sinon.stub(TrustedUIManager,
        '_hideTrustedApp');
      TrustedUIManager.screen.classList.add('trustedui');
      TrustedUIManager.handleEvent({
        type: 'home'
      });
      assert.isTrue(stubHideTrustedApp.calledOnce);
      TrustedUIManager.screen.classList.remove('trustedui');
      TrustedUIManager.handleEvent({
        type: 'home'
      });
      assert.isTrue(stubHideTrustedApp.calledOnce);
    });

    test('holdhome', function() {
      var stubHideTrustedApp = this.sinon.stub(TrustedUIManager,
        '_hideTrustedApp');
      TrustedUIManager.screen.classList.add('trustedui');
      TrustedUIManager.handleEvent({
        type: 'holdhome'
      });
      assert.isTrue(stubHideTrustedApp.calledOnce);
      TrustedUIManager.screen.classList.remove('trustedui');
      TrustedUIManager.handleEvent({
        type: 'holdhome'
      });
      assert.isTrue(stubHideTrustedApp.calledOnce);
    });

    test('action', function() {
      var stubDestroyDialog = this.sinon.stub(TrustedUIManager,
        '_destroyDialog');
      TrustedUIManager.container.classList.add('error');
      TrustedUIManager.handleEvent({
        type: 'action'
      });
      assert.isFalse(TrustedUIManager.container.classList.contains('error'));
      assert.isTrue(stubDestroyDialog.calledOnce);
    });

    test('click', function() {
      var stubDestroyDialog = this.sinon.stub(TrustedUIManager,
        '_destroyDialog');
      TrustedUIManager.container.classList.add('error');
      TrustedUIManager.handleEvent({
        type: 'click'
      });
      assert.isFalse(TrustedUIManager.container.classList.contains('error'));
      assert.isTrue(stubDestroyDialog.calledOnce);
    });

    test('appterminated', function() {
      var stubDestroyDialog = this.sinon.stub(TrustedUIManager,
        '_destroyDialog');
      TrustedUIManager.handleEvent({
        type: 'appterminated',
        detail: {
          origin: 'testorigin'
        }
      });
      assert.isTrue(stubDestroyDialog.calledWith('testorigin'));
    });

    test('appcreated', function() {
      TrustedUIManager._dialogStacks['app://www.fake'] = null;
      TrustedUIManager._lastDisplayedApp = fakeApp;

      TrustedUIManager.handleEvent({
        type: 'appcreated',
        detail: {
          origin: 'app://www.fake'
        }
      });
      assert.deepEqual(TrustedUIManager._dialogStacks['app://www.fake'], []);
    });

    test('appwillopen', function() {
      var stubReopenTrustedApp = this.sinon.stub(TrustedUIManager,
        '_reopenTrustedApp');
      var stubHideTrustedApp = this.sinon.stub(TrustedUIManager,
        '_hideTrustedApp');
      var stubHideCallerApp = this.sinon.stub(TrustedUIManager,
        '_hideCallerApp');
      var stubMakeDialogVisible = this.sinon.stub(TrustedUIManager,
        '_makeDialogVisible');
      var stubGetTopDialogResult = 'getTopDialogFakeResult';
      this.sinon.stub(TrustedUIManager, '_getTopDialog')
        .returns(stubGetTopDialogResult);

      TrustedUIManager._dialogStacks['app://www.fake'] = ['testStack'];
      TrustedUIManager.popupContainer.classList.add('up');

      TrustedUIManager.screen.classList.add('trustedui');
      TrustedUIManager.handleEvent({
        type: 'appwillopen',
        detail: fakeApp
      });
      assert.isTrue(stubHideTrustedApp.calledOnce);
      assert.isFalse(TrustedUIManager.popupContainer.classList.contains('up'));
      assert.isTrue(stubMakeDialogVisible.calledWith(stubGetTopDialogResult));
      assert.isTrue(stubHideCallerApp.calledWith(fakeApp));
      assert.isTrue(stubReopenTrustedApp.calledOnce);

      TrustedUIManager.screen.classList.remove('trustedui');
    });

    test('appopen', function() {
      var stubScreenLock = this.sinon.stub(screen, 'mozLockOrientation');
      TrustedUIManager._dialogStacks['app://www.fake'] = ['test'];
      TrustedUIManager._lastDisplayedApp = fakeApp;

      TrustedUIManager.handleEvent({
        type: 'appopen'
      });
      assert.isTrue(stubScreenLock.calledWith('portrait'));
    });

    test('appwillclose', function() {
      var stubGetTopDialogResult = 'getTopDialogFakeResult';
      var stubMakeDialogHidden = this.sinon.stub(TrustedUIManager,
        '_makeDialogHidden');
      var stubHide = this.sinon.stub(TrustedUIManager, '_hide');
      this.sinon.stub(TrustedUIManager, '_getTopDialog')
        .returns(stubGetTopDialogResult);

      TrustedUIManager.handleEvent({
        type: 'appwillclose'
      });
      assert.isTrue(stubMakeDialogHidden.calledWith(stubGetTopDialogResult));
      assert.isTrue(stubHide.calledOnce);
    });

    test('keyboardchange', function() {
      var stubSetHeight = this.sinon.stub(TrustedUIManager,
        '_setHeight');
      var currentWindowHeight = window.innerHeight;
      MockStatusBar.height = 123;

      inputWindowManager.mHeight = 55;
      TrustedUIManager.handleEvent({
        type: 'keyboardchange'
      });
      assert.isTrue(stubSetHeight.calledWith(currentWindowHeight - 123 - 55 ));
    });

    test('keyboardhide', function() {
      var stubSetHeight = this.sinon.stub(TrustedUIManager,
        '_setHeight');
      var currentWindowHeight = window.innerHeight;
      MockStatusBar.height = 123;
      TrustedUIManager.handleEvent({
        type: 'keyboardhide'
      });
      assert.isTrue(stubSetHeight.calledWith(currentWindowHeight - 123));
    });
  });
});
