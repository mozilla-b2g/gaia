'use strict';
/* global Rocketbar, MocksHelper, MockIACPort, MockSearchWindow,
   MockService, MockPromise, MockAppWindow, MockUtilityTray */

require('/js/browser.js');
require('/js/browser_config_helper.js');
require('/shared/js/event_safety.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_search_window.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_settings_url.js');
requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/shared/test/unit/mocks/mock_promise.js');
requireApp('system/test/unit/mock_iac_handler.js');
requireApp('system/test/unit/mock_utility_tray.js');

var mocksForRocketbar = new MocksHelper([
  'AppWindow',
  'SearchWindow',
  'SettingsListener',
  'SettingsURL',
  'Service',
  'IACPort',
  'UtilityTray'
]).init();

suite('system/Rocketbar', function() {
  mocksForRocketbar.attachTestHelpers();
  var stubById;
  var subject;

  setup(function(done) {
    this.sinon.useFakeTimers();

    stubById = this.sinon.stub(document, 'getElementById', function(id) {
      if (id == 'rocketbar-input') {
        return document.createElement('input');
      } else {
        return document.createElement('div');
      }
    });

    requireApp('system/js/rocketbar.js', function() {
      subject = new Rocketbar();
      subject._port = MockIACPort;
      done();
    });
  });

  teardown(function() {
    stubById.restore();
    MockIACPort.mTearDown();
    subject._port = null;
    MockService.currentApp = null;
  });

  suite('Hierarchy functions', function() {
    test('setHierarchy: false', function() {
      var searchWindow = new MockSearchWindow();
      subject.searchWindow = searchWindow;
      this.sinon.stub(searchWindow, 'setVisibleForScreenReader');
      subject.setHierarchy(false);
      assert.isTrue(searchWindow.setVisibleForScreenReader.calledWith(false));
    });

    test('setHierarchy: true', function() {
      var searchWindow = new MockSearchWindow();
      subject.searchWindow = searchWindow;
      this.sinon.stub(searchWindow, 'setVisibleForScreenReader');
      this.sinon.stub(subject, 'focus');
      subject.setHierarchy(true);
      assert.isTrue(subject.focus.called);
      assert.isTrue(searchWindow.setVisibleForScreenReader.calledWith(true));
    });

    test('Should register hierarchy on start', function() {
      this.sinon.stub(MockService, 'request');
      subject.start();
      assert.isTrue(
        MockService.request.calledWith('registerHierarchy', subject));
    });

    test('isActive', function() {
      subject.start();
      assert.isFalse(subject.isActive());
      subject.activate();
      assert.isTrue(subject.isActive());
    });

    test('Should publish activated when search is loaded and transitioned',
      function() {
        subject.start();
        var fakePromise = new MockPromise();
        this.sinon.stub(subject, 'loadSearchApp').returns(fakePromise);
        subject.activate();
        this.sinon.stub(subject, 'publish');
        subject.backdrop.dispatchEvent(new CustomEvent('transitionend'));
        fakePromise.mFulfillToValue();
        assert.isTrue(subject.publish.calledWith('-activated'));
      });

    test('Should publish deactivated when closing transition ends',
      function() {
        subject.start();
        subject.activate();
        subject.deactivate();
        this.sinon.stub(subject, 'publish');
        subject.backdrop.dispatchEvent(new CustomEvent('transitionend'));
        assert.isTrue(subject.publish.calledWith('-deactivated'));
      });

    test('Should publish activating when activate is called', function() {
      subject.start();
      this.sinon.stub(subject, 'publish');
      subject.activate();
      assert.isTrue(subject.publish.calledWith('-activating'));
    });

    test('Should publish deactivating when deactivate is called', function() {
      subject.start();
      this.sinon.stub(subject, 'publish');
      subject.activate();
      subject.deactivate();
      assert.isTrue(subject.publish.calledWith('-deactivating'));
    });

    test('Should get search window instance if we are active', function() {
      var searchWindow = new MockSearchWindow();
      subject.searchWindow = searchWindow;
      subject.activate();
      assert.equal(subject.getActiveWindow(), searchWindow);
    });

    test('Should get search window instance if we are inactive', function() {
      subject.deactivate();
      assert.isNull(subject.getActiveWindow());
    });
  });

  test('start()', function() {
    var addEventListenersStub = this.sinon.stub(subject,
      'addEventListeners');
    subject.start();
    assert.ok(addEventListenersStub.calledOnce);
    assert.ok(subject.enabled);
    addEventListenersStub.restore();
  });

  test('addEventListeners()', function() {
    var windowAddEventListenerStub = this.sinon.stub(window,
      'addEventListener');
    var rocketbarAddEventListenerStub = this.sinon.stub(subject.rocketbar,
      'addEventListener');
    var inputAddEventListenerStub = this.sinon.stub(subject.input,
      'addEventListener');
    var formAddEventListenerStub = this.sinon.stub(subject.form,
      'addEventListener');

    subject.addEventListeners();

    assert.ok(windowAddEventListenerStub.calledWith('apploading'));
    assert.ok(windowAddEventListenerStub.calledWith('apptitlechange'));
    assert.ok(windowAddEventListenerStub.calledWith('appopened'));
    var trayOpenedEvent = 'utilitytray-overlayopening';
    assert.ok(windowAddEventListenerStub.calledWith(trayOpenedEvent));
    assert.ok(inputAddEventListenerStub.calledWith('blur'));
    assert.ok(inputAddEventListenerStub.calledWith('input'));
    assert.ok(formAddEventListenerStub.calledWith('submit'));
    assert.ok(windowAddEventListenerStub.calledWith('iac-search-results'));

    windowAddEventListenerStub.restore();
    rocketbarAddEventListenerStub.restore();
    inputAddEventListenerStub.restore();
    formAddEventListenerStub.restore();
  });

  test('showResults()', function() {
    subject.results.classList.add('hidden');
    subject.showResults();
    assert.equal(subject.results.classList.contains('hidden'), false);
  });

  test('hideResults()', function() {
    subject.activate();
    var stub = this.sinon.stub(subject.searchWindow, 'hideContextMenu');

    subject.hideResults();
    assert.ok(subject.results.classList.contains('hidden'));
    assert.ok(MockIACPort.mNumberOfMessages() == 1);
    sinon.assert.calledOnce(stub);
  });

  test('selectAll()', function() {
    var stub = this.sinon.stub(subject.input, 'setSelectionRange');
    subject.selectAll();
    sinon.assert.calledOnce(stub);
    stub.restore();
  });

  test('focus()', function() {
    var loadSearchAppStub = this.sinon.stub(subject, 'loadSearchApp')
      .returns(Promise.resolve());
    subject.form.classList.add('hidden');
    subject.activate();
    subject.focus();
    assert.ok(subject.rocketbar.classList.contains('active'));
    assert.equal(subject.form.classList.contains('hidden'), false);
    assert.ok(subject.screen.classList.contains('rocketbar-focused'));
    assert.ok(subject.active);
    assert.ok(loadSearchAppStub.calledOnce);
    loadSearchAppStub.restore();
  });

  test('activate() - when isClosing is true', function(done) {
    subject.isClosing = true;
    // We should reject the promise when trying to activate during a close.
    subject.activate().then(function(){}, done);
  });

  test('activate() - when isClosing is false', function(done) {
    subject.isClosing = false;
    // Set the rocketbar to active so we have an immediate promise resolution.
    subject.active = true;
    subject.activate().then(done);
  });

  test('blur() - results hidden', function() {
    subject.results.classList.add('hidden');
    subject.active = true;
    subject.deactivate();
    assert.ok(subject.form.classList.contains('hidden'));
    assert.ok(!subject.screen.classList.contains('rocketbar-focused'));
    assert.equal(subject.active, false);
    assert.ok(!subject.rocketbar.classList.contains('active'));
  });

  test('blur() - results shown', function() {
    subject.deactivate();
    assert.equal(subject.form.classList.contains('hidden'), false);
  });

  test('handleEvent() - attentionopening', function() {
    var hideResultsStub = this.sinon.stub(subject, 'hideResults');
    var deactivateStub = this.sinon.stub(subject, 'deactivate');
    var event = {type: 'attentionopening'};
    subject.handleEvent(event);
    assert.ok(hideResultsStub.calledOnce);
    assert.ok(deactivateStub.calledOnce);
  });

  test('handleEvent() - attentionopened', function() {
    var hideResultsStub = this.sinon.stub(subject, 'hideResults');
    var deactivateStub = this.sinon.stub(subject, 'deactivate');
    var event = {type: 'attentionopened'};
    subject.handleEvent(event);
    assert.ok(hideResultsStub.calledOnce);
    assert.ok(deactivateStub.calledOnce);
  });

  test('handleEvent() - simlockrequestfocus', function() {
    var hideResultsStub = this.sinon.stub(subject, 'hideResults');
    var deactivateStub = this.sinon.stub(subject, 'deactivate');
    var event = {type: 'simlockrequestfocus'};
    subject.handleEvent(event);
    assert.ok(hideResultsStub.calledOnce);
    assert.ok(deactivateStub.calledOnce);
  });

  test('handleEvent() - apploading', function() {
    var hideResultsStub = this.sinon.stub(subject, 'hideResults');
    var deactivateStub = this.sinon.stub(subject, 'deactivate');

    // Bug 1071953 - Not called when stayBackground is true.
    var event1 = {type: 'apploading', detail: {
      stayBackground: true
    }};
    subject.handleEvent(event1);
    assert.ok(hideResultsStub.notCalled);
    assert.ok(deactivateStub.notCalled);

    var event2 = {type: 'apploading'};
    subject.handleEvent(event2);
    assert.ok(hideResultsStub.calledOnce);
    assert.ok(deactivateStub.calledOnce);
  });

  test('handleEvent() - appforeground', function() {
    var hideResultsStub = this.sinon.stub(subject, 'hideResults');
    var deactivateStub = this.sinon.stub(subject, 'deactivate');
    var event = {type: 'appforeground'};
    subject.handleEvent(event);
    assert.ok(hideResultsStub.calledOnce);
    assert.ok(deactivateStub.calledOnce);
  });

  test('handleEvent() - appopened', function() {
    var hideResultsStub = this.sinon.stub(subject, 'hideResults');
    var deactivateStub = this.sinon.stub(subject, 'deactivate');
    var event = {type: 'appopened'};
    subject.handleEvent(event);
    assert.ok(hideResultsStub.calledOnce);
    assert.ok(deactivateStub.calledOnce);
  });

  test('handleEvent() - utilitytray-overlayopening', function() {
    var hideResultsStub = this.sinon.stub(subject, 'hideResults');
    var deactivateStub = this.sinon.stub(subject, 'deactivate');
    var event = {type: 'utilitytray-overlayopening'};
    subject.handleEvent(event);
    assert.ok(hideResultsStub.calledOnce);
    assert.ok(deactivateStub.calledOnce);
  });

  test('handleEvent() - cardviewbeforeshow', function() {
    var hideResultsStub = this.sinon.stub(subject, 'hideResults');
    var deactivateStub = this.sinon.stub(subject, 'deactivate');
    var event = {type: 'cardviewbeforeshow'};
    subject.handleEvent(event);
    assert.ok(hideResultsStub.calledOnce);
    assert.ok(deactivateStub.calledOnce);
  });

  test('handleEvent() - launchapp', function() {
    var hideResultsStub = this.sinon.stub(subject, 'hideResults');
    var deactivateStub = this.sinon.stub(subject, 'deactivate');
    var event = {type: 'launchapp'};
    subject.handleEvent(event);
    assert.ok(hideResultsStub.calledOnce);
    assert.ok(deactivateStub.calledOnce);
  });

  test('handleEvent() - launchapp /w background', function() {
    var hideResultsStub = this.sinon.stub(subject, 'hideResults');
    var deactivateStub = this.sinon.stub(subject, 'deactivate');
    var event = {type: 'launchapp', detail: {
      stayBackground: true
    }};
    subject.handleEvent(event);
    assert.ok(hideResultsStub.notCalled);
    assert.ok(deactivateStub.notCalled);
  });

  test('handleEvent() - lockscreen-appopened', function() {
    var handleLockStub = this.sinon.stub(subject, 'handleLock');
    var event = {type: 'lockscreen-appopened'};
    subject.handleEvent(event);
    assert.ok(handleLockStub.calledOnce);
  });

  test('handleEvent() - focus', function() {
    var handleFocusStub = this.sinon.stub(subject, 'handleFocus');
    var event = {type: 'focus'};
    subject.handleEvent(event);
    assert.ok(handleFocusStub.calledOnce);
  });

  test('handleEvent() - home', function() {
    var handleHomeStub = this.sinon.stub(subject, '_handle_home');
    var event = {type: 'home'};
    this.sinon.stub(subject, 'isActive').returns(true);
    subject.respondToHierarchyEvent(event);
    assert.ok(handleHomeStub.calledOnce);
  });

  test('handleEvent() - blur', function() {
    var handleBlurStub = this.sinon.stub(subject, 'handleBlur');
    var event = {type: 'blur'};
    subject.handleEvent(event);
    assert.ok(handleBlurStub.calledOnce);
  });

  test('handleEvent() - input', function() {
    var handleInputStub = this.sinon.stub(subject, 'handleInput');
    var event = {type: 'input'};
    subject.handleEvent(event);
    assert.ok(handleInputStub.calledOnce);
  });

  test('handleEvent() - click cancel button', function() {
    var handleCancelStub = this.sinon.stub(subject, 'handleCancel');
    var event = {type: 'click', target: subject.cancel};
    subject.handleEvent(event);
    assert.ok(handleCancelStub.calledOnce);
  });

  test('handleEvent() - click clear button', function() {
    var setInputStub = this.sinon.stub(subject, 'setInput');
    var hideResultsStub = this.sinon.stub(subject, 'hideResults');
    var event = {type: 'click', target: subject.clearBtn};
    subject.handleEvent(event);
    assert.ok(setInputStub.calledWith(''));
    assert.ok(hideResultsStub.calledOnce);
  });

  test('handleEvent() - click backdrop', function() {
    var hideResultsStub = this.sinon.stub(subject, 'hideResults');
    var deactivateStub = this.sinon.stub(subject, 'deactivate');
    var event = {type: 'click', target: subject.backdrop};
    subject.handleEvent(event);
    assert.ok(hideResultsStub.calledOnce);
    assert.ok(deactivateStub.calledOnce);
  });

  test('handleEvent() - launchactivity', function() {
    var handleActivityStub = this.sinon.stub(subject, '_handle_launchactivity');
    var event = {type: 'launchactivity'};
    subject.respondToHierarchyEvent(event);
    assert.ok(handleActivityStub.calledOnce);
  });

  test('handleEvent() - searchterminated', function() {
    var handleSearchTerminatedStub =
      this.sinon.stub(subject, 'handleSearchTerminated');
    var event = {type: 'searchterminated'};
    subject.handleEvent(event);
    assert.ok(handleSearchTerminatedStub.calledOnce);
  });

  test('handleEvent() - submit', function() {
    var handleSubmitStub = this.sinon.stub(subject, 'handleSubmit');
    var event = {type: 'submit'};
    subject.handleEvent(event);
    assert.ok(handleSubmitStub.calledOnce);
  });

  test('handleEvent() - iac-search-results', function() {
    var handleSearchMessageStub =
      this.sinon.stub(subject, 'handleSearchMessage');
    var event = {type: 'iac-search-results'};
    subject.handleEvent(event);
    assert.ok(handleSearchMessageStub.calledOnce);
  });

  test('handleEvent() - open-app', function() {
    var deactivateStub = this.sinon.stub(subject, 'deactivate');
    var hideResultsStub = this.sinon.stub(subject, 'hideResults');

    // Does not hide with frontWindow
    subject.searchWindow = {
      frontWindow: {}
    };
    window.dispatchEvent(new CustomEvent('open-app'));
    assert.ok(deactivateStub.notCalled);
    assert.ok(hideResultsStub.notCalled);
    subject.searchWindow = null;

    // Bug 1071953 - Not called when showApp is false.
    window.dispatchEvent(new CustomEvent('open-app', {
      detail: {
        showApp: false
      }
    }));
    assert.ok(deactivateStub.notCalled);
    assert.ok(hideResultsStub.notCalled);

    // Does not hide if the search window is not open.
    window.dispatchEvent(new CustomEvent('searchclosed'));
    window.dispatchEvent(new CustomEvent('open-app'));
    assert.ok(deactivateStub.notCalled);
    assert.ok(hideResultsStub.notCalled);

    // Hides if the search window is open.
    window.dispatchEvent(new CustomEvent('searchopened'));

    window.dispatchEvent(new CustomEvent('open-app'));
    assert.ok(deactivateStub.calledOnce);
    assert.ok(hideResultsStub.calledOnce);
  });

  test('handleEvent() - permissiondialoghide: active', function() {
    var focusStub = this.sinon.stub(subject, 'focus');
    var event = {type: 'permissiondialoghide'};
    subject.active = true;
    subject.handleEvent(event);
    assert.ok(focusStub.calledOnce);
  });

  test('handleEvent() - permissiondialoghide: inactive', function() {
    var focusStub = this.sinon.stub(subject, 'focus');
    var event = {type: 'permissiondialoghide'};
    subject.active = false;
    subject.handleEvent(event);
    assert.isFalse(focusStub.called);
  });

  test('handleEvent() - global-search-request: is app', function() {
    var activeApp = {
      config: {url: 'app.url'},
      isBrowser: function() {},
      isActive: function() { return true; }
    };
    MockService.currentApp = activeApp;
    this.sinon.stub(activeApp, 'isBrowser').returns(true);
    var setInputStub = this.sinon.stub(subject, 'setInput');
    var activateStub = this.sinon.stub(subject, 'activate')
      .returns(Promise.resolve());
    var event = {type: 'global-search-request'};
    subject.handleEvent(event);
    assert.ok(setInputStub.calledWith('app.url'));
    assert.ok(activateStub.calledOnce);
  });

  test('handleEvent() - global-search-request: inactive app', function() {
    var activeApp = {
      config: {url: 'app.url'},
      isBrowser: function() {},
      isActive: function() { return false; }
    };
    MockService.currentApp = activeApp;
    this.sinon.stub(activeApp, 'isBrowser').returns(true);
    var setInputStub = this.sinon.stub(subject, 'setInput');
    var activateStub = this.sinon.stub(subject, 'activate');
    var event = {type: 'global-search-request'};
    subject.handleEvent(event);
    assert.ok(setInputStub.notCalled);
    assert.ok(activateStub.notCalled);
  });

  test('handleEvent() - global-search-request: non app', function(done) {
    var fakeTimer = this.sinon.useFakeTimers();
    var activeApp = {
      config: {url: 'app.url'},
      isBrowser: function() {
        return true;
      },
      appChrome: {
        maximize: function() {},
        isMaximized: function() {}
      },
      isActive: function() { return true; }
    };
    MockService.currentApp = activeApp;
    var maximize = this.sinon.spy(activeApp.appChrome, 'maximize');
    var resolved = Promise.resolve();
    this.sinon.stub(subject, 'activate', function() {
      return resolved;
    });
    this.sinon.spy(subject, 'hideResults');
    this.sinon.spy(subject, 'focus');
    this.sinon.spy(subject, 'selectAll');
    this.sinon.spy(subject, 'setInput');

    var event = {type: 'global-search-request'};
    subject.handleEvent(event);
    maximize.getCall(0).args[0]();

    resolved.then(function() {
      this.sinon.clock.tick();
      sinon.assert.callOrder(
        subject.setInput,
        activeApp.appChrome.maximize,
        subject.activate,
        subject.hideResults,
        subject.focus,
        subject.selectAll);
      fakeTimer.restore();
      done();
    }.bind(this));
  });

  test('handleEvent() - global-search-request: ' +
    'appChrome.maximize is called for apps', function(done) {
    var activeApp = {
      config: {url: 'app.url'},
      isBrowser: function() {
        return false;
      },
      appChrome: {
        maximize: function() {},
        isMaximized: function() {}
      },
      isActive: function() { return true; }
    };
    MockService.currentApp = activeApp;

    var maximize = this.sinon.spy(activeApp.appChrome, 'maximize');
    var resolved = Promise.resolve();
    this.sinon.stub(subject, 'activate', function() {
      return resolved;
    });
    this.sinon.spy(subject, 'focus');

    var event = {type: 'global-search-request'};
    subject.handleEvent(event);

    maximize.getCall(0).args[0]();

    resolved.then(function() {
      sinon.assert.callOrder(
        activeApp.appChrome.maximize,
        subject.activate,
        subject.focus);
      done();
    });
  });

  test('handleEvent() - global-search-request: private browsing', function() {
    var activeApp = {
      config: {url: 'app://system.gaiamobile.org/private_browser.html'},
      isBrowser: function() {},
      isPrivateBrowser: function() {
        return true;
      },
      isActive: function() { return true; }
    };
    MockService.currentApp = activeApp;
    this.sinon.stub(activeApp, 'isBrowser').returns(true);
    var setInputStub = this.sinon.stub(subject, 'setInput');
    var event = {type: 'global-search-request'};
    subject.handleEvent(event);

    // Should clear the input
    assert.ok(setInputStub.calledWith(''));
  });

  suite('handle hierarchy event - value selector', function() {
    test('Value selector event with front window',
      function() {
        var searchWindow = new MockSearchWindow();
        subject.searchWindow = searchWindow;
        var app1 = new MockAppWindow();
        this.sinon.stub(searchWindow, 'getTopMostWindow').returns(app1);
        this.sinon.stub(app1, 'broadcast');
        var respond =
          subject.respondToHierarchyEvent(new CustomEvent('mozChromeEvent', {
            detail: {
              type: 'inputmethod-contextchange'
            }
          }));
        assert.isFalse(respond);
        assert.isTrue(app1.broadcast.calledWith('inputmethod-contextchange'));
      });

    test('Value selector event without front window',
      function() {
        var searchWindow = new MockSearchWindow();
        subject.searchWindow = searchWindow;
        this.sinon.stub(searchWindow, 'broadcast');
        var respond =
          subject.respondToHierarchyEvent(new CustomEvent('mozChromeEvent', {
            detail: {
              type: 'inputmethod-contextchange'
            }
          }));
        assert.isFalse(respond);
        assert.isTrue(
          searchWindow.broadcast.calledWith('inputmethod-contextchange'));
      });

    test('Value selector event without search window',
      function() {
        subject.searchWindow = null;
        var respond =
          subject.respondToHierarchyEvent(new CustomEvent('mozChromeEvent', {
            detail: {
              type: 'inputmethod-contextchange'
            }
          }));
        assert.isTrue(respond);
      });
  });

  suite('handle hierarchy event - system-resize', function() {
    setup(function() {
      subject.activate();
    });

    teardown(function() {
      subject.searchWindow.frontWindow = undefined;
    });

    test('Search window with front window', function() {
      subject.searchWindow.frontWindow = {
        resize: function() {}
      };
      var stub = this.sinon.stub(subject.searchWindow.frontWindow, 'resize')
        .returns({ stub: 'promise'});
      var stubWaitUntil = this.sinon.stub();
      var evt = new CustomEvent('system-resize', {
        detail: {
          waitUntil: stubWaitUntil
        }
      });


      var stopsPropagation = subject.respondToHierarchyEvent(evt);

      assert.ok(stub.calledOnce);
      assert.ok(stubWaitUntil.calledWith({ stub: 'promise' }));
      assert.isFalse(stopsPropagation);

      stub.restore();
    });

    test('Search window without front window', function() {
      var stopsPropagation =
        subject.respondToHierarchyEvent(new CustomEvent('system-resize'));
      assert.isFalse(stopsPropagation);
    });

    test('Rocketbar is inactive', function() {
      subject.deactivate();
      var stopsPropagation =
        subject.respondToHierarchyEvent(new CustomEvent('system-resize'));
      assert.isTrue(stopsPropagation);
    });
  });

  test('_handle_home', function() {
    var deactivateStub = this.sinon.stub(subject, 'deactivate');
    var hideResultsStub = this.sinon.stub(subject, 'hideResults');
    this.sinon.stub(subject, 'isActive').returns(true);
    subject._handle_home();
    assert.ok(deactivateStub.calledOnce);
    assert.ok(hideResultsStub.calledOnce);
  });

  test('_handle_home - during activate', function() {
    var deactivateStub = this.sinon.stub(subject, 'deactivate');
    var hideResultsStub = this.sinon.stub(subject, 'hideResults');
    this.sinon.stub(subject, 'isActive').returns(true);

    var fakePromise = new MockPromise();
    subject._activateCall = fakePromise;

    subject._handle_home();
    fakePromise.mFulfillToValue();
    assert.ok(deactivateStub.calledOnce);
    assert.ok(hideResultsStub.calledOnce);
  });

  suite('handleInput()', function() {
    var showResultsStub, hideResultsStub, closeSearchStub;

    setup(function() {
      MockService.currentApp = {
        isPrivateBrowser: function() {
          return false;
        }
      };
      showResultsStub = this.sinon.stub(subject, 'showResults');
      hideResultsStub = this.sinon.stub(subject, 'hideResults');
      closeSearchStub = this.sinon.stub(subject, '_closeSearch');
    });

    test('With input', function() {
      subject.input.value = 'abc';
      subject.results.classList.add('hidden');
      subject.handleInput();
      assert.ok(showResultsStub.calledOnce);
      assert.ok(MockIACPort.mNumberOfMessages() == 1);
    });

    test('With no input', function() {
      subject.input.value = '';
      subject.results.classList.remove('hidden');
      subject.handleInput();
      assert.ok(hideResultsStub.calledOnce);
      assert.isFalse(closeSearchStub.calledOnce);
    });

    test('With utility tray active', function() {
      MockUtilityTray.active = true;
      subject.input.value = 'abc';
      subject.results.classList.remove('hidden');
      subject.handleInput();
      assert.ok(closeSearchStub.calledOnce);
      MockUtilityTray.active = false;
    });

  });

  test('handleSubmit()', function(done) {
    MockService.currentApp = {
      isPrivateBrowser: function() {
        return false;
      }
    };
    var event = {
      'preventDefault': function() {
        done();
      }
    };
    subject.handleSubmit(event);
    assert.ok(MockIACPort.mNumberOfMessages() == 1);
  });

  test('handleCancel()', function() {
    var deactivateStub = this.sinon.stub(subject, 'deactivate');
    var hideResultsStub = this.sinon.stub(subject, 'hideResults');
    subject.handleCancel();
    assert.ok(deactivateStub.calledOnce);
    assert.ok(hideResultsStub.calledOnce);
  });

  test('loadSearchApp()', function() {
    var initSearchConnectionStub = this.sinon.stub(subject,
      'initSearchConnection');
    subject._searchAppURL = 'http://search.example.com/';
    subject._searchManifestURL = 'http://search.example.com/manifest.webapp';

    // searchFrame DOM
    subject.loadSearchApp();
    assert.ok(initSearchConnectionStub.calledOnce);

    initSearchConnectionStub.restore();
  });

  test('initSearchConnection()', function(done) {
    var handleSearchMessageStub = this.sinon.stub(subject,
      'handleSearchMessage');
    subject._pendingMessage = 'hi';
    var realMozApps = navigator.mozApps;
    navigator.mozApps = {};
    var app = { result: {
       'connect': function() {
          return {
            'then': function(success, failure) {
              var ports = ['abc'];
              success(ports);
            }
          };
       }
    }};
    subject._port = null;
    navigator.mozApps.getSelf = function() { return app; };
    subject.initSearchConnection().then(() => {
      assert.equal(subject._port, 'abc');
      assert.equal(subject._pendingMessage, null);
      assert.ok(handleSearchMessageStub.calledOnce);
      navigator.mozApps = realMozApps;
      handleSearchMessageStub.restore();
      done();
    });
    app.onsuccess({target: app});
  });

  test('handleSearchMessage()', function() {
    MockService.currentApp = {
      isPrivateBrowser: function() {
        return false;
      }
    };
    var initSearchConnectionStub = this.sinon.stub(subject,
      'initSearchConnection');
    var hideResultsStub = this.sinon.stub(subject, 'hideResults');

    // Input message
    var event = {
      type: 'iac-search-results',
      detail: {
        action: 'input',
        input: 'http://example.com'
      }
    };
    var spy = sinon.spy(subject, 'focus');
    subject.handleSearchMessage(event);
    assert.equal(subject.input.value, 'http://example.com');
    assert.isTrue(spy.called);
    spy.restore();

    // Hide message
    event = {
      type: 'iac-search-results',
      detail: {
        action: 'hide'
      }
    };
    subject.handleSearchMessage(event);
    assert.ok(hideResultsStub.calledOnce);

    // private-window message
    var eventStub = sinon.spy(window, 'dispatchEvent');
    subject.handleSearchMessage({
      type: 'iac-search-results',
      detail: {
        action: 'private-window'
      }
    });
    assert.equal(eventStub.getCall(0).args[0].type, 'new-private-window');

    // No _port
    subject._port = null;
    subject.handleSearchMessage(event);
    assert.equal(subject._pendingMessage, event);
    assert.ok(initSearchConnectionStub.calledOnce);

    initSearchConnectionStub.restore();
    hideResultsStub.restore();
    eventStub.restore();
  });

  test('updateSearchIndex()', function() {
    var postMessageStub = this.sinon.stub(subject._port, 'postMessage');
    subject.updateSearchIndex();
    assert.ok(postMessageStub.calledOnce);
    postMessageStub.restore();
  });

  test('handleActivity()', function() {
    subject.loadSearchApp();

    var stubDispatchEvent = this.sinon.stub(subject.searchWindow,
      'broadcast');

    subject.respondToHierarchyEvent({
      type: 'launchactivity',
      detail: {
        isActivity: true,
        inline: true,
        parentApp: subject.searchWindow.manifestURL
      },
      stopImmediatePropagation: function() {}
    });
    assert.isTrue(stubDispatchEvent.called);
    assert.equal(stubDispatchEvent.getCall(0).args[0], 'launchactivity');
    assert.equal(stubDispatchEvent.getCall(0).args[1].isActivity, true);
  });

  test('handleSearchTerminated() - calls render after crash', function() {
    subject.start();

    subject._searchAppURL = 'http://search.example.com/';
    subject._searchManifestURL = 'http://search.example.com/manifest.webapp';

    subject.searchWindow = null;
    var spy = this.sinon.spy(window, 'MockSearchWindow');

    subject.loadSearchApp();
    assert.ok(spy.calledWithNew);
    spy.restore();

    // Dispatch a crash event.
    window.dispatchEvent(new CustomEvent('searchterminated'));

    assert.equal(subject.searchWindow, null);
    assert.equal(subject._port, null);

    subject.loadSearchApp();
    assert.ok(spy.calledWithNew);

    assert.ok(subject.searchWindow instanceof MockSearchWindow);
    assert.equal(subject._port, null);
  });

  test('open', function() {
    subject.activate();
    var openStub = this.sinon.stub(subject.searchWindow, 'open');
    var closeStub = this.sinon.stub(subject.searchWindow, 'close');
    subject.showResults();
    assert.isTrue(openStub.called);
    subject.hideResults();
    assert.isTrue(closeStub.called);
  });

  test('search window should not be opened again if it is dead', function() {
    subject.activate();
    this.sinon.stub(subject.searchWindow, 'isDead').returns(true);
    var openStub = this.sinon.stub(subject.searchWindow, 'open');
    subject.showResults();
    assert.isFalse(openStub.called);
  });

  test('focus after geolocation hidden', function() {
    var focusStub = this.sinon.stub(subject, 'focus');
    subject.activate();
    subject.active = true;
    subject.handleEvent({type: 'permissiondialoghide'});
    assert.ok(focusStub.calledOnce);
    focusStub.restore();
  });

  test('Dont clear input when search app crashes', function() {
    subject.input.value = 'value to not clear';
    window.dispatchEvent(new CustomEvent('searchterminated'));
    assert.equal(subject.input.value, 'value to not clear');
  });

  test('focus on render after a tick', function(done) {
    var focusStub = this.sinon.stub(subject, 'focus');

    // Set the rocketbar to active to trigger an immediate promise resolution.
    subject.active = true;

    var activation = subject.activate();
    subject.handleSearchMessage({detail: {action: 'render'}});

    sinon.assert.notCalled(focusStub);
    activation.then(function() {
      sinon.assert.calledOnce(focusStub);
      done();
    });
  });

  test('calls _closeSearch if the utility tray is active', function(done) {
    subject.active = true;
    MockUtilityTray.active = true;

    var stub = this.sinon.stub(subject, '_closeSearch');
    subject.activate().then(() => {
      assert.ok(stub.calledOnce);
      MockUtilityTray.active = false;
      done();
    });
  });

  suite('activate with a transition', function() {
    test('done after transition and search app load', function(done) {
      this.sinon.stub(subject, 'loadSearchApp').returns(Promise.resolve());
      subject.activate().then(done);
      subject.backdrop.dispatchEvent(new CustomEvent('transitionend'));
    });

    test('done after safety timeout and search app load', function(done) {
      this.sinon.stub(subject, 'loadSearchApp').returns(Promise.resolve());
      subject.activate().then(done);
      this.sinon.clock.tick(500);
    });
  });

  suite('deactivate with a transition', function() {
    setup(function() {
      subject.active = true;
      subject.form.classList.remove('hidden');
      subject.rocketbar.classList.add('active');
      subject.focused = false;
    });

    test('should update the css classed properly', function() {
      subject.deactivate();
      assert.isTrue(subject.form.classList.contains('hidden'));
      assert.isFalse(subject.rocketbar.classList.contains('active'));
    });

    test('should publish rocketbar-overlayclosed after the transition',
    function(done) {
      var published = false;
      window.addEventListener('rocketbar-overlayclosed', function gotIt() {
        published = true;
        window.removeEventListener('rocketbar-overlayclosed', gotIt);

        assert.ok(published);
        done();
      });
      subject.deactivate();
      assert.isFalse(published);
      subject.backdrop.dispatchEvent(new CustomEvent('transitionend'));
    });

    suite('when the keyboard is displayed', function() {
      setup(function() {
        subject.screen.classList.add('rocketbar-focused');
        subject.focused = true;
        this.sinon.spy(subject, 'blur');
      });

      test('should blur, wait for the keyboard to leave, then exit',
      function(done) {
        window.addEventListener('rocketbar-overlayclosed', function gotIt() {
          window.removeEventListener('rocketbar-overlayclosed', gotIt);
          done();
        });

        subject.deactivate();

        sinon.assert.calledOnce(subject.blur);
        assert.isTrue(subject.screen.classList.contains('rocketbar-focused'));

        window.dispatchEvent(new CustomEvent('keyboardhidden'));
        assert.isFalse(subject.screen.classList.contains('rocketbar-focused'));

        subject.backdrop.dispatchEvent(new CustomEvent('transitionend'));
      });
    });
  });
});

