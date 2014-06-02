'use strict';
/* global Rocketbar, MocksHelper, MockAppWindow, MockAppWindowManager,
          MockIACPort */

requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_search_window.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_settings_url.js');
requireApp('system/test/unit/mock_iac_handler.js');

var mocksForRocketbar = new MocksHelper([
  'AppWindow',
  'AppWindowManager',
  'SearchWindow',
  'SettingsListener',
  'SettingsURL',
  'IACPort'
]).init();

suite('system/Rocketbar', function() {
  mocksForRocketbar.attachTestHelpers();
  var stubById;
  var subject;

  setup(function(done) {
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
  });

  test('start()', function() {
    var addEventListenersStub = this.sinon.stub(subject,
      'addEventListeners');
    subject.start();
    assert.ok(addEventListenersStub.calledOnce);
    assert.ok(subject.body.classList.contains('rb-enabled'));
    assert.ok(subject.enabled);
    addEventListenersStub.restore();
  });

  test('stop()', function() {
    var removeEventListenersStub = this.sinon.stub(subject,
      'removeEventListeners');
    subject.body.classList.add('rb-enabled');
    subject.enabled = true;
    subject.stop();
    assert.ok(removeEventListenersStub.calledOnce);
    assert.equal(subject.body.classList.contains('rb-enabled'), false);
    assert.equal(subject.enabled, false);
    removeEventListenersStub.restore();
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
    assert.ok(windowAddEventListenerStub.calledWith('applocationchange'));
    assert.ok(windowAddEventListenerStub.calledWith('home'));
    assert.ok(windowAddEventListenerStub.calledWith('cardviewclosedhome'));
    assert.ok(windowAddEventListenerStub.calledWith('appopened'));
    assert.ok(windowAddEventListenerStub.calledWith('homescreenopening'));
    assert.ok(windowAddEventListenerStub.calledWith('stackchanged'));
    assert.ok(rocketbarAddEventListenerStub.calledWith('touchstart'));
    assert.ok(rocketbarAddEventListenerStub.calledWith('touchmove'));
    assert.ok(rocketbarAddEventListenerStub.calledWith('touchend'));
    assert.ok(rocketbarAddEventListenerStub.calledWith('transitionend'));
    assert.ok(inputAddEventListenerStub.calledWith('blur'));
    assert.ok(inputAddEventListenerStub.calledWith('input'));
    assert.ok(formAddEventListenerStub.calledWith('submit'));
    assert.ok(windowAddEventListenerStub.calledWith('iac-search-results'));

    windowAddEventListenerStub.restore();
    rocketbarAddEventListenerStub.restore();
    inputAddEventListenerStub.restore();
    formAddEventListenerStub.restore();
  });

  test('removeEventListeners()', function() {
    var windowRemoveEventListenerStub = this.sinon.stub(window,
      'removeEventListener');
    var rocketbarRemoveEventListenerStub = this.sinon.stub(subject.rocketbar,
      'removeEventListener');
    var inputRemoveEventListenerStub = this.sinon.stub(subject.input,
      'removeEventListener');
    var formRemoveEventListenerStub = this.sinon.stub(subject.form,
      'removeEventListener');

    subject.removeEventListeners();

    assert.ok(windowRemoveEventListenerStub.calledWith('apploading'));
    assert.ok(windowRemoveEventListenerStub.calledWith('apptitlechange'));
    assert.ok(windowRemoveEventListenerStub.calledWith('applocationchange'));
    assert.ok(windowRemoveEventListenerStub.calledWith('home'));
    assert.ok(windowRemoveEventListenerStub.calledWith('cardviewclosedhome'));
    assert.ok(windowRemoveEventListenerStub.calledWith('appopened'));
    assert.ok(windowRemoveEventListenerStub.calledWith('homescreenopening'));
    assert.ok(windowRemoveEventListenerStub.calledWith('stackchanged'));
    assert.ok(rocketbarRemoveEventListenerStub.calledWith('touchstart'));
    assert.ok(rocketbarRemoveEventListenerStub.calledWith('touchmove'));
    assert.ok(rocketbarRemoveEventListenerStub.calledWith('touchend'));
    assert.ok(rocketbarRemoveEventListenerStub.calledWith('transitionend'));
    assert.ok(inputRemoveEventListenerStub.calledWith('blur'));
    assert.ok(inputRemoveEventListenerStub.calledWith('input'));
    assert.ok(formRemoveEventListenerStub.calledWith('submit'));
    assert.ok(windowRemoveEventListenerStub.calledWith('iac-search-results'));

    windowRemoveEventListenerStub.restore();
    rocketbarRemoveEventListenerStub.restore();
    inputRemoveEventListenerStub.restore();
    formRemoveEventListenerStub.restore();
  });

  test('expand() - collapsed', function() {
    subject.expand();
    assert.ok(subject.rocketbar.classList.contains('expanded'));
    assert.ok(subject.screen.classList.contains('rocketbar-expanded'));
    assert.ok(subject.expanded);
    assert.ok(subject.transitioning === true);
  });

  test('expand() - already expanded', function() {
    subject.expanded = true;
    subject.expand();
    assert.equal(subject.rocketbar.classList.contains('expanded'), false);
  });

  test('expand() - transitioning', function() {
    subject.transitioning = true;
    subject.expand();
    assert.equal(subject.rocketbar.classList.contains('expanded'), false);
  });

  test('expand() - in fullscreen - not implemented', function() {
    var stubApp = {
      isFullScreen: function() { return true; }
    };

    MockAppWindowManager.mActiveApp = stubApp;

    subject.expand();
    assert.equal(subject.rocketbar.classList.contains('expanded'), false);
  });

  test('collapse() - expanded', function() {
    var hideResultsStub = this.sinon.stub(subject, 'hideResults');
    var blurStub = this.sinon.stub(subject, 'blur');
    var exitHomeStub = this.sinon.stub(subject, 'exitHome');
    subject.active = true;
    subject.expanded = true;
    subject.collapse();
    assert.ok(exitHomeStub.calledOnce);
    assert.ok(hideResultsStub.calledOnce);
    assert.ok(blurStub.calledOnce);
    assert.equal(subject.rocketbar.classList.contains('expanded'), false);
    assert.equal(subject.screen.classList.contains('rocketbar-expanded'),
      false);
    assert.equal(subject.expanded, false);
    assert.ok(subject.transitioning === true);
    hideResultsStub.restore();
    blurStub.restore();
    exitHomeStub.restore();
  });

  test('collapse() - already collapsed', function() {
    var hideResultsStub = this.sinon.stub(subject, 'hideResults');
    var blurStub = this.sinon.stub(subject, 'blur');
    subject.collapse();
    assert.ok(hideResultsStub.notCalled);
    assert.ok(blurStub.notCalled);
    hideResultsStub.restore();
    blurStub.restore();
  });

  test('collapse() - transitioning', function() {
    var hideResultsStub = this.sinon.stub(subject, 'hideResults');
    var blurStub = this.sinon.stub(subject, 'blur');
    subject.transitioning = true;
    subject.collapse();
    assert.ok(hideResultsStub.notCalled);
    assert.ok(blurStub.notCalled);
    hideResultsStub.restore();
    blurStub.restore();
  });

  test('enterHome() - not already home', function() {
    navigator.mozL10n = {
      'get': function() {
        return 'Search';
      }
    };
    subject.onHomescreen = false;
    var clearStub = this.sinon.stub(subject, 'clear');
    var expandStub = this.sinon.stub(subject, 'expand');
    subject.enterHome();
    assert.ok(subject.onHomescreen);
    assert.ok(expandStub.calledOnce);
    assert.ok(clearStub.calledOnce);
    expandStub.restore();
    clearStub.restore();
  });

  test('enterHome() - already home', function() {
    var expandStub = this.sinon.stub(subject, 'expand');
    subject.onHomescreen = true;
    subject.enterHome();
    assert.ok(subject.onHomescreen);
    assert.ok(expandStub.notCalled);
    expandStub.restore();
  });

  test('exitHome()', function() {
    subject.onHomescreen = true;
    subject.exitHome();
    assert.ok(!subject.onHomescreen);
  });

  test('showResults()', function() {
    subject.results.classList.add('hidden');
    subject.showResults();
    assert.equal(subject.results.classList.contains('hidden'), false);
  });

  test('hideResults()', function() {
    subject.hideResults();
    assert.ok(subject.results.classList.contains('hidden'));
    assert.ok(MockIACPort.mNumberOfMessages() == 1);
  });

  test('showTaskManager()', function() {
    var showResultsStub = this.sinon.stub(subject, 'showResults');
    navigator.mozL10n = {
      'get': function() {
        return 'Search';
      }
    };
    subject.showTaskManager();
    assert.ok(showResultsStub.calledOnce);
    assert.equal(subject.input.value, '');
    assert.equal(subject.titleContent.textContent, 'Search');
    showResultsStub.restore();
  });

  test('focus()', function() {
    var loadSearchAppStub = this.sinon.stub(subject, 'loadSearchApp');
    subject.form.classList.add('hidden');
    subject.activate();
    subject.focus();
    assert.ok(subject.rocketbar.classList.contains('active'));
    assert.ok(subject.title.classList.contains('hidden'));
    assert.equal(subject.form.classList.contains('hidden'), false);
    assert.ok(subject.screen.classList.contains('rocketbar-focused'));
    assert.ok(subject.active);
    assert.ok(loadSearchAppStub.calledOnce);
    loadSearchAppStub.restore();
  });

  test('blur() - results hidden', function() {
    subject.results.classList.add('hidden');
    subject.title.classList.add('hidden');
    subject.active = true;
    subject.deactivate();
    assert.equal(subject.title.classList.contains('hidden'), false);
    assert.ok(subject.form.classList.contains('hidden'));
    assert.ok(!subject.screen.classList.contains('rocketbar-focused'));
    assert.equal(subject.active, false);
    assert.ok(!subject.rocketbar.classList.contains('active'));
  });

  test('blur() - results shown', function() {
    subject.deactivate();
    assert.equal(subject.form.classList.contains('hidden'), false);
  });

  test('handleAppChange() - app', function() {
    var handleLocationChangeStub = this.sinon.stub(subject,
      'handleLocationChange');
    var handleTitleChangeStub = this.sinon.stub(subject,
      'handleTitleChange');
    var exitHomeStub = this.sinon.stub(subject, 'exitHome');
    var collapseStub = this.sinon.stub(subject, 'collapse');
    var hideResultsStub = this.sinon.stub(subject, 'hideResults');
    subject.handleAppChange({
      detail: {
        isBrowser: function() { return false; }
      }
     });
     assert.ok(handleLocationChangeStub.calledOnce);
     assert.ok(handleTitleChangeStub.calledOnce);
     assert.ok(exitHomeStub.calledOnce);
     assert.ok(collapseStub.calledOnce);
     assert.ok(hideResultsStub.calledOnce);
     assert.equal(subject.currentScrollPosition, 0);
     handleLocationChangeStub.restore();
     handleTitleChangeStub.restore();
     exitHomeStub.restore();
     collapseStub.restore();
     hideResultsStub.restore();
  });

  test('handleAppChange() - non-app', function() {
    var handleLocationChangeStub = this.sinon.stub(subject,
      'handleLocationChange');
    var handleTitleChangeStub = this.sinon.stub(subject,
      'handleTitleChange');
    var exitHomeStub = this.sinon.stub(subject, 'exitHome');
    var expandStub = this.sinon.stub(subject, 'expand');
    var collapseStub = this.sinon.stub(subject, 'collapse');
    var hideResultsStub = this.sinon.stub(subject, 'hideResults');
    subject.handleAppChange({
      detail: {
        isBrowser: function() { return true; }
      }
     });
    assert.ok(handleLocationChangeStub.calledOnce);
    assert.ok(handleTitleChangeStub.calledOnce);
    assert.ok(exitHomeStub.calledOnce);
    assert.ok(expandStub.calledOnce);
    assert.ok(collapseStub.notCalled);
    assert.ok(hideResultsStub.calledOnce);
    assert.equal(subject.currentScrollPosition, 0);
    handleLocationChangeStub.restore();
    handleTitleChangeStub.restore();
    exitHomeStub.restore();
    expandStub.restore();
    collapseStub.restore();
    hideResultsStub.restore();
  });

  test('handleTitleChange()', function() {
    var updateSearchIndexStub = this.sinon.stub(subject,
      'updateSearchIndex');

    // Title
    var event = new CustomEvent('apptitlechange', { 'detail': {
      'title': 'Example Title'
    }});
    subject.handleTitleChange(event);
    assert.equal(subject.titleContent.textContent, 'Example Title');
    assert.ok(updateSearchIndexStub.calledOnce);

    // No title
    event = new CustomEvent('apptitlechange', { 'detail': {
    }});
    subject.handleTitleChange(event);
    assert.equal(subject.titleContent.textContent, '');

    updateSearchIndexStub.restore();
  });

  test('handleTitleChange() - not current window', function() {
    var updateSearchIndexStub = this.sinon.stub(subject,
      'updateSearchIndex');
    var appWindow = new MockAppWindow();
    appWindow.isActive = function() {
      return false;
    };
    var event = new CustomEvent('apptitlechange', { 'detail' : appWindow});
    subject.handleTitleChange(event);
    assert.ok(updateSearchIndexStub.notCalled);
    updateSearchIndexStub.restore();
  });

  test('handleScroll() - app', function() {
    var expandStub = this.sinon.stub(subject, 'expand');
    var collapseStub = this.sinon.stub(subject, 'collapse');
    subject.handleScroll({
      detail: {
        manifestURL: 'http://example.com/manifest.webapp'
      }
    });
    assert.ok(expandStub.notCalled);
    assert.ok(collapseStub.notCalled);
    expandStub.restore();
    collapseStub.restore();
  });

  test('handleScroll() - Scroll up on non-app with expanded Rocketbar',
    function() {
    var expandStub = this.sinon.stub(subject, 'expand');
    var collapseStub = this.sinon.stub(subject, 'collapse');
    subject.expanded = true;
    subject.handleScroll({
      detail: {
        manifestURL: null,
        scrollPosition: 1
      }
    });
    assert.ok(expandStub.notCalled);
    assert.ok(collapseStub.calledOnce);
    expandStub.restore();
    collapseStub.restore();
  });

  test('handleScroll() - Scroll down on non-app with collapsed Rocketbar',
      function() {
    var expandStub = this.sinon.stub(subject, 'expand');
    var collapseStub = this.sinon.stub(subject, 'collapse');
    subject.expanded = false;
    subject.handleScroll({
      detail: {
        manifestURL: null,
        scrollPosition: 1
      }
    });
    assert.ok(expandStub.notCalled);
    assert.ok(collapseStub.notCalled);
    expandStub.restore();
    collapseStub.restore();
  });

  test('handleScroll() - Scroll up non-app with collapsed Rocketbar',
      function() {
    var expandStub = this.sinon.stub(subject, 'expand');
    var collapseStub = this.sinon.stub(subject, 'collapse');
    subject.expanded = false;
    subject.currentScrollPosition = 10;
    subject.handleScroll({
      detail: {
        manifestURL: null,
        scrollPosition: 3
      }
    });
    assert.ok(expandStub.calledOnce);
    assert.ok(collapseStub.notCalled);
    expandStub.restore();
    collapseStub.restore();
  });

  test('handleScroll() - Tiny scroll up non-app with collapsed Rocketbar',
      function() {
    var expandStub = this.sinon.stub(subject, 'expand');
    var collapseStub = this.sinon.stub(subject, 'collapse');
    subject.expanded = false;
    subject.currentScrollPosition = 10;
    subject.handleScroll({
      detail: {
        manifestURL: null,
        scrollPosition: 8
      }
    });
    assert.ok(expandStub.notCalled);
    assert.ok(collapseStub.notCalled);
    expandStub.restore();
    collapseStub.restore();
  });

  test('handleLocationChange() - browser window', function() {
    var updateSearchIndexStub = this.sinon.stub(subject,
      'updateSearchIndex');
    var deactivateStub = this.sinon.stub(subject, 'deactivate');
    subject.titleContent.textConent = 'value to clear';
    var event = new CustomEvent('apptlocationchange', { 'detail': {
      'config': {
        'url': 'http://example.com'
      }
    }});
    subject.handleLocationChange(event);
    assert.equal(subject.input.value, 'http://example.com');
    assert.equal(subject.titleContent.textContent, '');
    assert.ok(updateSearchIndexStub.calledOnce);
    assert.ok(deactivateStub.calledOnce);
    updateSearchIndexStub.restore();
    deactivateStub.restore();
  });

  test('handleLocationChange() - app window', function() {
    var updateSearchIndexStub = this.sinon.stub(subject,
      'updateSearchIndex');
    subject.input.value = 'value to clear';
    subject.titleContent.textConent = 'value to clear';
    var event = new CustomEvent('apptlocationchange', { 'detail': {
      'config': {
        'url': 'http://example.com'
      },
      'manifestURL': 'http://example.com/manifest.webapp'
    }});
    subject.handleLocationChange(event);
    assert.equal(subject.input.value, '');
    assert.equal(subject.titleContent.textContent, '');
    assert.ok(updateSearchIndexStub.calledOnce);
    updateSearchIndexStub.restore();
  });

  test('handleHome()', function() {
    var hideResultsStub = this.sinon.stub(subject, 'hideResults');
    var blurStub = this.sinon.stub(subject, 'deactivate');
    subject.input.value = 'value to clear';
    subject.handleHome();
    assert.ok(hideResultsStub.calledOnce);
    assert.equal(subject.input.value, '');
    assert.equal(subject.titleContent.textContent, 'Search');
    assert.ok(blurStub.calledOnce);
    hideResultsStub.restore();
    blurStub.restore();
  });

  test('handleTouch() - touchstart', function() {
    var event = {
      type: 'touchstart',
      touches: [
        {
          pageY: 3
        }
      ]
    };
    subject.handleTouch(event);
    assert.equal(subject._wasClicked, false);
    assert.equal(subject._touchStart, 3);
  });

  test('handleTouch() - touchmove', function(done) {
    // Assumes EXPANSION_THRESHOLD: 5, TASK_MANAGER_THRESHOLD: 200
    var expandStub = this.sinon.stub(subject, 'expand');
    var collapseStub = this.sinon.stub(subject, 'collapse');
    var showTaskManagerStub = this.sinon.stub(subject, 'showTaskManager');

    // Expand
    subject._touchStart = 1;
    var event = {
      type: 'touchmove',
      touches: [
        {
          pageY: 11 // Greater than 1+5, less than 1+200
        }
      ]
    };
    subject.handleTouch(event);
    assert.ok(expandStub.calledOnce);
    assert.ok(collapseStub.notCalled);
    assert.ok(showTaskManagerStub.notCalled);

    // Collapse
    event = {
      type: 'touchmove',
      touches: [
        {
          pageY: -7 // Less than 1-5
        }
      ]
    };
    subject.handleTouch(event);
    assert.ok(collapseStub.calledOnce);
    assert.ok(showTaskManagerStub.notCalled);

    // Show task manager
    event = {
      type: 'touchmove',
      touches: [
        {
          pageY: 202 // More than 1+200
        }
      ]
    };

    window.addEventListener('taskmanagershow', function taskmanagershow() {
      window.removeEventListener('taskmanagershow', taskmanagershow);
      done();
    });

    subject.handleTouch(event);

    expandStub.restore();
    collapseStub.restore();
    showTaskManagerStub.restore();
  });

  test('handleTouch() - touchend', function() {
    // Assumes EXPANSION_THRESHOLD: 5
    var handleClickStub = this.sinon.stub(subject, 'handleClick');

    // Not a click
    subject._touchStart = 1;
    var event = {
      type: 'touchend',
      changedTouches: [
        {
          pageY: 7 // More than 1+5
        }
      ]
    };
    subject.handleTouch(event);
    assert.equal(subject._touchStart, -1);
    assert.equal(handleClickStub.wasCalled);

    // A click
    event = {
      type: 'touchend',
      changedTouches: [
        {
          pageY: 3 // Between -1-5 and -1+5
        }
      ]
    };
    subject.handleTouch(event);
    assert.ok(handleClickStub.calledOnce);
    handleClickStub.restore();
  });

  test('handleClick()', function() {
    var focusStub = this.sinon.stub(subject, 'focus');
    var expandStub = this.sinon.stub(subject, 'expand');

    // Expanded
    subject.expanded = true;
    subject.handleClick();
    assert.ok(focusStub.calledOnce);

    // Collapsed
    subject.active = false;
    subject.expanded = false;
    subject.handleClick();
    assert.ok(subject._wasClicked);
    assert.ok(expandStub.calledOnce);

    focusStub.restore();
    expandStub.restore();
  });

  test('handleTransitionEnd()', function() {
    var focusStub = this.sinon.stub(subject, 'focus');

    // Not expanded
    subject.handleTransitionEnd();
    assert.ok(focusStub.notCalled);

    // Expanded
    subject.expanded = true;
    subject._wasClicked = true;
    subject.transitioning = true;
    subject.handleTransitionEnd();
    assert.ok(focusStub.calledOnce);
    assert.ok(!subject._wasClicked);
    assert.equal(subject.transitioning, false);
    focusStub.restore();
  });

  test('handleInput()', function(done) {
    var showResultsStub = this.sinon.stub(subject, 'showResults');
    var hideResultsStub = this.sinon.stub(subject, 'hideResults');

    // With input
    subject.input.value = 'abc';
    subject.results.classList.add('hidden');
    subject.handleInput();
    assert.ok(showResultsStub.calledOnce);
    assert.ok(MockIACPort.mNumberOfMessages() == 1);

    // With no input
    subject.input.value = '';
    subject.results.classList.remove('hidden');
    subject.handleInput();
    assert.ok(hideResultsStub.calledOnce);

    // Task manager shown
    subject.screen.classList.add('task-manager');
    window.addEventListener('taskmanagerhide', function() {
      done();
    });
    subject.handleInput();

    showResultsStub.restore();
    hideResultsStub.restore();
  });

  test('handleSubmit()', function(done) {
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

  test('handleKeyboardChange()', function(done) {
    var event = {
      'stopImmediatePropagation': function() {
        done();
      }
    };
    subject.handleKeyboardChange(event);
  });

  test('handleStackChanged() - empty stack', function() {
    subject.cardView = true;
    var focusStub = this.sinon.stub(subject, 'activate');
    var event = {
      detail: {
        sheets: []
      }
    };
    subject.handleStackChanged(event);
    assert.ok(focusStub.calledOnce);
    focusStub.restore();
  });

  test('handleStackChanged() - non-empty stack', function() {
    subject.expanded = true;
    var focusStub = this.sinon.stub(subject, 'focus');
    var event = {
      detail: {
        sheets: ['a', 'b', 'c']
      }
    };
    subject.handleStackChanged(event);
    assert.ok(focusStub.notCalled);
    focusStub.restore();
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

  test('initSearchConnection()', function() {
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
    subject.initSearchConnection();
    app.onsuccess();
    assert.equal(subject._port, 'abc');
    assert.equal(subject._pendingMessage, null);
    assert.ok(handleSearchMessageStub.calledOnce);
    navigator.mozApps = realMozApps;
    handleSearchMessageStub.restore();
  });

  test('handleSearchMessage()', function() {
    var initSearchConnectionStub = this.sinon.stub(subject,
      'initSearchConnection');
    var hideResultsStub = this.sinon.stub(subject, 'hideResults');
    var collapseStub = this.sinon.stub(subject, 'collapse');

    // Input message
    var event = {
      type: 'iac-search-results',
      detail: {
        action: 'input',
        input: 'http://example.com'
      }
    };
    subject.handleSearchMessage(event);
    assert.equal(subject.input.value, 'http://example.com');

    // Hide message
    event = {
      type: 'iac-search-results',
      detail: {
        action: 'hide'
      }
    };
    subject.handleSearchMessage(event);
    assert.ok(hideResultsStub.calledOnce);
    assert.ok(collapseStub.calledOnce);

    // No _port
    subject._port = null;
    subject.handleSearchMessage(event);
    assert.equal(subject._pendingMessage, event);
    assert.ok(initSearchConnectionStub.calledOnce);

    initSearchConnectionStub.restore();
    hideResultsStub.restore();
    collapseStub.restore();
  });

  test('updateSearchIndex()', function() {
    var postMessageStub = this.sinon.stub(subject._port, 'postMessage');
    subject.updateSearchIndex();
    assert.ok(postMessageStub.calledOnce);
    postMessageStub.restore();
  });

  test('handleSearchCrashed() - calls render after crash', function() {
    subject.start();

    subject._searchAppURL = 'http://search.example.com/';
    subject._searchManifestURL = 'http://search.example.com/manifest.webapp';

    subject.searchWindow = null;
    var spy = this.sinon.spy(window, 'MockSearchWindow');

    subject.loadSearchApp();
    assert.ok(spy.calledWithNew);
    spy.restore();

    // Dispatch a crash event.
    window.dispatchEvent(new CustomEvent('searchcrashed'));
    subject.loadSearchApp();
    assert.ok(spy.calledWithNew);
  });

  test('setVisible', function() {
    subject.activate();
    var setVisibleStub = this.sinon.stub(subject.searchWindow, '_setVisible');
    subject.showResults();
    setVisibleStub.calledWith(true);
    subject.hideResults();
    setVisibleStub.calledWith(false);
    setVisibleStub.restore();
  });
});

