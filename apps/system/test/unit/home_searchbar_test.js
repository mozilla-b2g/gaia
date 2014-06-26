'use strict';
/* global HomeSearchbar, Rocketbar, MocksHelper */

requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_search_window.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_settings_url.js');
requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_iac_handler.js');
requireApp('system/js/rocketbar.js');

var mocksForRocketbar = new MocksHelper([
  'AppWindow',
  'AppWindowManager',
  'SearchWindow',
  'SettingsListener',
  'SettingsURL',
  'IACPort'
]).init();

suite('system/HomeSearchbar', function() {
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

    requireApp('system/js/home_searchbar.js', function() {
      subject = new HomeSearchbar();
      done();
    });
  });

  teardown(function() {
    stubById.restore();
  });

  test('start', function() {
    var removeEventListenersStub = this.sinon.stub(subject,
      'removeEventListeners');
    subject.body.classList.add('homesearch-enabled');
    subject.enabled = true;
    subject.start();
    assert.ok(removeEventListenersStub.calledOnce);
    assert.ok(!subject.body.classList.contains('homesearch-enabled'));
    assert.ok(!subject.enabled);
  });

  test('stop', function() {
    var addEventListenersStub = this.sinon.stub(subject,
      'addEventListeners');
    subject.stop();
    assert.ok(addEventListenersStub.calledOnce);
    assert.ok(subject.body.classList.contains('homesearch-enabled'));
    assert.ok(subject.enabled);
  });

  suite('handleEvent', function() {
    var realMozApps = navigator.mozApps;

    setup(function() {
      navigator.mozApps = {};
      var app = { result: {
         'connect': function() {
            return {
              'then': function(success, failure) {
                var ports = [{
                  postMessage: function() {}
                }];
                success(ports);
              }
            };
         }
      }};
      subject._port = null;
      navigator.mozApps.getSelf = function() { return app; };
      subject.initSearchConnection();
      app.onsuccess();
    });

    teardown(function() {
      navigator.mozApps = realMozApps;
    });

    test('app opening events', function() {
      this.sinon.stub(subject._port, 'postMessage');
      subject.stop();
      subject.expand();

      var assertStubs = [
        this.sinon.stub(subject, 'exitHome'),
        this.sinon.stub(subject, 'hideResults'),
        this.sinon.stub(subject, 'deactivate')
      ];

      assert.ok(subject.screen.classList.contains('rocketbar-expanded'));
      assert.ok(subject.rocketbar.classList.contains('expanded'));

      window.dispatchEvent(new CustomEvent('apploading'));

      assert.ok(!subject.screen.classList.contains('rocketbar-expanded'));
      assert.ok(!subject.rocketbar.classList.contains('expanded'));

      assertStubs.forEach(function(stub) {
        assert.ok(stub.calledOnce);
      });
    });

    test('home', function() {
      var stub = this.sinon.stub(Rocketbar.prototype, 'handleHome');
      subject.handleEvent({
        type: 'home'
      });
      assert.ok(stub.calledOnce);
    });

    test('focus', function() {
      var stub = this.sinon.stub(Rocketbar.prototype, 'handleFocus');
      subject.handleEvent({
        type: 'focus',
        target: subject.input
      });
      assert.ok(stub.calledOnce);
    });

    test('blur', function() {
      var stub = this.sinon.stub(Rocketbar.prototype, 'handleBlur');
      subject.handleEvent({
        type: 'blur',
        target: subject.input
      });
      assert.ok(stub.calledOnce);
    });

    test('input', function() {
      var stub = this.sinon.stub(Rocketbar.prototype, 'handleInput');
      subject.handleEvent({
        type: 'input',
        target: subject.input
      });
      assert.ok(stub.calledOnce);
    });

    test('click - cancel', function() {
      var stub = this.sinon.stub(Rocketbar.prototype, 'handleCancel');
      subject.handleEvent({
        type: 'click',
        target: subject.cancel
      });
      assert.ok(stub.calledOnce);
    });

    test('click - backdrop', function() {
      var stub = this.sinon.stub(Rocketbar.prototype, 'deactivate');
      subject.handleEvent({
        type: 'click',
        target: subject.backdrop
      });
      assert.ok(stub.calledOnce);
    });

    test('searchcrashed', function() {
      var stub = this.sinon.stub(Rocketbar.prototype, 'handleSearchCrashed');
      subject.handleEvent({
        type: 'searchcrashed'
      });
      assert.ok(stub.calledOnce);
    });

    test('submit', function() {
      var stub = this.sinon.stub(Rocketbar.prototype, 'handleSubmit');
      subject.handleEvent({
        type: 'submit',
        target: subject.form
      });
      assert.ok(stub.calledOnce);
    });

    test('iac-search-results', function() {
      var stub = this.sinon.stub(Rocketbar.prototype, 'handleSearchMessage');
      subject.handleEvent({
        type: 'iac-search-results'
      });
      assert.ok(stub.calledOnce);
    });

  });
});

