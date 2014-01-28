'use strict';

mocha.globals(['AppWindow', 'AppChrome', 'System',
  'BaseUI', 'ModalDialog', 'HomeGesture']);

requireApp('system/test/unit/mock_l10n.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_modal_dialog.js');

var mocksForAppChrome = new MocksHelper([
  'AppWindow', 'ModalDialog'
]).init();

suite('system/AppChrome', function() {
  var stubById, realL10n, realHomeGesture;
  mocksForAppChrome.attachTestHelpers();
  setup(function(done) {
    realHomeGesture = window.HomeGesture;
    window.HomeGesture = { enable: false };
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    this.sinon.useFakeTimers();

    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    requireApp('system/js/system.js');
    requireApp('system/js/base_ui.js');
    requireApp('system/js/app_chrome.js', done);
  });

  teardown(function() {
    window.HomeGesture = realHomeGesture;
    navigator.mozL10n = realL10n;
    stubById.restore();
  });

  var fakeAppConfig1 = {
    url: 'app://www.fake/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake/ManifestURL',
    origin: 'app://www.fake'
  };

  test('app is closing', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var chrome1 = new AppChrome(app1);
    var stubHandleClosing = this.sinon.stub(chrome1, 'handleClosing');
    chrome1.handleEvent({ type: '_closing' });
    assert.isTrue(stubHandleClosing.called);
  });

  test('app is opened', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var chrome1 = new AppChrome(app1);
    var stubHandleOpened = this.sinon.stub(chrome1, 'handleOpened');
    chrome1.handleEvent({ type: '_opened' });
    assert.isTrue(stubHandleOpened.called);
  });

  test('app is loading', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var chrome1 = new AppChrome(app1);
    var stubShowProgress = this.sinon.stub(chrome1, 'show');
    chrome1.handleEvent({ type: '_loading' });
    assert.isTrue(stubShowProgress.calledWith(chrome1.progress));
  });

  test('app is loaded', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var chrome1 = new AppChrome(app1);
    var stubHideProgress = this.sinon.stub(chrome1, 'hide');
    chrome1.handleEvent({ type: '_loaded' });
    assert.isTrue(stubHideProgress.calledWith(chrome1.progress));
  });

  test('app location is changed', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var chrome1 = new AppChrome(app1);
    var stubHandleLocationChanged =
      this.sinon.stub(chrome1, 'handleLocationChanged');
    chrome1.handleEvent({ type: 'mozbrowserlocationchange' });
    assert.isTrue(stubHandleLocationChanged.called);
  });

  test('close navigation', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var chrome1 = new AppChrome(app1);
    chrome1.handleEvent({ type: 'click', target: chrome1.closeButton });
  });

  test('bookmark', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var chrome1 = new AppChrome(app1);
    var stubAddBookmark = this.sinon.stub(chrome1, 'addBookmark');
    chrome1.handleEvent({ type: 'click', target: chrome1.bookmarkButton });
    assert.isTrue(stubAddBookmark.called);
  });

  test('back', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var chrome1 = new AppChrome(app1);
    var stubBack = this.sinon.stub(app1, 'back');
    chrome1.handleEvent({ type: 'click', target: chrome1.backButton });
    assert.isTrue(stubBack.called);
  });

  test('forward', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var chrome1 = new AppChrome(app1);
    var stubForward = this.sinon.stub(app1, 'forward');
    chrome1.handleEvent({ type: 'click', target: chrome1.forwardButton });
    assert.isTrue(stubForward.called);
  });

  test('reload', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var chrome1 = new AppChrome(app1);
    var stubReload = this.sinon.stub(app1, 'reload');
    chrome1.handleEvent({ type: 'click', target: chrome1.reloadButton });
    assert.isTrue(stubReload.called);
  });

  test('open navigation', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var chrome1 = new AppChrome(app1);
    chrome1.handleEvent({ type: 'click', target: chrome1.openButton });

    assert.isFalse(chrome1.navigation.classList.contains('closed'));
    this.sinon.clock.tick(5000);
    assert.isTrue(chrome1.navigation.classList.contains('closed'));
  });

  test('add bookmark', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var chrome1 = new AppChrome(app1);
    var stubClearButtonBarTimeout =
      this.sinon.stub(chrome1, 'clearButtonBarTimeout');
    delete chrome1.bookmarkButton.dataset.disabled;
    var stubSelectOne = this.sinon.stub(MockModalDialog, 'selectOne');
    chrome1.addBookmark();
    assert.isTrue(stubClearButtonBarTimeout.called);
    assert.isTrue(stubSelectOne.called);
  });

  test('home gesture enabled', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var chrome1 = new AppChrome(app1);
    var stubHoldNavigation = this.sinon.stub(chrome1, 'holdNavigation');
    chrome1.handleEvent({ type: '_homegesture-enabled' });
    assert.isTrue(stubHoldNavigation.called);
  });

  test('home gesture disabled', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var chrome1 = new AppChrome(app1);
    var stubReleaseNavigation = this.sinon.stub(chrome1, 'releaseNavigation');
    chrome1.handleEvent({ type: '_homegesture-disabled' });
    assert.isTrue(stubReleaseNavigation.called);
  });

  test('keyboard shows', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var chrome1 = new AppChrome(app1);
    var stubIsActive = this.sinon.stub(app1, 'isActive');
    stubIsActive.returns(true);
    chrome1.navigation.classList.add('visible');
    chrome1.handleEvent({ type: '_withkeyboard' });
    assert.isTrue(chrome1.hidingNavigation);
  });

  test('keyboard hides', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var chrome1 = new AppChrome(app1);
    var stubIsActive = this.sinon.stub(app1, 'isActive');
    stubIsActive.returns(true);
    chrome1.navigation.classList.remove('visible');
    chrome1.handleEvent({ type: '_withoutkeyboard' });
    assert.isFalse(chrome1.hidingNavigation);
  });

  test('toggle navigation', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var chrome1 = new AppChrome(app1);
    chrome1.toggleButtonBar();
    this.sinon.clock.tick(5000);
    assert.isTrue(chrome1.navigation.classList.contains('closed'));
  });

  test('location changed', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var chrome1 = new AppChrome(app1);
    var stub1 = this.sinon.stub(app1, 'canGoForward');
    var stub2 = this.sinon.stub(app1, 'canGoBack');
    chrome1.handleLocationChanged();
    stub1.getCall(0).args[0](true);
    assert.isUndefined(chrome1.forwardButton.dataset.disabled);
    stub1.getCall(0).args[0](false);
    assert.equal(chrome1.forwardButton.dataset.disabled, 'true');

    stub2.getCall(0).args[0](true);
    assert.isUndefined(chrome1.backButton.dataset.disabled);
    stub2.getCall(0).args[0](false);
    assert.equal(chrome1.backButton.dataset.disabled, 'true');
  });

  test('opened', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var chrome1 = new AppChrome(app1);

    var stubToggleButtonBar = this.sinon.stub(chrome1, 'toggleButtonBar');
    chrome1.handleOpened();
    assert.isTrue(stubToggleButtonBar.called);
  });
});
