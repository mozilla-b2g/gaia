/* global AppWindow, AppChrome, MocksHelper, MockL10n,
          MockModalDialog, MockSystem */
/* exported MockBookmarksDatabase */
'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_system.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_popup_window.js');
requireApp('system/test/unit/mock_modal_dialog.js');

var MockBookmarksDatabase = {
  get: function(resolve, reject) {
    return { then: function(resolve) { resolve(); } };
  }
};

var mocksForAppChrome = new MocksHelper([
  'AppWindow', 'ModalDialog', 'PopupWindow', 'BookmarksDatabase',
  'System', 'LazyLoader'
]).init();

suite('system/AppChrome', function() {
  var stubById, realL10n;
  mocksForAppChrome.attachTestHelpers();

  setup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    this.sinon.useFakeTimers();

    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    requireApp('system/js/base_ui.js');
    requireApp('system/js/app_chrome.js', done);

    window.SettingsListener = { observe: function() {} };
  });

  teardown(function() {
    navigator.mozL10n = realL10n;
    stubById.restore();
  });

  var fakeWebSite = {
    url: 'http://google.com/index.html',
    origin: 'app://google.com',
    chrome: {
      scrollable: true
    }
  };

  var fakeAppWithName = {
    url: 'app://communications.gaiamobile.org/dialer/index.html',
    name: 'Phone',
    manifest: {name: 'Dialer'},
    manifestURL: 'app://communications.gaiamobile.org/manifest.webapp',
    origin: 'app://communications.gaiamobile.org',
    chrome: {
      scrollable: false
    }
  };

  var fakeSearchApp = {
    url: 'app://search.gaiamobile.org/newtab.html',
    name: 'Browser',
    manifest: {
      name: 'Browser',
      role: 'search',
    },
    manifestURL: 'app://search.gaiamobile.org/manifest.webapp',
    origin: 'app://search.gaiamobile.org',
    chrome: {
        navigation: true
    }
  };

  var fakeAppConfigBar = {
    url: 'app://www.fake/index.html',
    chrome: {
      bar: true
    }
  };

  suite('Old Navigation - Application events', function() {
    test('app is loading', function() {
      var app = new AppWindow(fakeWebSite);
      var chrome = new AppChrome(app);
      var stubShowProgress = this.sinon.stub(chrome, 'show');
      chrome.handleEvent({ type: '_loading' });
      assert.isTrue(stubShowProgress.calledWith(chrome.progress));
    });

    test('app is loaded', function() {
      var app = new AppWindow(fakeWebSite);
      var chrome = new AppChrome(app);
      var stubHideProgress = this.sinon.stub(chrome, 'hide');
      chrome.handleEvent({ type: '_loaded' });
      assert.isTrue(stubHideProgress.calledWith(chrome.progress));
    });

    test('app location is changed', function() {
      var app = new AppWindow(fakeWebSite);
      var chrome = new AppChrome(app);
      var stubHandleLocationChanged =
        this.sinon.stub(chrome, 'handleLocationChanged');
      chrome.handleEvent({ type: 'mozbrowserlocationchange' });
      assert.isTrue(stubHandleLocationChanged.called);
    });

    test('add bookmark', function() {
      var app = new AppWindow(fakeWebSite);
      var chrome = new AppChrome(app);
      var stubSelectOne = this.sinon.stub(MockModalDialog, 'selectOne');
      chrome.onAddBookmark();
      assert.isTrue(stubSelectOne.called);
    });

  });

  suite('Views', function() {
    test('Regular view for bar only', function() {
      var app = new AppWindow(fakeAppConfigBar);

      var spyView = this.sinon.spy(AppChrome.prototype, 'view');
      new AppChrome(app); // jshint ignore:line
      assert.isTrue(spyView.called);
    });

    test('Combined view for navigation + bar', function() {
      var app = new AppWindow(fakeWebSite);

      var spyView = this.sinon.spy(AppChrome.prototype, 'combinedView');
      new AppChrome(app); // jshint ignore:line
      assert.isTrue(spyView.called);
    });
  });


  suite('Button events', function() {
    test('back', function() {
      var app = new AppWindow(fakeWebSite);
      var chrome = new AppChrome(app);
      var stubBack = this.sinon.stub(app, 'back');
      chrome.handleEvent({ type: 'click', target: chrome.backButton });
      assert.isTrue(stubBack.called);
    });

    test('forward', function() {
      var app = new AppWindow(fakeWebSite);
      var chrome = new AppChrome(app);
      var stubForward = this.sinon.stub(app, 'forward');
      chrome.handleEvent({ type: 'click', target: chrome.forwardButton });
      assert.isTrue(stubForward.called);
    });

    test('reload', function() {
      var app = new AppWindow(fakeWebSite);
      var chrome = new AppChrome(app);
      var stubReload = this.sinon.stub(app, 'reload');
      chrome.handleEvent({ type: 'click', target: chrome.reloadButton });
      assert.isTrue(stubReload.called);
    });

    test('stop', function() {
      var app = new AppWindow(fakeWebSite);
      var chrome = new AppChrome(app);
      var stubStop = this.sinon.stub(app, 'stop');
      chrome.handleEvent({ type: 'click', target: chrome.stopButton });
      assert.isTrue(stubStop.called);
    });

    test('windows', function(done) {
      var app = new AppWindow(fakeSearchApp);
      var chrome = new AppChrome(app);
      window.addEventListener('taskmanagershow', function() {
        done();
      });
      chrome.handleEvent({ type: 'click', target: chrome.windowsButton });
    });

    test('location changed', function() {
      var app = new AppWindow(fakeWebSite);
      var chrome = new AppChrome(app);
      var stub1 = this.sinon.stub(app, 'canGoForward');
      var stub2 = this.sinon.stub(app, 'canGoBack');

      chrome.handleEvent({ type: 'mozbrowserlocationchange',
                           detail: 'new.location' });

      stub1.getCall(0).args[0](true);
      assert.equal(chrome.forwardButton.disabled, false);
      stub1.getCall(0).args[0](false);
      assert.equal(chrome.forwardButton.disabled, true);

      stub2.getCall(0).args[0](true);
      assert.equal(chrome.backButton.disabled, false);
      stub2.getCall(0).args[0](false);
      assert.equal(chrome.backButton.disabled, true);
    });
  });


  suite('Navigation events', function() {
    test('loadstart', function() {
      var app = new AppWindow(fakeWebSite);
      var chrome = new AppChrome(app);
      chrome.handleEvent({ type: 'mozbrowserloadstart' });
      assert.isTrue(chrome.containerElement.classList.contains('loading'));
    });

    test('loadend', function() {
      var app = new AppWindow(fakeWebSite);
      var chrome = new AppChrome(app);
      chrome.handleEvent({ type: 'mozbrowserloadend' });
      assert.isFalse(chrome.containerElement.classList.contains('loading'));
    });

    test('titlechange', function() {
      var app = new AppWindow(fakeWebSite);
      var chrome = new AppChrome(app);

      assert.equal(chrome.title.textContent, '');

      chrome.handleEvent({ type: 'mozbrowserlocationchange',
                           detail: app.config.url });

      chrome.handleEvent({ type: 'mozbrowsertitlechange',
                           detail: '' });

      assert.equal(chrome.title.textContent, app.config.url);

      chrome.handleEvent({ type: 'mozbrowsertitlechange',
                           detail: 'Hello' });

      assert.equal(chrome.title.textContent, 'Hello');
    });
  });


  suite('URLBar', function() {
    test('click', function() {
      var app = new AppWindow(fakeWebSite);
      var chrome = new AppChrome(app);
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      chrome.handleEvent({ type: 'click', target: chrome.title });
      assert.isTrue(stubDispatchEvent.called);
    });

    test('should set the name when created', function() {
      var app = new AppWindow(fakeWebSite);
      app.name = 'Phone';
      var chrome = new AppChrome(app);
      assert.equal(chrome.title.textContent, 'Phone');
    });

    test('should update the name when it changes', function() {
      var app = new AppWindow(fakeWebSite);
      app.name = 'Phone';
      var chrome = new AppChrome(app);
      assert.equal(chrome.title.textContent, 'Phone');

      app.name = 'Phone2';
      var evt = new CustomEvent('_namechanged');
      app.element.dispatchEvent(evt);
      assert.equal(chrome.title.textContent, 'Phone2');
    });

    test('localized app is not immediately overridden by titlechange event',
      function() {
      var app = new AppWindow(fakeWebSite);
      app.name = 'Phone';

      var chrome = new AppChrome(app);
      chrome.handleEvent({ type: 'mozbrowsertitlechange',
                           detail: 'Do not update' });
      assert.equal(chrome.title.textContent, 'Phone');
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

    test('should not do anything on apps with manifests', function() {
      var app = new AppWindow(fakeAppWithName);
      var chrome = new AppChrome(app);
      chrome._registerEvents();

      var evt = new CustomEvent('mozbrowserlocationchange', {
        detail: 'app://communications.gaiamobile.org/calllog.html'
      });
      chrome.app.element.dispatchEvent(evt);
      this.sinon.clock.tick(500);
      chrome._unregisterEvents();
    });

    test('should wait before updating the title', function() {
      subject.title.textContent = 'Google';
      var evt = new CustomEvent('mozbrowserlocationchange', {
        detail: 'http://bing.com'
      });
      subject.app.element.dispatchEvent(evt);

      assert.equal(subject.title.textContent, 'Google');
      this.sinon.clock.tick(500);
      assert.equal(subject.title.textContent, 'http://bing.com');
    });

    test('should not update the title if we get a titlechange right after',
    function() {
      subject.title.textContent = 'Google';
      var evt = new CustomEvent('mozbrowserlocationchange', {
        detail: 'http://bing.com'
      });
      subject.app.element.dispatchEvent(evt);

      assert.equal(subject.title.textContent, 'Google');
      this.sinon.clock.tick(100);
      var titleEvent = new CustomEvent('mozbrowsertitlechange', {
        detail: 'Bing'
      });
      subject.app.element.dispatchEvent(titleEvent);
      this.sinon.clock.tick(500);
      assert.equal(subject.title.textContent, 'Bing');
    });

    test('browser start page should always have the same title',
    function() {
      var app = new AppWindow(fakeSearchApp);
      var chrome = new AppChrome(app);
      var titleEvent = new CustomEvent('mozbrowsertitlechange', {
        detail: 'Bing'
      });
      chrome.app.element.dispatchEvent(titleEvent);
      assert.equal(chrome.title.textContent, 'search-or-enter-address');
    });

    test('should expand if collapsed', function() {
      var stubIsBrowser = sinon.stub(subject.app, 'isBrowser', function() {
        return true;
      });
      subject.collapse();
      var evt = new CustomEvent('mozbrowserlocationchange', {
        detail: 'http://example.com'
      });
      subject.app.element.dispatchEvent(evt);
      assert.isTrue(subject.element.classList.contains('maximized'));
      assert.equal(subject.scrollable.scrollTop, 0);
      stubIsBrowser.restore();
    });
  });

  suite('Maximized', function() {
    var subject = null;
    var cbSpy = null;
    setup(function() {
      var app = new AppWindow(fakeWebSite);
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
      var app = new AppWindow(fakeWebSite);
      var subject = new AppChrome(app);
      subject.element.classList.add('maximized');

      subject.collapse();
      assert.isFalse(subject.element.classList.contains('maximized'));
    });

    test('rocketbar-overlayopened should collapse the urlbar', function() {
      var app = new AppWindow(fakeWebSite);
      var subject = new AppChrome(app);
      subject.maximize();

      window.dispatchEvent(new CustomEvent('rocketbar-overlayopened'));
      assert.isFalse(subject.element.classList.contains('maximized'));
    });
  });

  suite('Theme-Color', function() {
    test('metachange already set', function() {
      var app = new AppWindow(fakeWebSite);
      app.themeColor = 'orange';

      var chrome = new AppChrome(app);
      assert.equal(chrome.element.style.backgroundColor, 'orange');
    });

    test('metachange added', function() {
      var app = new AppWindow(fakeWebSite);
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
      var app = new AppWindow(fakeWebSite);
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
      var app = new AppWindow(fakeWebSite);
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
      var app = new AppWindow(fakeWebSite);
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
      var app = new AppWindow(fakeWebSite);
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
      var app = new AppWindow(fakeWebSite);
      var chrome = new AppChrome(app);

      assert.equal(chrome.scrollable.style.backgroundColor, '');
      chrome.setThemeColor('black');
      assert.equal(chrome.scrollable.style.backgroundColor, 'black');
    });


    test('homescreen scrollable background is unset', function() {
      var app = new AppWindow(fakeWebSite);
      app.isHomescreen = true;
      var chrome = new AppChrome(app);

      assert.equal(chrome.scrollable.style.backgroundColor, '');
      chrome.setThemeColor('black');
      assert.equal(chrome.scrollable.style.backgroundColor, '');
    });
  });

  suite('Search request', function() {
    test('When screen is unlocked, dispatch the request.', function() {
      var caught = false;
      window.addEventListener('global-search-request', function search() {
        window.removeEventListener('global-search-request', search);
        caught = true;
      });
      MockSystem.locked = false;
      var app = new AppWindow(fakeAppWithName);
      var chrome = new AppChrome(app);
      chrome.title.dispatchEvent(new CustomEvent('click'));
      assert.isTrue(caught);
    });

    test('When screen is locked, do not dispatch the event.', function() {
      var caught = false;
      window.addEventListener('global-search-request', function search() {
        window.removeEventListener('global-search-request', search);
        caught = true;
      });
      MockSystem.locked = true;
      var app = new AppWindow(fakeAppWithName);
      var chrome = new AppChrome(app);
      chrome.title.dispatchEvent(new CustomEvent('click'));
      assert.isFalse(caught);
    });
  });
});
