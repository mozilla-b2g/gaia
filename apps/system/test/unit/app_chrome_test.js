/* global AppWindow, AppChrome, homeGesture, MocksHelper, MockL10n,
          MockModalDialog */
'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_popup_window.js');
requireApp('system/test/unit/mock_modal_dialog.js');

var mocksForAppChrome = new MocksHelper([
  'AppWindow', 'ModalDialog', 'PopupWindow'
]).init();

suite('system/AppChrome', function() {
  var stubById, realL10n, realHomeGesture;
  mocksForAppChrome.attachTestHelpers();

  setup(function(done) {
    realHomeGesture = window.homeGesture;
    window.homeGesture = { enable: false };
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
    window.homeGesture = realHomeGesture;
    navigator.mozL10n = realL10n;
    stubById.restore();
  });

  var fakeAppConfig1 = {
    url: 'app://www.fake/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake/ManifestURL',
    origin: 'app://www.fake'
  };

  var fakeWebSite = {
    url: 'http://google.com/index.html',
    origin: 'app://google.com'
  };

  var fakeAppConfigNavigation = {
    url: 'app://www.fake/index.html',
    chrome: {
      navigation: true,
    }
  };

  var fakeAppConfigBar = {
    url: 'app://www.fake/index.html',
    chrome: {
      bar: true
    }
  };

  var fakeAppConfigBoth = {
    url: 'app://www.fake/index.html',
    chrome: {
      navigation: true,
      bar: true
    }
  };

  suite('Old Navigation - Application events', function() {
    test('app is closing', function() {
      var app = new AppWindow(fakeAppConfig1);
      var chrome = new AppChrome(app);
      var stubHandleClosing = this.sinon.stub(chrome, 'handleClosing');
      chrome.handleEvent({ type: '_closing' });
      assert.isTrue(stubHandleClosing.called);
    });

    test('app is opened', function() {
      var app = new AppWindow(fakeAppConfig1);
      var chrome = new AppChrome(app);
      var stubHandleOpened = this.sinon.stub(chrome, 'handleOpened');
      chrome.handleEvent({ type: '_opened' });
      assert.isTrue(stubHandleOpened.called);
    });

    test('app is loading', function() {
      var app = new AppWindow(fakeAppConfig1);
      var chrome = new AppChrome(app);
      var stubShowProgress = this.sinon.stub(chrome, 'show');
      chrome.handleEvent({ type: '_loading' });
      assert.isTrue(stubShowProgress.calledWith(chrome.progress));
    });

    test('app is loaded', function() {
      var app = new AppWindow(fakeAppConfig1);
      var chrome = new AppChrome(app);
      var stubHideProgress = this.sinon.stub(chrome, 'hide');
      chrome.handleEvent({ type: '_loaded' });
      assert.isTrue(stubHideProgress.calledWith(chrome.progress));
    });

    test('app location is changed', function() {
      var app = new AppWindow(fakeAppConfig1);
      var chrome = new AppChrome(app);
      var stubHandleLocationChanged =
        this.sinon.stub(chrome, 'handleLocationChanged');
      chrome.handleEvent({ type: 'mozbrowserlocationchange' });
      assert.isTrue(stubHandleLocationChanged.called);
    });

    test('open navigation', function() {
      var app = new AppWindow(fakeAppConfig1);
      var chrome = new AppChrome(app);
      chrome.handleEvent({ type: 'click', target: chrome.openButton });

      assert.isFalse(chrome.navigation.classList.contains('closed'));
      this.sinon.clock.tick(5000);
      assert.isTrue(chrome.navigation.classList.contains('closed'));
    });

    test('close navigation', function() {
      var app = new AppWindow(fakeAppConfig1);
      var chrome = new AppChrome(app);
      chrome.handleEvent({ type: 'click', target: chrome.closeButton });
    });

    test('add bookmark', function() {
      var app = new AppWindow(fakeAppConfig1);
      var chrome = new AppChrome(app);
      var stubClearButtonBarTimeout =
        this.sinon.stub(chrome, 'clearButtonBarTimeout');
      delete chrome.bookmarkButton.dataset.disabled;
      var stubSelectOne = this.sinon.stub(MockModalDialog, 'selectOne');
      chrome.addBookmark();
      assert.isTrue(stubClearButtonBarTimeout.called);
      assert.isTrue(stubSelectOne.called);
    });

    test('home gesture enabled', function() {
      var app = new AppWindow(fakeAppConfig1);
      var chrome = new AppChrome(app);
      var stubHoldNavigation = this.sinon.stub(chrome, 'holdNavigation');
      chrome.handleEvent({ type: '_homegesture-enabled' });
      assert.isTrue(stubHoldNavigation.called);
    });

    test('home gesture disabled', function() {
      var app = new AppWindow(fakeAppConfig1);
      var chrome = new AppChrome(app);
      var stubReleaseNavigation = this.sinon.stub(chrome, 'releaseNavigation');
      chrome.handleEvent({ type: '_homegesture-disabled' });
      assert.isTrue(stubReleaseNavigation.called);
    });

    test('keyboard shows', function() {
      var app = new AppWindow(fakeAppConfig1);
      var chrome = new AppChrome(app);
      var stubIsActive = this.sinon.stub(app, 'isActive');
      stubIsActive.returns(true);
      chrome.navigation.classList.add('visible');

      var stubHide = this.sinon.stub(chrome, 'hide');
      chrome.handleEvent({ type: '_withkeyboard' });
      assert.isTrue(stubHide.called);
    });

    test('keyboard hides', function() {
      var app = new AppWindow(fakeAppConfig1);
      var chrome = new AppChrome(app);

      chrome.navigation.classList.remove('visible');

      var stubShow = this.sinon.stub(chrome, 'show');
      chrome.handleEvent({ type: '_withoutkeyboard' });
      assert.isTrue(stubShow.called);
    });

    test('toggle navigation', function() {
      var app = new AppWindow(fakeAppConfig1);
      var chrome = new AppChrome(app);
      chrome.toggleButtonBar();
      this.sinon.clock.tick(5000);
      assert.isTrue(chrome.navigation.classList.contains('closed'));
    });

    test('opened', function() {
      var app = new AppWindow(fakeAppConfig1);
      var chrome = new AppChrome(app);

      var stubToggleButtonBar = this.sinon.stub(chrome, 'toggleButtonBar');
      chrome.handleOpened();
      assert.isTrue(stubToggleButtonBar.called);
    });

    test('toggleButtonBar with homeGesture enabled', function() {
      var app = new AppWindow(fakeAppConfig1);
      var chrome = new AppChrome(app);
      homeGesture.enabled = true;
      chrome.toggleButtonBar();
      assert.isTrue(chrome.navigation.classList.contains('closed'));
    });

    test('handleClosing with homeGesture enabled', function() {
      var app = new AppWindow(fakeAppConfig1);
      var chrome = new AppChrome(app);
      homeGesture.enabled = false;
      chrome.navigation.classList.remove('closed');
      chrome.handleClosing();
      assert.isTrue(chrome.navigation.classList.contains('closed'));
      chrome.navigation.classList.remove('closed');
      homeGesture.enabled = true;
      chrome.handleClosing();
      assert.isFalse(chrome.navigation.classList.contains('closed'));
    });
  });

  suite('Views', function() {
    test('Regular view for navigation only', function() {
      var app = new AppWindow(fakeAppConfigNavigation);

      var spyView = this.sinon.spy(AppChrome.prototype, 'view');
      new AppChrome(app); // jshint ignore:line
      assert.isTrue(spyView.called);
    });

    test('Regular view for bar only', function() {
      var app = new AppWindow(fakeAppConfigBar);

      var spyView = this.sinon.spy(AppChrome.prototype, 'view');
      new AppChrome(app); // jshint ignore:line
      assert.isTrue(spyView.called);
    });

    test('Combined view for navigation + bar', function() {
      var app = new AppWindow(fakeAppConfigBoth);

      var spyView = this.sinon.spy(AppChrome.prototype, 'combinedView');
      new AppChrome(app); // jshint ignore:line
      assert.isTrue(spyView.called);
    });
  });


  suite('Button events', function() {
    test('back', function() {
      var app = new AppWindow(fakeAppConfig1);
      var chrome = new AppChrome(app);
      var stubBack = this.sinon.stub(app, 'back');
      chrome.handleEvent({ type: 'click', target: chrome.backButton });
      assert.isTrue(stubBack.called);
    });

    test('forward', function() {
      var app = new AppWindow(fakeAppConfig1);
      var chrome = new AppChrome(app);
      var stubForward = this.sinon.stub(app, 'forward');
      chrome.handleEvent({ type: 'click', target: chrome.forwardButton });
      assert.isTrue(stubForward.called);
    });

    test('reload', function() {
      var app = new AppWindow(fakeAppConfig1);
      var chrome = new AppChrome(app);
      var stubReload = this.sinon.stub(app, 'reload');
      chrome.handleEvent({ type: 'click', target: chrome.reloadButton });
      assert.isTrue(stubReload.called);
    });

    test('stop', function() {
      var app = new AppWindow(fakeAppConfig1);
      var chrome = new AppChrome(app);
      var stubStop = this.sinon.stub(app, 'stop');
      chrome.handleEvent({ type: 'click', target: chrome.stopButton });
      assert.isTrue(stubStop.called);
    });

    test('bookmark', function() {
      var app = new AppWindow(fakeAppConfig1);
      var chrome = new AppChrome(app);
      var stubAddBookmark = this.sinon.stub(chrome, 'addBookmark');
      chrome.handleEvent({ type: 'click', target: chrome.bookmarkButton });
      assert.isTrue(stubAddBookmark.called);
    });

    test('location changed', function() {
      var app = new AppWindow(fakeAppConfig1);
      var chrome = new AppChrome(app);
      var stub1 = this.sinon.stub(app, 'canGoForward');
      var stub2 = this.sinon.stub(app, 'canGoBack');

      chrome.handleEvent({ type: 'mozbrowserlocationchange',
                           detail: 'new.location' });

      stub1.getCall(0).args[0](true);
      assert.isUndefined(chrome.forwardButton.dataset.disabled);
      stub1.getCall(0).args[0](false);
      assert.equal(chrome.forwardButton.dataset.disabled, 'true');

      stub2.getCall(0).args[0](true);
      assert.isUndefined(chrome.backButton.dataset.disabled);
      stub2.getCall(0).args[0](false);
      assert.equal(chrome.backButton.dataset.disabled, 'true');
    });
  });


  suite('Navigation events', function() {
    test('loadstart', function() {
      var app = new AppWindow(fakeAppConfigBoth);
      var chrome = new AppChrome(app);
      chrome.handleEvent({ type: 'mozbrowserloadstart' });
      assert.isTrue(chrome.containerElement.classList.contains('loading'));
    });

    test('loadend', function() {
      var app = new AppWindow(fakeAppConfigBoth);
      var chrome = new AppChrome(app);
      chrome.handleEvent({ type: 'mozbrowserloadend' });
      assert.isFalse(chrome.containerElement.classList.contains('loading'));
    });
  });

  suite('URLBar', function() {
    test('click', function() {
      var app = new AppWindow(fakeAppConfigBoth);
      var chrome = new AppChrome(app);
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      chrome.handleEvent({ type: 'click', target: chrome.title });
      assert.isTrue(stubDispatchEvent.called);
    });

    test('should set "search" for app window when created', function() {
      var app = new AppWindow(fakeAppConfig1);
      var chrome = new AppChrome(app);
      assert.equal(chrome.title.textContent, 'search');
    });
  });

  suite('mozbrowserlocationchange', function() {
    var subject = null;
    setup(function() {
      var website = new AppWindow(fakeWebSite);
      subject = new AppChrome(website);
      subject._registerEvents();
    });

    teardown(function() {
      subject._unregisterEvents();
    });
  });

  suite('Maximized', function() {
    var subject = null;
    var cbSpy = null;
    setup(function() {
      var app = new AppWindow(fakeAppConfig1);
      subject = new AppChrome(app);
      cbSpy = this.sinon.spy();

      subject.maximize(cbSpy);
    });

    test('should add the maximized css class on the element', function() {
      assert.isTrue(subject.element.classList.contains('maximized'));
    });

    test('should trigger the callback after the transition', function() {
      sinon.assert.notCalled(cbSpy);
      subject.element.dispatchEvent(new CustomEvent('transitionend'));
      sinon.assert.calledOnce(cbSpy);
    });

    test('should trigger the callback after a safety timeout', function() {
      sinon.assert.notCalled(cbSpy);
      this.sinon.clock.tick(500);
      sinon.assert.calledOnce(cbSpy);
    });

    test('collapse should remove the maximized css class', function() {
      var app = new AppWindow(fakeAppConfig1);
      var subject = new AppChrome(app);
      subject.element.classList.add('maximized');

      subject.collapse();
      assert.isFalse(subject.element.classList.contains('maximized'));
    });

    test('rocketbar-overlayopened should collapse the urlbar', function() {
      var app = new AppWindow(fakeAppConfig1);
      var subject = new AppChrome(app);
      subject.maximize();

      window.dispatchEvent(new CustomEvent('rocketbar-overlayopened'));
      assert.isFalse(subject.element.classList.contains('maximized'));
    });
  });

  suite('Theme-Color', function() {
    test('metachange already set', function() {
      var app = new AppWindow(fakeAppConfigBoth);
      app.themeColor = 'orange';

      var chrome = new AppChrome(app);
      assert.equal(chrome.element.style.backgroundColor, 'orange');
    });

    test('metachange added', function() {
      var app = new AppWindow(fakeAppConfigBoth);
      var chrome = new AppChrome(app);
      chrome.handleEvent({
        type: 'mozbrowsermetachange',
        detail: {
          name: 'theme-color',
          type: 'added',
          content: 'orange'
        }
      });
      assert.equal(chrome.element.style.backgroundColor, 'orange');
    });

    test('metachange removed', function() {
      var app = new AppWindow(fakeAppConfigBoth);
      var chrome = new AppChrome(app);
      chrome.handleEvent({
        type: 'mozbrowsermetachange',
        detail: {
          name: 'theme-color',
          type: 'removed'
        }
      });
      assert.equal(chrome.element.style.backgroundColor, '');
    });

    test('metachange changed', function() {
      var app = new AppWindow(fakeAppConfigBoth);
      var chrome = new AppChrome(app);
      chrome.handleEvent({
        type: 'mozbrowsermetachange',
        detail: {
          name: 'theme-color',
          type: 'changed',
          content: 'red'
        }
      });
      assert.equal(chrome.element.style.backgroundColor, 'red');
    });

    test('dark color have light icons', function() {
      var app = new AppWindow(fakeAppConfigBoth);
      var chrome = new AppChrome(app);
      var stubRequestAnimationFrame =
        this.sinon.stub(window, 'requestAnimationFrame', function(cb) {

        cb();
      });

      chrome.setThemeColor('black');
      assert.isTrue(stubRequestAnimationFrame.called);
      assert.isFalse(app.element.classList.contains('light'));
    });

    test('light color have dark icons', function() {
      var app = new AppWindow(fakeAppConfigBoth);
      var chrome = new AppChrome(app);
      var stubRequestAnimationFrame =
        this.sinon.stub(window, 'requestAnimationFrame', function(cb) {

        cb();
      });

      chrome.setThemeColor('white');
      assert.isTrue(stubRequestAnimationFrame.called);
      assert.isTrue(app.element.classList.contains('light'));
    });

    test('browser scrollable background is black', function() {
      var app = new AppWindow(fakeAppConfigBoth);
      var chrome = new AppChrome(app);

      assert.equal(chrome.scrollable.style.backgroundColor, '');
      chrome.setThemeColor('black');
      assert.equal(chrome.scrollable.style.backgroundColor, 'black');
    });


    test('homescreen scrollable background is unset', function() {
      var app = new AppWindow(fakeAppConfigBoth);
      app.isHomescreen = true;
      var chrome = new AppChrome(app);

      assert.equal(chrome.scrollable.style.backgroundColor, '');
      chrome.setThemeColor('black');
      assert.equal(chrome.scrollable.style.backgroundColor, '');
    });
  });
});
