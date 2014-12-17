/* global AppWindow, AppChrome, MocksHelper, MockL10n, PopupWindow,
          MockModalDialog, MockService */
/* exported MockBookmarksDatabase */
'use strict';

require('/shared/js/component_utils.js');
require('/shared/elements/gaia_progress/script.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_service.js');
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
  'Service', 'LazyLoader'
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

  var fakeAppMaximized = {
    url: 'app://search.gaiamobile.org/newtab.html',
    chrome: {
      maximized: true
    }
  };

  suite('Old Navigation - Application events', function() {
    test('app is loading', function() {
      var app = new AppWindow(fakeWebSite);
      var chrome = new AppChrome(app);
      var stubShowProgress = this.sinon.stub(chrome, 'show');
      var progressStart = this.sinon.stub(chrome.progress, 'start');
      assert.isFalse(chrome.progress.hasAttribute('animated'));
      chrome.handleEvent({ type: '_loading' });
      assert.isTrue(stubShowProgress.calledWith(chrome.progress));
      assert.isTrue(progressStart.calledOnce);
    });

    test('app is loaded', function() {
      var app = new AppWindow(fakeWebSite);
      var chrome = new AppChrome(app);
      var stubHideProgress = this.sinon.stub(chrome, 'hide');
      var progressStop = this.sinon.stub(chrome.progress, 'stop');
      chrome.handleEvent({ type: '_loaded' });
      assert.isTrue(stubHideProgress.calledWith(chrome.progress));
      assert.isTrue(progressStop.calledOnce);
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
      assert.equal(chrome.reloadButton.getAttribute('data-l10n-id'),
        'reload-button');
      chrome.handleEvent({ type: 'click', target: chrome.reloadButton });
      assert.isTrue(stubReload.called);
    });

    test('stop', function() {
      var app = new AppWindow(fakeWebSite);
      var chrome = new AppChrome(app);
      var stubStop = this.sinon.stub(app, 'stop');
      assert.equal(chrome.stopButton.getAttribute('data-l10n-id'),
        'stop-button');
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
      this.sinon.stub(app, 'isBrowser').returns(true);
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

    test('location#anchor changed', function() {
      var app = new AppWindow(fakeWebSite);
      var chrome = new AppChrome(app);
      this.sinon.stub(app, 'isBrowser').returns(true);

      chrome._currentURL = fakeWebSite.url;
      chrome.containerElement.classList.add('scrollable');
      chrome.handleEvent({ type: 'mozbrowserlocationchange',
                           detail: fakeWebSite.url + '#anchor' });
      assert.isTrue(chrome.containerElement.classList.contains('scrollable'));
    });

    test('location changed - without navigation', function() {
      var app = new AppWindow(fakeAppWithName);
      var chrome = new AppChrome(app);
      this.sinon.stub(app, 'isBrowser').returns(false);
      var stub1 = this.sinon.stub(app, 'canGoForward');
      var stub2 = this.sinon.stub(app, 'canGoBack');

      var evt = new CustomEvent('mozbrowserlocationchange', {
        detail: 'http://mozilla.org'
      });
      app.element.dispatchEvent(evt);

      stub1.getCall(0).args[0](true);
      assert.equal(chrome.forwardButton.disabled, true);
      stub1.getCall(0).args[0](false);
      assert.equal(chrome.forwardButton.disabled, true);

      stub2.getCall(0).args[0](true);
      assert.equal(chrome.backButton.disabled, true);
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

    test('error', function() {
      var app = new AppWindow(fakeWebSite);
      var chrome = new AppChrome(app);
      chrome.containerElement.classList.add('scrollable');
      chrome.handleEvent({ type: 'mozbrowsererror' });
      assert.isFalse(chrome.containerElement.classList.contains('scrollable'));
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
      assert.equal(chrome.title.getAttribute('data-l10n-id'),
        'search-or-enter-address');
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

    test('rocketbar-overlayclosed should collapse the urlbar', function() {
      var app = new AppWindow(fakeWebSite);
      var subject = new AppChrome(app);
      subject.maximize();

      window.dispatchEvent(new CustomEvent('rocketbar-overlayclosed'));
      assert.isFalse(subject.element.classList.contains('maximized'));
    });
  });

  suite('Theme-Color', function() {
    var app, chrome, stubRequestAnimationFrame, appPublishStub;

    setup(function() {
      app = new AppWindow(fakeWebSite);
      chrome = new AppChrome(app);
      stubRequestAnimationFrame =
        this.sinon.stub(window, 'requestAnimationFrame', function(cb) {

        cb();
      });
      appPublishStub = this.sinon.stub(app, 'publish');
    });

    test('metachange already set', function() {
      app.themeColor = 'orange';

      var chrome = new AppChrome(app);
      assert.equal(chrome.element.style.backgroundColor, 'orange');
    });

    test('metachange added', function() {
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
      chrome.setThemeColor('black');
      assert.isTrue(stubRequestAnimationFrame.called);
      assert.isFalse(app.element.classList.contains('light'));
      assert.isFalse(chrome.useLightTheming());
      assert.isTrue(appPublishStub.called);
      assert.isTrue(appPublishStub.calledWith('titlestatechanged'));
    });

    test('light color have dark icons', function() {
      chrome.setThemeColor('white');
      assert.isTrue(stubRequestAnimationFrame.called);
      assert.isTrue(app.element.classList.contains('light'));
      assert.isTrue(chrome.useLightTheming());
      assert.isTrue(appPublishStub.called);
      assert.isTrue(appPublishStub.calledWith('titlestatechanged'));
    });

    test('popup window will use rear window color theme', function() {
      var popup = new PopupWindow(fakeWebSite);
      var popupChrome = new AppChrome(popup);
      chrome.setThemeColor('black');
      popupChrome.setThemeColor('white');
      popup.appChrome = popupChrome;
      app.appChrome = chrome;
      popup.rearWindow = app;
      assert.isTrue(stubRequestAnimationFrame.called);
      assert.isTrue(popupChrome.useLightTheming());
      assert.isTrue(appPublishStub.called);
      assert.isTrue(appPublishStub.calledWith('titlestatechanged'));
    });

    test('browser scrollable background is black', function() {
      assert.equal(chrome.scrollable.style.backgroundColor, '');
      chrome.setThemeColor('black');
      assert.equal(chrome.scrollable.style.backgroundColor, 'black');
    });

    test('should stop requesting frames when color stops changing', function() {
      chrome.scrollable.style.backgroundColor, '#fff';
      chrome.setThemeColor('#fff');
      assert.isTrue(stubRequestAnimationFrame.calledTwice);
    });

    test('should keep requesting frames while color changes', function() {
      var count = 0;
      sinon.stub(window, 'getComputedStyle', function() {
        var style = {};
        switch (count) {
          case 0:
            style.backgroundColor = 'rgb(1, 2, 3)';
            break;
          case 1:
            style.backgroundColor = 'rgb(2, 3, 4)';
            break;
          case 2:
          case 3:
            style.backgroundColor = 'rgb(3, 4, 5)';
            break;
        }
        count++;
        return style;
      });
      chrome.setThemeColor('#fff');
      assert.equal(stubRequestAnimationFrame.callCount, 4);
      window.getComputedStyle.restore();
    });

    test('homescreen scrollable background is unset', function() {
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
      MockService.locked = false;
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
      MockService.locked = true;
      var app = new AppWindow(fakeAppWithName);
      var chrome = new AppChrome(app);
      chrome.title.dispatchEvent(new CustomEvent('click'));
      assert.isFalse(caught);
    });
  });

  suite('titlestatechanged', function() {
    test('scroll event - active app', function() {
      var app = new AppWindow(fakeAppMaximized);
      var chrome = new AppChrome(app);
      var appPublishStub = this.sinon.stub(app, 'publish');
      this.sinon.stub(app, 'isActive').returns(true);

      chrome.handleEvent({ type: 'scroll' });
      assert.isTrue(appPublishStub.called);
      assert.isTrue(appPublishStub.calledWith('titlestatechanged'));
    });

    test('scroll event - inactive app', function() {
      var app = new AppWindow(fakeAppMaximized);
      var chrome = new AppChrome(app);
      var appPublishStub = this.sinon.stub(app, 'publish');
      this.sinon.stub(app, 'isActive').returns(false);

      chrome.handleEvent({ type: 'scroll' });
      assert.isTrue(appPublishStub.notCalled);
    });

    test('set transparent color', function() {
      var app = new AppWindow(fakeWebSite);
      var chrome = new AppChrome(app);
      var appPublishStub = this.sinon.stub(app, 'publish');

      chrome.setThemeColor('transparent');
      assert.isTrue(appPublishStub.called);
      assert.isTrue(appPublishStub.calledWith('titlestatechanged'));
    });

    test('unset color', function() {
      var app = new AppWindow(fakeWebSite);
      var chrome = new AppChrome(app);
      var appPublishStub = this.sinon.stub(app, 'publish');

      chrome.setThemeColor('');
      assert.isTrue(appPublishStub.called);
      assert.isTrue(appPublishStub.calledWith('titlestatechanged'));
    });
  });

  suite('reConfig', function() {
    test('removes the search-app class if not the search app', function() {
      var app = new AppWindow(fakeSearchApp);
      var chrome = new AppChrome(app);
      assert.isTrue(chrome.app.element.classList.contains('search-app'));
      chrome.app.config.manifest = null;
      chrome.reConfig();
      assert.isFalse(chrome.app.element.classList.contains('search-app'));
    });
  });

  suite('transition events', function() {
    var app, chrome;
    setup(function() {
      app = new AppWindow(fakeAppMaximized);
      chrome = new AppChrome(app);
      this.sinon.stub(app, 'publish');
      this.sinon.stub(app, 'isActive').returns(true);

      for (var i = 0; i < 10; i++) {
        chrome.handleEvent({ type: 'scroll' });
      }
    });

    test('should not publish when a control transition ends', function() {
      // Can not fire transitionend events on disabled buttons.
      chrome.reloadButton.disabled = false;
      chrome.reloadButton.dispatchEvent(new CustomEvent('transitionend'));
      sinon.assert.notCalled(app.publish.withArgs('chromecollapsed'));
    });

    test('should publish when the element transition ends', function() {
      chrome.element.dispatchEvent(new CustomEvent('transitionend'));
      sinon.assert.calledOnce(app.publish.withArgs('chromecollapsed'));
    });

    test('should only publish once', function() {
      chrome.element.dispatchEvent(new CustomEvent('transitionend'));
      this.sinon.clock.tick(250);
      sinon.assert.calledOnce(app.publish.withArgs('chromecollapsed'));
    });
  });
});
