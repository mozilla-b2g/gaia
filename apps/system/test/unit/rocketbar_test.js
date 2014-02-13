'use strict';
/* global Rocketbar, MocksHelper, MockAppWindow, MockIACPort */

requireApp('system/test/unit/mock_app_window.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_iac_handler.js');
requireApp('system/js/rocketbar.js');

var mocksForRocketbar = new MocksHelper([
  'AppWindow',
  'SettingsListener',
  'IACPort'
]).init();

suite('system/Rocketbar', function() {
  mocksForRocketbar.attachTestHelpers();
  var stubById;

  setup(function() {
    stubById = this.sinon.stub(document, 'getElementById', function(id) {
      if (id == 'rocketbar-input') {
        return document.createElement('input');
      } else {
        return document.createElement('div');
      }
    });
    Rocketbar.init();
    Rocketbar._port = MockIACPort;
  });

  teardown(function() {
    stubById.restore();
    MockIACPort.mTearDown();
    Rocketbar._port = null;
  });

  test('enable()', function() {
     Rocketbar.enable();
     assert.ok(Rocketbar.body.classList.contains('rb-enabled'));
     assert.ok(Rocketbar.enabled);
  });

  test('disable()', function() {
     Rocketbar.body.classList.add('rb-enabled');
     Rocketbar.enabled = true;
     Rocketbar.disable();
     assert.equal(Rocketbar.body.classList.contains('rb-enabled'), false);
     assert.equal(Rocketbar.enabled, false);
  });

  test('setSearchAppURL()', function() {
    Rocketbar.setSearchAppURL('app://mysearch.example.com/');
    assert.equal(Rocketbar._searchAppURL, 'app://mysearch.example.com/');
    assert.equal(Rocketbar._searchManifestURL,
      'app://mysearch.example.com/manifest.webapp');
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
    Rocketbar.expanded = true;
    window.addEventListener('rocketbarcollapse', function() {
      done();
    });
    Rocketbar.collapse();
    assert.ok(hideResultsStub.calledOnce);
    assert.ok(blurStub.calledOnce);
    assert.equal(Rocketbar.rocketbar.classList.contains('expanded'), false);
    assert.equal(Rocketbar.expanded, false);
    hideResultsStub.restore();
    blurStub.restore();
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

  test('focus()', function() {
    var loadSearchAppStub = this.sinon.stub(Rocketbar, 'loadSearchApp');
    var handleKeyboardChangeStub = this.sinon.stub(Rocketbar,
      'handleKeyboardChange');
    Rocketbar.form.classList.add('hidden');
    Rocketbar.focus();
    assert.ok(Rocketbar.title.classList.contains('hidden'));
    assert.equal(Rocketbar.form.classList.contains('hidden'), false);
    assert.ok(Rocketbar.focused);
    assert.ok(loadSearchAppStub.calledOnce);
    var event = new CustomEvent('keyboardchange');
    Rocketbar.body.dispatchEvent(event);
    assert.ok(handleKeyboardChangeStub.calledOnce);
    loadSearchAppStub.restore();
    handleKeyboardChangeStub.restore();
  });

  test('blur() - results hidden', function() {
    var handleKeyboardChangeStub = this.sinon.stub(Rocketbar,
      'handleKeyboardChange');
    Rocketbar.results.classList.add('hidden');
    Rocketbar.title.classList.add('hidden');
    Rocketbar.blur();
    assert.equal(Rocketbar.title.classList.contains('hidden'), false);
    assert.ok(Rocketbar.form.classList.contains('hidden'));
    assert.equal(Rocketbar.focused, false);
    var event = new CustomEvent('keyboardchange');
    Rocketbar.body.dispatchEvent(event);
    assert.ok(handleKeyboardChangeStub.notCalled);
    handleKeyboardChangeStub.restore();
  });

  test('blur() - results shown', function() {
    Rocketbar.blur();
    assert.equal(Rocketbar.form.classList.contains('hidden'), false);
  });

  test('handleAppChange()', function() {
    var handleLocationChangeStub = this.sinon.stub(Rocketbar,
      'handleLocationChange');
    var handleTitleChangeStub = this.sinon.stub(Rocketbar,
      'handleTitleChange');
     Rocketbar.handleAppChange();
     assert.ok(handleLocationChangeStub.calledOnce);
     assert.ok(handleTitleChangeStub.calledOnce);
     handleLocationChangeStub.restore();
     handleTitleChangeStub.restore();
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
    var collapseStub = this.sinon.stub(Rocketbar, 'collapse');
    var hideResultsStub = this.sinon.stub(Rocketbar, 'hideResults');
    Rocketbar.input.value = 'value to clear';
    Rocketbar.handleHome();
    assert.ok(hideResultsStub.calledOnce);
    assert.ok(collapseStub.calledOnce);
    assert.equal(Rocketbar.input.value, '');
    assert.equal(Rocketbar.titleContent.textContent, 'Search');
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

  test('handleCardViewClosed()', function() {
    var focusStub = this.sinon.stub(Rocketbar, 'focus');

    // Closed because card selected.
    var event = {
      type: 'cardviewclosed',
      detail: [
        {
          newStackPosition: 1
        }
      ]
    };
    Rocketbar.handleCardViewClosed(event);
    assert.ok(focusStub.notCalled);

    // Closed because no more cards.
    event = {
      type: 'cardviewclosed'
    };
    Rocketbar.handleCardViewClosed(event);
    assert.ok(focusStub.calledOnce);

    focusStub.restore();
  });

  test('loadSearchApp()', function() {
    var initSearchConnectionStub = this.sinon.stub(Rocketbar,
      'initSearchConnection');
    Rocketbar._searchAppURL = 'http://search.example.com/';
    Rocketbar._searchManifestURL = 'http://search.example.com/manifest.webapp';

    // searchFrame DOM
    Rocketbar.loadSearchApp();
    var searchFrame = Rocketbar.results.querySelector('iframe');
    assert.ok(searchFrame);
    assert.equal(searchFrame.id, 'rocketbar-results-frame');
    assert.equal(searchFrame.src, 'http://search.example.com/');
    assert.equal(searchFrame.getAttribute('mozapptype'), 'mozsearch');
    assert.equal(searchFrame.getAttribute('mozbrowser'), 'true');
    assert.equal(searchFrame.getAttribute('remote'), 'true');
    assert.equal(searchFrame.getAttribute('mozapp'),
      'http://search.example.com/manifest.webapp');
    assert.ok(searchFrame.classList.contains('hidden'));
    assert.ok(initSearchConnectionStub.calledOnce);

    // mozbrowserloadend
    var event = new CustomEvent('mozbrowserloadend');
    searchFrame.dispatchEvent(event);
    assert.equal(searchFrame.classList.contains('hidden'), false);

    // mozbrowsererror
    event = new CustomEvent('mozbrowsererror');
    searchFrame.dispatchEvent(event);
    searchFrame = Rocketbar.results.querySelector('iframe');
    assert.equal(searchFrame, undefined);

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

});

