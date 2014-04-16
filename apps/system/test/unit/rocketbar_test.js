'use strict';
/* global Rocketbar, MocksHelper, MockAppWindow, MockIACPort, SearchWindow */

requireApp('system/test/unit/mock_app_window.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_iac_handler.js');

var mocksForRocketbar = new MocksHelper([
  'AppWindow',
  'SettingsListener',
  'IACPort'
]).init();

mocha.globals(['SearchWindow', 'Rocketbar']);

suite('system/Rocketbar', function() {
  mocksForRocketbar.attachTestHelpers();
  var stubById;

  setup(function(done) {
    stubById = this.sinon.stub(document, 'getElementById', function(id) {
      if (id == 'rocketbar-input') {
        return document.createElement('input');
      } else {
        return document.createElement('div');
      }
    });

    requireApp('system/js/search_window.js');
    requireApp('system/js/rocketbar.js', function() {
      Rocketbar.init();
      Rocketbar._port = MockIACPort;
      done();
    });
  });

  teardown(function() {
    stubById.restore();
    MockIACPort.mTearDown();
    Rocketbar._port = null;
  });

  test('enable()', function() {
    var addEventListenersStub = this.sinon.stub(Rocketbar,
      'addEventListeners');
    Rocketbar.enable();
    assert.ok(addEventListenersStub.calledOnce);
    assert.ok(Rocketbar.body.classList.contains('rb-enabled'));
    assert.ok(Rocketbar.enabled);
    addEventListenersStub.restore();
  });

  test('disable()', function() {
    var removeEventListenersStub = this.sinon.stub(Rocketbar,
      'removeEventListeners');
    Rocketbar.body.classList.add('rb-enabled');
    Rocketbar.enabled = true;
    Rocketbar.disable();
    assert.ok(removeEventListenersStub.calledOnce);
    assert.equal(Rocketbar.body.classList.contains('rb-enabled'), false);
    assert.equal(Rocketbar.enabled, false);
    removeEventListenersStub.restore();
  });

  test('addEventListeners()', function() {
    var windowAddEventListenerStub = this.sinon.stub(window,
      'addEventListener');
    var rocketbarAddEventListenerStub = this.sinon.stub(Rocketbar.rocketbar,
      'addEventListener');
    var inputAddEventListenerStub = this.sinon.stub(Rocketbar.input,
      'addEventListener');
    var formAddEventListenerStub = this.sinon.stub(Rocketbar.form,
      'addEventListener');

    Rocketbar.addEventListeners();

    assert.ok(windowAddEventListenerStub.calledWith('apploading'));
    assert.ok(windowAddEventListenerStub.calledWith('appforeground'));
    assert.ok(windowAddEventListenerStub.calledWith('apptitlechange'));
    assert.ok(windowAddEventListenerStub.calledWith('applocationchange'));
    assert.ok(windowAddEventListenerStub.calledWith('home'));
    assert.ok(windowAddEventListenerStub.calledWith('cardviewclosedhome'));
    assert.ok(windowAddEventListenerStub.calledWith('appopened'));
    assert.ok(windowAddEventListenerStub.calledWith('homescreenopened'));
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
    var rocketbarRemoveEventListenerStub = this.sinon.stub(Rocketbar.rocketbar,
      'removeEventListener');
    var inputRemoveEventListenerStub = this.sinon.stub(Rocketbar.input,
      'removeEventListener');
    var formRemoveEventListenerStub = this.sinon.stub(Rocketbar.form,
      'removeEventListener');

    Rocketbar.removeEventListeners();

    assert.ok(windowRemoveEventListenerStub.calledWith('apploading'));
    assert.ok(windowRemoveEventListenerStub.calledWith('appforeground'));
    assert.ok(windowRemoveEventListenerStub.calledWith('apptitlechange'));
    assert.ok(windowRemoveEventListenerStub.calledWith('applocationchange'));
    assert.ok(windowRemoveEventListenerStub.calledWith('home'));
    assert.ok(windowRemoveEventListenerStub.calledWith('cardviewclosedhome'));
    assert.ok(windowRemoveEventListenerStub.calledWith('appopened'));
    assert.ok(windowRemoveEventListenerStub.calledWith('homescreenopened'));
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

  test('expand() - collapsed', function(done) {
    window.addEventListener('rocketbarexpand', function() {
      done();
    });
    Rocketbar.expand();
    assert.ok(Rocketbar.rocketbar.classList.contains('expanded'));
    assert.ok(Rocketbar.expanded);
  });

  test('expand() - already expanded', function() {
    Rocketbar.expanded = true;
    Rocketbar.expand();
    assert.equal(Rocketbar.rocketbar.classList.contains('expanded'), false);
  });

  test('collapse() - expanded', function(done) {
    var hideResultsStub = this.sinon.stub(Rocketbar, 'hideResults');
    var blurStub = this.sinon.stub(Rocketbar, 'blur');
    var exitHomeStub = this.sinon.stub(Rocketbar, 'exitHome');
    Rocketbar.active = true;
    Rocketbar.expanded = true;
    window.addEventListener('rocketbarcollapse', function() {
      done();
    });
    Rocketbar.collapse();
    assert.ok(exitHomeStub.calledOnce);
    assert.ok(hideResultsStub.calledOnce);
    assert.ok(blurStub.calledOnce);
    assert.equal(Rocketbar.rocketbar.classList.contains('expanded'), false);
    assert.equal(Rocketbar.expanded, false);
    hideResultsStub.restore();
    blurStub.restore();
    exitHomeStub.restore();
  });

  test('collapse() - already collapsed', function() {
    var hideResultsStub = this.sinon.stub(Rocketbar, 'hideResults');
    var blurStub = this.sinon.stub(Rocketbar, 'blur');
    Rocketbar.collapse();
    assert.ok(hideResultsStub.notCalled);
    assert.ok(blurStub.notCalled);
    hideResultsStub.restore();
    blurStub.restore();
  });

  test('enterHome() - not already home', function() {
    Rocketbar.onHomescreen = false;
    var expandStub = this.sinon.stub(Rocketbar, 'expand');
    Rocketbar.enterHome();
    assert.ok(Rocketbar.onHomescreen);
    assert.ok(expandStub.calledOnce);
    Rocketbar.rocketbar.classList.contains('on-homescreen');
  });

  test ('enterHome() - already home', function() {
    var expandStub = this.sinon.stub(Rocketbar, 'expand');
    Rocketbar.onHomescreen = true;
    Rocketbar.enterHome();
    assert.ok(Rocketbar.onHomescreen);
    assert.ok(expandStub.notCalled);
    expandStub.restore();
  });

  test ('exitHome()', function() {
    Rocketbar.onHomescreen = true;
    Rocketbar.exitHome();
    assert.ok(!Rocketbar.onHomescreen);
    assert.ok(!Rocketbar.rocketbar.classList.contains('on-homescreen'));
  });

  test('showResults()', function() {
    Rocketbar.results.classList.add('hidden');
    Rocketbar.showResults();
    assert.equal(Rocketbar.results.classList.contains('hidden'), false);
  });

  test('hideResults()', function() {
    Rocketbar.hideResults();
    assert.ok(Rocketbar.results.classList.contains('hidden'));
    assert.ok(MockIACPort.mNumberOfMessages() == 1);
  });

  test('showTaskManager()', function(done) {
    var showResultsStub = this.sinon.stub(Rocketbar, 'showResults');
    navigator.mozL10n = {
      'get': function() {
        return 'Search';
      }
    };
    window.addEventListener('taskmanagershow', function() {
      done();
    });
    Rocketbar.showTaskManager();
    assert.ok(showResultsStub.calledOnce);
    assert.equal(Rocketbar.input.value, '');
    assert.equal(Rocketbar.titleContent.textContent, 'Search');
    showResultsStub.restore();
  });

  test('focus()', function(done) {
    window.addEventListener('rocketbarfocus', function focus() {
      window.removeEventListener('rocketbarfocus', focus);
      done();
    });
    var loadSearchAppStub = this.sinon.stub(Rocketbar, 'loadSearchApp');
    var handleKeyboardChangeStub = this.sinon.stub(Rocketbar,
      'handleKeyboardChange');
    Rocketbar.form.classList.add('hidden');
    Rocketbar.activate();
    Rocketbar.focus();
    assert.ok(Rocketbar.rocketbar.classList.contains('active'));
    assert.ok(Rocketbar.title.classList.contains('hidden'));
    assert.equal(Rocketbar.form.classList.contains('hidden'), false);
    assert.ok(Rocketbar.active);
    assert.ok(loadSearchAppStub.calledOnce);
    var event = new CustomEvent('keyboardchange');
    Rocketbar.body.dispatchEvent(event);
    assert.ok(handleKeyboardChangeStub.calledOnce);
    loadSearchAppStub.restore();
    handleKeyboardChangeStub.restore();
  });

  test('blur() - results hidden', function(done) {
    window.addEventListener('rocketbarblur', function() {
      done();
    });
    var handleKeyboardChangeStub = this.sinon.stub(Rocketbar,
      'handleKeyboardChange');
    Rocketbar.results.classList.add('hidden');
    Rocketbar.title.classList.add('hidden');
    Rocketbar.active = true;
    Rocketbar.deactivate();
    assert.equal(Rocketbar.title.classList.contains('hidden'), false);
    assert.ok(Rocketbar.form.classList.contains('hidden'));
    assert.equal(Rocketbar.active, false);
    assert.ok(!Rocketbar.rocketbar.classList.contains('active'));
    var event = new CustomEvent('keyboardchange');
    Rocketbar.body.dispatchEvent(event);
    assert.ok(handleKeyboardChangeStub.notCalled);
    handleKeyboardChangeStub.restore();
  });

  test('blur() - results shown', function() {
    Rocketbar.deactivate();
    assert.equal(Rocketbar.form.classList.contains('hidden'), false);
  });

  test('handleAppChange()', function() {
    var handleLocationChangeStub = this.sinon.stub(Rocketbar,
      'handleLocationChange');
    var handleTitleChangeStub = this.sinon.stub(Rocketbar,
      'handleTitleChange');
    var exitHomeStub = this.sinon.stub(Rocketbar, 'exitHome');
    var collapseStub = this.sinon.stub(Rocketbar, 'collapse');
    var hideResultsStub = this.sinon.stub(Rocketbar, 'hideResults');
     Rocketbar.handleAppChange();
     assert.ok(handleLocationChangeStub.calledOnce);
     assert.ok(handleTitleChangeStub.calledOnce);
     assert.ok(exitHomeStub.calledOnce);
     assert.ok(collapseStub.calledOnce);
     assert.ok(hideResultsStub.calledOnce);
     handleLocationChangeStub.restore();
     handleTitleChangeStub.restore();
     exitHomeStub.restore();
     collapseStub.restore();
     hideResultsStub.restore();
  });

  test('handleTitleChange()', function() {
    var updateSearchIndexStub = this.sinon.stub(Rocketbar,
      'updateSearchIndex');

    // Title
    var event = new CustomEvent('apptitlechange', { 'detail': {
      'title': 'Example Title'
    }});
    Rocketbar.handleTitleChange(event);
    assert.equal(Rocketbar.titleContent.textContent, 'Example Title');
    assert.ok(updateSearchIndexStub.calledOnce);

    // No title
    event = new CustomEvent('apptitlechange', { 'detail': {
    }});
    Rocketbar.handleTitleChange(event);
    assert.equal(Rocketbar.titleContent.textContent, '');

    updateSearchIndexStub.restore();
  });

  test('handleTitleChange() - not current window', function() {
    var updateSearchIndexStub = this.sinon.stub(Rocketbar,
      'updateSearchIndex');
    var appWindow = new MockAppWindow();
    appWindow.isActive = function() {
      return false;
    };
    var event = new CustomEvent('apptitlechange', { 'detail' : appWindow});
    Rocketbar.handleTitleChange(event);
    assert.ok(updateSearchIndexStub.notCalled);
    updateSearchIndexStub.restore();
  });

  test('handleLocationChange() - browser window', function() {
    var updateSearchIndexStub = this.sinon.stub(Rocketbar,
      'updateSearchIndex');
    Rocketbar.titleContent.textConent = 'value to clear';
    var event = new CustomEvent('apptlocationchange', { 'detail': {
      'config': {
        'url': 'http://example.com'
      }
    }});
    Rocketbar.handleLocationChange(event);
    assert.equal(Rocketbar.input.value, 'http://example.com');
    assert.equal(Rocketbar.titleContent.textContent, '');
    assert.ok(updateSearchIndexStub.calledOnce);
    updateSearchIndexStub.restore();
  });

  test('handleLocationChange() - app window', function() {
    var updateSearchIndexStub = this.sinon.stub(Rocketbar,
      'updateSearchIndex');
    Rocketbar.input.value = 'value to clear';
    Rocketbar.titleContent.textConent = 'value to clear';
    var event = new CustomEvent('apptlocationchange', { 'detail': {
      'config': {
        'url': 'http://example.com'
      },
      'manifestURL': 'http://example.com/manifest.webapp'
    }});
    Rocketbar.handleLocationChange(event);
    assert.equal(Rocketbar.input.value, '');
    assert.equal(Rocketbar.titleContent.textContent, '');
    assert.ok(updateSearchIndexStub.calledOnce);
    updateSearchIndexStub.restore();
  });

  test('handleHome()', function() {
    navigator.mozL10n = {
      'get': function() {
        return 'Search';
      }
    };
    var hideResultsStub = this.sinon.stub(Rocketbar, 'hideResults');
    var enterHomeStub = this.sinon.stub(Rocketbar, 'enterHome');
    var blurStub = this.sinon.stub(Rocketbar, 'deactivate');
    Rocketbar.input.value = 'value to clear';
    Rocketbar.handleHome();
    assert.ok(hideResultsStub.calledOnce);
    assert.equal(Rocketbar.input.value, '');
    assert.equal(Rocketbar.titleContent.textContent, 'Search');
    assert.ok(enterHomeStub.called);
    assert.ok(blurStub.calledOnce);
    hideResultsStub.restore();
    enterHomeStub.restore();
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
    Rocketbar.handleTouch(event);
    assert.equal(Rocketbar._wasClicked, false);
    assert.equal(Rocketbar._touchStart, 3);
  });

  test('handleTouch() - touchmove', function() {
    // Assumes EXPANSION_THRESHOLD: 5, TASK_MANAGER_THRESHOLD: 200
    var expandStub = this.sinon.stub(Rocketbar, 'expand');
    var collapseStub = this.sinon.stub(Rocketbar, 'collapse');
    var showTaskManagerStub = this.sinon.stub(Rocketbar, 'showTaskManager');

    // Expand
    Rocketbar._touchStart = 1;
    var event = {
      type: 'touchmove',
      touches: [
        {
          pageY: 11 // Greater than 1+5, less than 1+200
        }
      ]
    };
    Rocketbar.handleTouch(event);
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
    Rocketbar.handleTouch(event);
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
    Rocketbar.handleTouch(event);
    assert.ok(showTaskManagerStub.calledOnce);

    expandStub.restore();
    collapseStub.restore();
    showTaskManagerStub.restore();
  });

  test('handleTouch() - touchend', function() {
    // Assumes EXPANSION_THRESHOLD: 5
    var handleClickStub = this.sinon.stub(Rocketbar, 'handleClick');

    // Not a click
    Rocketbar._touchStart = 1;
    var event = {
      type: 'touchend',
      changedTouches: [
        {
          pageY: 7 // More than 1+5
        }
      ]
    };
    Rocketbar.handleTouch(event);
    assert.equal(Rocketbar._touchStart, -1);
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
    Rocketbar.handleTouch(event);
    assert.ok(handleClickStub.calledOnce);
    handleClickStub.restore();
  });

  test('handleClick()', function() {
    var focusStub = this.sinon.stub(Rocketbar, 'focus');
    var expandStub = this.sinon.stub(Rocketbar, 'expand');

    // Expanded
    Rocketbar.expanded = true;
    Rocketbar.handleClick();
    assert.ok(focusStub.calledOnce);

    // Collapsed
    Rocketbar.active = false;
    Rocketbar.expanded = false;
    Rocketbar.handleClick();
    assert.ok(Rocketbar._wasClicked);
    assert.ok(expandStub.calledOnce);

    focusStub.restore();
    expandStub.restore();
  });

  test('handleTransitionEnd()', function() {
    var focusStub = this.sinon.stub(Rocketbar, 'focus');

    // Not expanded
    Rocketbar.handleTransitionEnd();
    assert.ok(focusStub.notCalled);

    // Expanded
    Rocketbar.expanded = true;
    Rocketbar._wasClicked = true;
    Rocketbar.handleTransitionEnd();
    assert.ok(focusStub.calledOnce);
    assert.ok(!Rocketbar._wasClicked);
    focusStub.restore();
  });

  test('handleInput()', function(done) {
    var showResultsStub = this.sinon.stub(Rocketbar, 'showResults');
    var hideResultsStub = this.sinon.stub(Rocketbar, 'hideResults');

    // With input
    Rocketbar.input.value = 'abc';
    Rocketbar.results.classList.add('hidden');
    Rocketbar.handleInput();
    assert.ok(showResultsStub.calledOnce);
    assert.ok(MockIACPort.mNumberOfMessages() == 1);

    // With no input
    Rocketbar.input.value = '';
    Rocketbar.results.classList.remove('hidden');
    Rocketbar.handleInput();
    assert.ok(hideResultsStub.calledOnce);

    // Task manager shown
    Rocketbar.screen.classList.add('task-manager');
    window.addEventListener('taskmanagerhide', function() {
      done();
    });
    Rocketbar.handleInput();

    showResultsStub.restore();
    hideResultsStub.restore();
  });

  test('handleSubmit()', function(done) {
    var event = {
      'preventDefault': function() {
        done();
      }
    };
    Rocketbar.handleSubmit(event);
    assert.ok(MockIACPort.mNumberOfMessages() == 1);
  });

  test('handleKeyboardChange()', function(done) {
    var event = {
      'stopImmediatePropagation': function() {
        done();
      }
    };
    Rocketbar.handleKeyboardChange(event);
  });

  test('handleStackChanged() - empty stack', function() {
    Rocketbar.cardView = true;
    var focusStub = this.sinon.stub(Rocketbar, 'activate');
    var event = {
      detail: {
        sheets: []
      }
    };
    Rocketbar.handleStackChanged(event);
    assert.ok(focusStub.calledOnce);
    focusStub.restore();
  });

  test('handleStackChanged() - non-empty stack', function() {
    Rocketbar.expanded = true;
    var focusStub = this.sinon.stub(Rocketbar, 'focus');
    var event = {
      detail: {
        sheets: ['a', 'b', 'c']
      }
    };
    Rocketbar.handleStackChanged(event);
    assert.ok(focusStub.notCalled);
    focusStub.restore();
  });

  test('loadSearchApp()', function() {
    var initSearchConnectionStub = this.sinon.stub(Rocketbar,
      'initSearchConnection');
    Rocketbar._searchAppURL = 'http://search.example.com/';
    Rocketbar._searchManifestURL = 'http://search.example.com/manifest.webapp';

    // searchFrame DOM
    Rocketbar.loadSearchApp();
    assert.ok(initSearchConnectionStub.calledOnce);

    initSearchConnectionStub.restore();
  });

  test('initSearchConnection()', function() {
    var handleSearchMessageStub = this.sinon.stub(Rocketbar,
      'handleSearchMessage');
    Rocketbar._pendingMessage = 'hi';
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
    Rocketbar._port = null;
    navigator.mozApps.getSelf = function() { return app; };
    Rocketbar.initSearchConnection();
    app.onsuccess();
    assert.equal(Rocketbar._port, 'abc');
    assert.equal(Rocketbar._pendingMessage, null);
    assert.ok(handleSearchMessageStub.calledOnce);
    navigator.mozApps = realMozApps;
    handleSearchMessageStub.restore();
  });

  test('handleSearchMessage()', function() {
    var initSearchConnectionStub = this.sinon.stub(Rocketbar,
      'initSearchConnection');
    var hideResultsStub = this.sinon.stub(Rocketbar, 'hideResults');
    var collapseStub = this.sinon.stub(Rocketbar, 'collapse');

    // Input message
    var event = {
      type: 'iac-search-results',
      detail: {
        action: 'input',
        input: 'http://example.com'
      }
    };
    Rocketbar.handleSearchMessage(event);
    assert.equal(Rocketbar.input.value, 'http://example.com');

    // Hide message
    event = {
      type: 'iac-search-results',
      detail: {
        action: 'hide'
      }
    };
    Rocketbar.handleSearchMessage(event);
    assert.ok(hideResultsStub.calledOnce);
    assert.ok(collapseStub.calledOnce);

    // No _port
    Rocketbar._port = null;
    Rocketbar.handleSearchMessage(event);
    assert.equal(Rocketbar._pendingMessage, event);
    assert.ok(initSearchConnectionStub.calledOnce);

    initSearchConnectionStub.restore();
    hideResultsStub.restore();
    collapseStub.restore();
  });

  test('updateSearchIndex()', function() {
    var postMessageStub = this.sinon.stub(Rocketbar._port, 'postMessage');
    Rocketbar.updateSearchIndex();
    assert.ok(postMessageStub.calledOnce);
    postMessageStub.restore();
  });

  test('handleSearchCrashed() - calls render after crash', function() {
    Rocketbar.enable();

    Rocketbar._searchAppURL = 'http://search.example.com/';
    Rocketbar._searchManifestURL = 'http://search.example.com/manifest.webapp';

    Rocketbar.searchWindow = null;

    var publishStub = this.sinon.stub(SearchWindow.prototype, 'publish');

    Rocketbar.loadSearchApp();
    assert.ok(publishStub.calledOnce);

    // Dispatch a crash event.
    window.dispatchEvent(new CustomEvent('searchcrashed'));
    Rocketbar.loadSearchApp();
    assert.ok(publishStub.calledTwice);
  });

});

