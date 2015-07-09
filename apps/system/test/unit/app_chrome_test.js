/* global AppWindow, AppChrome, MocksHelper, MockL10n, PopupWindow,
          MockModalDialog, MockService, MockPromise */
/* exported MockBookmarksDatabase */
'use strict';

require('/shared/js/component_utils.js');
require('/shared/js/event_safety.js');
require('/shared/elements/gaia_progress/script.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_service.js');
require('/shared/test/unit/mocks/mock_promise.js');
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
  var stubById, realL10n, app, chrome;
  mocksForAppChrome.attachTestHelpers();

  setup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    this.sinon.useFakeTimers();

    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));

    requireApp('system/js/base_ui.js');
    requireApp('system/js/app_chrome.js', function() {
      this.sinon.stub(AppChrome.prototype, 'setSiteIcon');
      app = new AppWindow(cloneConfig(fakeWebSite));
      app.contextmenu = {
        isShown: function() {return false;}
      };
      chrome = new AppChrome(app);
      done();
    }.bind(this));

    window.SettingsListener = { observe: function() {} };
  });

  teardown(function() {
    navigator.mozL10n = realL10n;
    stubById.restore();
  });

  function cloneConfig(config) {
    return JSON.parse(JSON.stringify(config));
  }
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
      role: 'search'
    },
    manifestURL: 'app://search.gaiamobile.org/manifest.webapp',
    origin: 'app://search.gaiamobile.org',
    chrome: {
        navigation: true
    }
  };

  var fakePrivateLandingPage = {
    url: 'app://system.gaiamobile.org/private_browser.html',
    origin: 'app://www.fake',
    isPrivate: true
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

  var fadeTransitionEndEvent = new CustomEvent('transitionend');
  fadeTransitionEndEvent.propertyName = 'background-color';

  suite('Old Navigation - Application events', function() {
    test('app is loading', function() {
      var stubShowProgress = this.sinon.stub(chrome, 'show');
      var progressStart = this.sinon.stub(chrome.progress, 'start');
      assert.isFalse(chrome.progress.hasAttribute('animated'));
      chrome.handleEvent({ type: '_loading' });
      assert.isTrue(stubShowProgress.calledWith(chrome.progress));
      assert.isTrue(progressStart.calledOnce);
    });

    test('app is loaded', function() {
      var stubHideProgress = this.sinon.stub(chrome, 'hide');
      var progressStop = this.sinon.stub(chrome.progress, 'stop');
      chrome.handleEvent({ type: '_loaded' });
      assert.isTrue(stubHideProgress.calledWith(chrome.progress));
      assert.isTrue(progressStop.calledOnce);
    });

    test('app location is changed', function() {
      var stubHandleLocationChange =
        this.sinon.stub(chrome, 'handleLocationChange');
      chrome.handleEvent({ type: '_locationchange' });
      assert.isTrue(stubHandleLocationChange.called);
    });

    test('app location is changed - private browser landing page', function() {
      var app = new AppWindow(fakePrivateLandingPage);
      this.sinon.stub(app, 'isBrowser').returns(true);
      this.sinon.stub(app, 'isPrivateBrowser').returns(true);

      var chrome = new AppChrome(app);
      chrome.handleEvent({ type: '_locationchange' });
      assert.equal(chrome.title.dataset.l10nId, 'search-or-enter-address');


    });

    test('add bookmark', function() {
      var stubSelectOne = this.sinon.stub(MockModalDialog, 'selectOne');
      chrome.onAddBookmark();
      assert.isTrue(stubSelectOne.called);
    });

    test('app ssl state is changed', function() {
      var app = new AppWindow(cloneConfig(fakeWebSite));
      this.sinon.stub(app, 'getSSLState', function() {
        return 'broken';
      });
      var chrome = new AppChrome(app);
      var stubHandleSecurityChanged =
        this.sinon.spy(chrome, 'handleSecurityChanged');
      chrome.handleEvent({ type: '_securitychange' });
      assert.isTrue(stubHandleSecurityChanged.called);
      assert.equal(chrome.sslIndicator.dataset.ssl, 'broken');
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
      var app = new AppWindow(cloneConfig(fakeWebSite));

      var spyView = this.sinon.spy(AppChrome.prototype, 'combinedView');
      new AppChrome(app); // jshint ignore:line
      assert.isTrue(spyView.called);
    });
  });


  suite('Button events', function() {
    test('back', function() {
      var stubBack = this.sinon.stub(app, 'back');
      assert.equal(chrome.backButton.getAttribute('data-l10n-id'),
        'back-button');
      chrome.handleEvent({ type: 'click', target: chrome.backButton });
      assert.isTrue(stubBack.called);
    });

    test('forward', function() {
      var stubForward = this.sinon.stub(app, 'forward');
      assert.equal(chrome.forwardButton.getAttribute('data-l10n-id'),
        'forward-button');
      chrome.handleEvent({ type: 'click', target: chrome.forwardButton });
      assert.isTrue(stubForward.called);
    });

    test('reload', function() {
      var stubReload = this.sinon.stub(app, 'reload');
      assert.equal(chrome.reloadButton.getAttribute('data-l10n-id'),
        'reload-button');
      chrome.handleEvent({ type: 'click', target: chrome.reloadButton });
      assert.isTrue(stubReload.called);
    });

    test('stop', function() {
      var stubStop = this.sinon.stub(app, 'stop');
      assert.equal(chrome.stopButton.getAttribute('data-l10n-id'),
        'stop-button');
      chrome.handleEvent({ type: 'click', target: chrome.stopButton });
      assert.isTrue(stubStop.called);
    });

    test('windows', function(done) {
      var app = new AppWindow(fakeSearchApp);
      var chrome = new AppChrome(app);
      assert.equal(chrome.windowsButton.getAttribute('data-l10n-id'),
        'windows-button');
      window.addEventListener('taskmanagershow', function() {
        done();
      });
      chrome.handleEvent({ type: 'click', target: chrome.windowsButton });
    });

    test('location changed', function() {
      this.sinon.stub(app, 'isBrowser').returns(true);
      var stub1 = this.sinon.stub(app, 'canGoForward');
      var stub2 = this.sinon.stub(app, 'canGoBack');

      chrome.handleEvent({ type: '_locationchange' });

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
      this.sinon.stub(app, 'isBrowser').returns(true);

      chrome._currentURL = fakeWebSite.url;
      chrome.containerElement.classList.add('scrollable');
      chrome.handleEvent({ type: '_locationchange',
                           detail: fakeWebSite.url + '#anchor' });
      assert.isTrue(chrome.containerElement.classList.contains('scrollable'));
    });

    test('location changed - without navigation', function() {
      var app = new AppWindow(fakeAppWithName);
      var chrome = new AppChrome(app);
      this.sinon.stub(app, 'isBrowser').returns(false);
      var stub1 = this.sinon.stub(app, 'canGoForward');
      var stub2 = this.sinon.stub(app, 'canGoBack');

      var evt = new CustomEvent('_locationchange');
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
    setup(function() {
      chrome.setSiteIcon.reset();
    });

    test('loadstart', function() {
      chrome.handleEvent({ type: 'mozbrowserloadstart' });
      assert.isTrue(chrome.containerElement.classList.contains('loading'));
      assert.isFalse(chrome.setSiteIcon.calledOnce);
    });

    test('loadend', function() {
      chrome.handleEvent({ type: 'mozbrowserloadend' });
      assert.isFalse(chrome.containerElement.classList.contains('loading'));
      assert.isTrue(chrome.setSiteIcon.calledOnce);
      assert.equal(0, chrome.setSiteIcon.getCall(0).args.length,
                'setSiteIcon passed 0 argument');
    });

    test('namechanged - does not set when we have a fixed title', function() {
      chrome._fixedTitle = true;
      chrome.title.textContent = 'foo';
      chrome.handleEvent({ type: '_namechanged' });
      assert.equal(chrome.title.textContent, 'foo');
    });

    suite('error', function() {
      var app, chrome;

      setup(function() {
        app = new AppWindow(cloneConfig(fakeWebSite));
      });

      test('scrollable chrome without bar', function() {
        app.config.chrome.bar = false;
        app.config.chrome.scrollable = true;
        chrome = new AppChrome(app);
        chrome.containerElement.classList.add('scrollable');
        chrome.handleEvent({ type: 'mozbrowsererror', detail: {
          type: 'offline'
        }});
        assert.isTrue(chrome.element.classList.contains('maximized'));
      });

      test('not scrollable chrome without bar', function() {
        app.config.chrome.bar = false;
        app.config.chrome.scrollable = false;
        chrome = new AppChrome(app);
        chrome.handleEvent({ type: 'mozbrowsererror', detail: {
          type: 'offline'
        }});
        assert.isFalse(chrome.element.classList.contains('maximized'));
      });

      test('scrollable chrome with bar', function() {
        app.config.chrome.bar = true;
        app.config.chrome.scrollable = true;
        chrome = new AppChrome(app);
        chrome.handleEvent({ type: 'mozbrowsererror', detail: {
          type: 'fatal'
        }});
        assert.isFalse(chrome.element.classList.contains('maximized'));
      });
    });
  });


  suite('URLBar', function() {
    test('click', function() {
      MockService.mockQueryWith('locked', false);
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      chrome.handleEvent({ type: 'click', target: chrome.title });
      assert.isTrue(stubDispatchEvent.called);
    });

    test('should set the name when created', function() {
      var app = new AppWindow(cloneConfig(fakeWebSite));
      app.name = 'Phone';
      var chrome = new AppChrome(app);
      assert.equal(chrome.title.textContent, 'Phone');
    });

    test('should update the name when it changes', function() {
      var app = new AppWindow(cloneConfig(fakeWebSite));
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
      var app = new AppWindow(cloneConfig(fakeWebSite));
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
      var website = new AppWindow(cloneConfig(fakeWebSite));
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
      var evt = new CustomEvent('_locationchange');
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
      var app = new AppWindow(cloneConfig(fakeWebSite));
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
      var app = new AppWindow(cloneConfig(fakeWebSite));
      var subject = new AppChrome(app);
      subject.element.classList.add('maximized');

      subject.collapse();
      assert.isFalse(subject.element.classList.contains('maximized'));
    });

    test('rocketbar-overlayclosed should collapse the urlbar', function() {
      var app = new AppWindow(cloneConfig(fakeWebSite));
      var subject = new AppChrome(app);
      subject.maximize();

      window.dispatchEvent(new CustomEvent('rocketbar-overlayclosed'));
      assert.isFalse(subject.element.classList.contains('maximized'));
    });
  });

  suite('Theme-Color', function() {
    var app, chrome, stubRequestAnimationFrame, appPublishStub;

    setup(function() {
      this.sinon.clock.restore();
      app = new AppWindow(cloneConfig(fakeWebSite));
      chrome = new AppChrome(app);
      stubRequestAnimationFrame =
        this.sinon.stub(window, 'requestAnimationFrame').yieldsAsync();
      appPublishStub = this.sinon.stub(app, 'publish');
    });

    teardown(function(done) {
      // setThemeColor triggers a rAF loop that doesn't finish until
      // it gets a transitionend event. Some tests dispatch this event
      // but others don't so we dispatch it again here in case it hasn't
      // been dispatched yet.
      //
      // If we fail to do this, the rAF loop triggered by a previous test
      // might still be running when we start the next test which will
      // mean we *sometimes* get surprising values for
      // stubRequestAnimationFrame.callCount.
      //
      // Note that here we only make sure the rAF loop on |chrome| has
      // finished. Individual tests are responsible for firing a
      // transitionend event at the element of any additional AppChrome
      // objects they create.
      chrome.element.dispatchEvent(fadeTransitionEndEvent);

      // To ensure the transitionend event has been processed, wait for a
      // *real* requestAnimationFrame tick.
      window.requestAnimationFrame.restore();
      // Make sure we pass null to |done| otherwise it will complain that
      // its argument is not an Error object.
      window.requestAnimationFrame(done.bind(null, null));
    });

    test('metachange already set', function() {
      app.themeColor = 'orange';

      chrome = new AppChrome(app);
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
      assert.isTrue(app.element.classList.contains('light'));
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

    test('theme resets on navigation', function() {
      chrome.setThemeColor('orange');
      chrome.handleEvent({type: 'mozbrowserloadstart'});
      chrome.handleEvent({type: 'mozbrowserloadend'});
      assert.equal(chrome.element.style.backgroundColor, '');
    });

    test('dark color have light icons', function(done) {
      var initiallyLight = app.element.classList.contains('light');
      chrome.setThemeColor('black');
      window.setTimeout(function() {
        chrome.element.dispatchEvent(fadeTransitionEndEvent);
        assert.isTrue(stubRequestAnimationFrame.called);
        assert.isFalse(app.element.classList.contains('light'));
        assert.isFalse(chrome.useLightTheming());
        sinon.assert.callCount(appPublishStub.withArgs('titlestatechanged'),
          initiallyLight ? 1 : 0);
        done();
      }, 0);
    });

    test('light color have dark icons', function(done) {
      var initiallyLight = app.element.classList.contains('light');
      chrome.setThemeColor('white');
      window.setTimeout(function() {
        chrome.element.dispatchEvent(fadeTransitionEndEvent);
        assert.isTrue(stubRequestAnimationFrame.called);
        assert.isTrue(app.element.classList.contains('light'));
        assert.isTrue(chrome.useLightTheming());
        sinon.assert.callCount(appPublishStub.withArgs('titlestatechanged'),
          initiallyLight ? 0 : 1);
        done();
      }, 0);
    });

    test('popup window will use rear window color theme', function(done) {
      var popup = new PopupWindow(cloneConfig(fakeWebSite));
      var popupChrome = new AppChrome(popup);
      this.sinon.stub(popup, 'getBottomMostWindow').returns(app);
      chrome.setThemeColor('black');
      popupChrome.setThemeColor('white');
      popup.appChrome = popupChrome;
      app.appChrome = chrome;
      window.setTimeout(function() {
        chrome.element.dispatchEvent(fadeTransitionEndEvent);
        assert.isTrue(stubRequestAnimationFrame.called);
        assert.equal(chrome.useLightTheming(), popupChrome.useLightTheming());
        assert.equal(app.themeColor, 'black');
        assert.equal(popup.themeColor, 'black');
        sinon.assert.calledOnce(appPublishStub.withArgs('titlestatechanged'));
        // End popup rAF look so it doesn't interfere with other tests
        popupChrome.element.dispatchEvent(fadeTransitionEndEvent);
        done();
      }, 0);
    });

    test('browser scrollable background is black', function() {
      assert.equal(chrome.scrollable.style.backgroundColor, '');
      chrome.setThemeColor('black');
      assert.equal(chrome.scrollable.style.backgroundColor, 'black');
    });

    test('should stop requesting frames when transition ends', function(done) {
      chrome.setThemeColor('white');
      chrome.element.dispatchEvent(fadeTransitionEndEvent);
      window.setTimeout(function() {
        sinon.assert.calledOnce(stubRequestAnimationFrame);
        done();
      }, 0);
    });

    test('should ignore unrelated transition events', function(done) {
      chrome.setThemeColor('white');
      window.setTimeout(function() {
        var previousCallCount = stubRequestAnimationFrame.callCount;
        var transformEvent = new CustomEvent('transitionend');
        transformEvent.propertyName = 'transform';
        chrome.element.dispatchEvent(transformEvent);
        window.setTimeout(function() {
          assert.isTrue(stubRequestAnimationFrame.callCount > previousCallCount,
                       'requestAnimationFrame continues to be called after ' +
                       'an unrelated transition event');
          done();
        }, 0);
      }, 0);
    });

    test('homescreen scrollable background is unset', function() {
      app.isHomescreen = true;
      var chrome = new AppChrome(app);

      assert.equal(chrome.scrollable.style.backgroundColor, '');
      chrome.setThemeColor('black');
      assert.equal(chrome.scrollable.style.backgroundColor, '');
    });

    test('does not set for private windows', function() {
      app = new AppWindow(cloneConfig(fakeWebSite));
      this.sinon.stub(app, 'isPrivateBrowser').returns(true);
      chrome = new AppChrome(app);
      assert.equal(chrome.scrollable.style.backgroundColor, '');
      chrome.setThemeColor('black');
      assert.equal(chrome.scrollable.style.backgroundColor, '');
    });
  });

  suite('Search request', function() {
    var stubDispatch;

    setup(function() {
      stubDispatch = this.sinon.stub(window, 'dispatchEvent');
    });

    test('When screen is unlocked, dispatch the request.', function() {
      MockService.mockQueryWith('locked', false);
      chrome.handleEvent({ type: 'click', target: chrome.title });
      assert.isTrue(stubDispatch.called);
    });

    test('When a contextmenu is shown, do not dispatch.', function() {
      MockService.mockQueryWith('locked', false);
      this.sinon.stub(chrome.app.contextmenu, 'isShown').returns(true);
      chrome.handleEvent({ type: 'click', target: chrome.title });
      assert.isFalse(stubDispatch.called);
    });

    test('When screen is locked, do not dispatch the event.', function() {
      MockService.mockQueryWith('locked', true);
      chrome.handleEvent({ type: 'click', target: chrome.title });
      assert.isFalse(stubDispatch.called);
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
      var appPublishStub = this.sinon.stub(app, 'publish');

      chrome.setThemeColor('transparent');
      assert.isTrue(appPublishStub.called);
      assert.isTrue(appPublishStub.calledWith('titlestatechanged'));
    });

    test('unset color', function() {
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

    test('sets the site icon', function() {
      var app = new AppWindow(fakeSearchApp);
      var chrome = new AppChrome(app);
      assert.isTrue(chrome.setSiteIcon.called);
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

  suite('setSiteIcon', function() {
    var fakeIconURI = 'data://someimage';
    var getIconPromise;
    var combinedChrome;

    setup(function() {
      var app = new AppWindow(cloneConfig(fakeWebSite));
      combinedChrome = new AppChrome(app);
      combinedChrome.setSiteIcon.restore();
      getIconPromise = new MockPromise();
      this.sinon.stub(combinedChrome.app, 'getSiteIconUrl')
                     .returns(getIconPromise);
    });

    test('asks app for url when no argument is provided', function() {
      assert.ok(combinedChrome.useCombinedChrome());
      combinedChrome.setSiteIcon();
      getIconPromise.mFulfillToValue({ url: fakeIconURI });

      assert.ok(combinedChrome.siteIcon
                  .style.backgroundImage.includes(fakeIconURI));
    });

    test('small icon', function() {
      combinedChrome.setSiteIcon();
      getIconPromise.mFulfillToValue({ url: fakeIconURI, isSmall: true });

      assert.isTrue(combinedChrome.siteIcon.classList.contains('small-icon'));
    });

    test('!small icon', function() {
      combinedChrome.setSiteIcon();
      getIconPromise.mFulfillToValue({ url: fakeIconURI, isSmall: false });

      assert.isFalse(combinedChrome.siteIcon.classList.contains('small-icon'));
    });

    test('handles url argument', function() {
      combinedChrome.setSiteIcon(fakeIconURI);
      assert.ok(combinedChrome.siteIcon
                  .style.backgroundImage.includes(fakeIconURI));
      sinon.assert.notCalled(combinedChrome.app.getSiteIconUrl);
    });

    test('failure to get icon', function() {
      // set a default
      combinedChrome.siteIcon.style.backgroundImage = `url(${fakeIconURI})`;

      combinedChrome.setSiteIcon();
      getIconPromise.mRejectToError();

      assert.ok(combinedChrome.siteIcon
                  .style.backgroundImage.includes(fakeIconURI));
    });
  });

  suite('Default icon', function() {
    /*
    Disabled for backing out bug 1181602.
    var chrome;

    setup(function() {
      var app = new AppWindow(cloneConfig(fakeWebSite));
      chrome = new AppChrome(app);

      chrome.app.config.url = 'http://origin1/';
      chrome.handleEvent({ type: '_locationchange' });
      chrome.setSiteIcon.reset();
    });

    test('Icon is not set to default when same origin', function() {
      chrome.handleEvent({ type: '_locationchange' });

      assert.isFalse(chrome.setSiteIcon.called);
    });

    test('Icon is set to default when same origin', function() {
      chrome.app.config.url = 'http://origin2/';
      chrome.handleEvent({ type: '_locationchange' });

      assert.isTrue(chrome.setSiteIcon.calledOnce);
      assert.equal(1, chrome.setSiteIcon.getCall(0).args.length,
        'setSiteIcon passed 1 argument');
    });
    */
  });
});
