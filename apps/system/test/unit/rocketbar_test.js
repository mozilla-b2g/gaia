'use strict';
/* global Rocketbar, MocksHelper, MockIACPort, MockSearchWindow */

requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_search_window.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_settings_url.js');
requireApp('system/test/unit/mock_iac_handler.js');

var mocksForRocketbar = new MocksHelper([
  'AppWindow',
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
    var stub = this.sinon.stub(subject.input, 'select');
    subject.selectAll();
    sinon.assert.calledOnce(stub);
  });

  test('focus()', function() {
    var loadSearchAppStub = this.sinon.stub(subject, 'loadSearchApp');
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

  test('handleHome()', function() {
    var deactivateStub = this.sinon.stub(subject, 'deactivate');
    var hideResultsStub = this.sinon.stub(subject, 'hideResults');
    subject.handleHome();
    assert.ok(deactivateStub.calledOnce);
    assert.ok(hideResultsStub.calledOnce);
  });

  test('handleInput()', function() {
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

    // No _port
    subject._port = null;
    subject.handleSearchMessage(event);
    assert.equal(subject._pendingMessage, event);
    assert.ok(initSearchConnectionStub.calledOnce);

    initSearchConnectionStub.restore();
    hideResultsStub.restore();
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

    subject.handleEvent({
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
    assert.equal(subject._port, 'pending');
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

  test('focus on render after a tick', function() {
    var focusStub = this.sinon.stub(subject, 'focus');

    subject.activate();
    subject.active = true;
    subject.handleSearchMessage({detail: {action: 'render'}});

    sinon.assert.notCalled(focusStub);
    this.sinon.clock.tick(1);
    sinon.assert.calledOnce(focusStub);
  });

  suite('activate with a transition', function() {
    test('done after transition and search app load', function(done) {
      this.sinon.spy(subject, 'loadSearchApp');
      subject.activate(done);
      subject.loadSearchApp.yield();
      subject.backdrop.dispatchEvent(new CustomEvent('transitionend'));
    });

    test('done after safety timeout and search app load', function(done) {
      this.sinon.spy(subject, 'loadSearchApp');
      subject.activate(done);
      subject.loadSearchApp.yield();
      this.sinon.clock.tick(500);
    });
  });
});

