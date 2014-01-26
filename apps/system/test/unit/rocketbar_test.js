'use strict';

requireApp('system/shared/js/url_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_cards_view.js');
requireApp('system/test/unit/mock_app.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/js/browser_config_helper.js');
require('/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/test/unit/mock_lock_screen.js');
requireApp('system/js/lockscreen.js');

mocha.globals(['Rocketbar']);

var LockScreen = { locked: false };

var mocksForRocketBar = new MocksHelper([
  'Applications',
  'AppWindow',
  'AppWindowManager',
  'CardsView',
  'LockScreen',
  'ManifestHelper',
  'SettingsListener'
]).init();

suite('system/Rocketbar', function() {
  var stubById;
  var fakeEvt;
  var fakeElement;
  var subject;
  var lastPortMessage;

  mocksForRocketBar.attachTestHelpers();
  setup(function(done) {
    fakeElement = document.createElement('div');
    fakeElement.style.cssText = 'height: 100px; display: block;';
    stubById = this.sinon.stub(document, 'getElementById')
                          .returns(fakeElement.cloneNode(true));
    this.sinon.useFakeTimers();

    requireApp('system/js/rocketbar.js', function() {
      var mockApp = new MockApp({
        origin: 'http://rocketbar',
        manifestURL: 'http://rocketbar/manifest'
      });
      MockApplications.mRegisterMockApp(mockApp);
      this.sinon.stub(Rocketbar.prototype, 'initSearchConnection');
      subject = new Rocketbar('', mockApp.manifestURL);
      subject._port = {
        postMessage: function(msg) {
          lastPortMessage = msg;
        }
      };
      subject.init();
      done();
    }.bind(this));
  });

  teardown(function() {
    stubById.restore();
    this.sinon.clock.restore();
  });

  suite('searchInput', function() {
    test('hides task manager on input', function() {
      var screen = document.getElementById('screen');
      screen.classList.add('task-manager');

      subject._port = {
        postMessage: function() {}
      };
      var dispatchStub = this.sinon.stub(window, 'dispatchEvent');
      subject.searchInput.dispatchEvent(new CustomEvent('input'));
      assert.equal(dispatchStub.getCall(0).args[0].type, 'taskmanagerhide');
      screen.classList.remove('task-manager');
    });

    test('adds rocketbar-focus on focus', function() {
      assert.ok(!subject.screen.classList.contains('rocketbar-focus'));
      subject.searchInput.value = '';
      subject.handleEvent({
        target: {
          id: 'search-input'
        }
      });
      assert.ok(subject.screen.classList.contains('rocketbar-focus'));
    });

    test('removes rocketbar-focus on blur', function() {
      subject.searchInput.value = '';
      subject.handleEvent({
        type: 'blur',
        target: {
          id: 'search-input'
        }
      });
      assert.ok(!subject.screen.classList.contains('rocketbar-focus'));
    });

    test('input on event call updateResetButton', function() {
      var stub = this.sinon.stub(Rocketbar, 'updateResetButton');

      var evt = document.createEvent('CustomEvent');
      evt.initEvent('input', true, true);
      Rocketbar.searchInput.dispatchEvent(evt);

      assert.ok(stub.calledOnce);
      stub.restore();
    });
  });

  suite('handleEvent', function() {
    test('cardchange event should not trigger focus if card', function() {
      var focusStub = this.sinon.stub(subject.searchInput, 'focus');
      subject.handleEvent({
        type: 'cardchange',
        detail: {
          title: 'Mozilla'
        }
      });
      assert.ok(focusStub.notCalled);
    });

    test('cardviewclosed event should trigger focus', function() {
      subject.render();
      var focusStub = this.sinon.stub(subject.searchInput, 'focus');
      this.sinon.clock.tick(1);
      subject.handleEvent({
        type: 'cardviewclosed'
      });
      subject.hide();
      assert.ok(focusStub.calledOnce);
    });

    test('should not focus when closing rocketbar', function() {
      var stub = this.sinon.stub(subject.searchInput, 'focus').returns(true);
      subject.searchBar.dataset.visible = true;
      subject.handleEvent({
        type: 'cardviewclosed'
      });
      assert.ok(stub);
    });

    test('search-cancel element should hide the task manager', function() {
      var dispatchStub = this.sinon.stub(window, 'dispatchEvent');
      subject.handleEvent({
        target: {
          id: 'search-cancel'
        },
        preventDefault: function() {},
        stopPropagation: function() {}
      });

      assert.equal(dispatchStub.getCall(0).args[0].type, 'taskmanagerhide');
    });

    test('search-cancel element should show the task manager', function() {
      var dispatchStub = this.sinon.stub(window, 'dispatchEvent');
      var awmStub = this.sinon.stub(AppWindowManager, 'getRunningApps')
        .returns({app1: true, app2: true});
      subject.home = 'tasks';
      subject.handleEvent({
        target: {
          id: 'search-cancel'
        },
        preventDefault: function() {},
        stopPropagation: function() {}
      });

      assert.equal(dispatchStub.getCall(0).args[0].type, 'taskmanagershow');
    });

    test('focus on event call updateResetButton', function() {
      var stub = this.sinon.stub(Rocketbar, 'updateResetButton');

      Rocketbar.handleEvent({
        type: 'focus',
        target: {
          id: 'search-input'
        }
      });

      assert.ok(stub.calledOnce);
      stub.restore();
    });
  });

  suite('render', function() {
    test('shown should be true', function() {
      subject.render();
      this.sinon.clock.tick(1);
      assert.equal(subject.shown, true);
      subject.hide();
    });

    test('only renders once', function() {
      subject.hide();
      var eventListenerStub = this.sinon.stub(window.document.body,
        'addEventListener');
      subject.render();
      this.sinon.clock.tick();
      subject.render();
      this.sinon.clock.tick();
      assert.isTrue(eventListenerStub.withArgs('keyboardchange').calledOnce);
      subject.hide();
    });

    test('resets the value', function() {
      subject.hide();
      subject.searchInput.value = 'foo';
      subject.render();
      this.sinon.clock.tick();
      assert.equal(subject.searchInput.value, '');
      subject.hide();
    });

    test('fires the rocketbarshown event', function() {
      subject.hide();
      var called = false;
      window.addEventListener('rocketbarshown', function() {
        called = true;
      });
      subject.render();
      this.sinon.clock.tick();
      assert.equal(called, true);
      subject.hide();
    });

    test('posts a message to clear', function() {
      subject.hide();
      subject.render();
      this.sinon.clock.tick();
      assert.equal('clear', lastPortMessage.action);
      subject.hide();
    });

    test('loads the search app', function() {
      subject.hide();
      var searchAppStub = this.sinon.stub(subject, 'loadSearchApp')
                          .returns(true);
      subject.render();
      subject.searchBar.dispatchEvent(
        new CustomEvent('transitionend')
      );
      assert.equal(true, searchAppStub.calledWith());
      subject.hide();
      searchAppStub.restore();
    });

    suite('interactions', function() {
      var searchAppStub, cardsViewStub, focusStub;

      setup(function() {
        searchAppStub = this.sinon.stub(subject, 'loadSearchApp')
                            .returns(true);
        cardsViewStub = this.sinon.stub(window, 'dispatchEvent');
        focusStub = this.sinon.stub(subject.searchInput, 'focus');
      });

      teardown(function() {
        cardsViewStub.restore();
        searchAppStub.restore();
        focusStub.restore();
      });

      test('task manager', function() {
        subject.hide();
        subject.render({home: 'tasks'});
        this.sinon.clock.tick();
        assert.equal(cardsViewStub.getCall(1).args[0].type, 'taskmanagershow');
        assert.equal(true, focusStub.notCalled);
        subject.hide();
      });

      test('focused mode', function() {
        subject.hide();
        var called = false;
        window.addEventListener('taskmanagershow', function() {
          called = true;
        });
        subject.render();
        this.sinon.clock.tick();
        assert.equal(false, called);
        assert.equal(true, focusStub.calledOnce);
        subject.hide();
      });
    });
  });

  suite('onSearchMessage', function() {
    test('fires a change event', function() {
      var message;
      subject._port = {
        postMessage: function(msg) {
          message = msg;
        }
      };
      subject.onSearchMessage({
        detail: {input: 'foo'}
      });
      assert.equal(message.action, 'change');
      assert.equal(message.input, 'foo');
    });
  });

  suite('hide', function() {
    test('shown should be false', function() {
      subject.render();
      this.sinon.clock.tick();
      subject.hide();
      assert.equal(subject.shown, false);
    });

    test('keyboardchange listener is removed', function() {
      var eventListenerStub = this.sinon.stub(window.document.body,
        'removeEventListener');
      subject.render();
      this.sinon.clock.tick();
      subject.hide();
      assert.isTrue(eventListenerStub.withArgs('keyboardchange').calledOnce);
    });

   test('blurs the input', function() {
      var inputBlurStub = this.sinon.stub(subject.searchInput, 'blur')
                          .returns(true);
      subject.render();
      this.sinon.clock.tick();
      subject.hide();
      assert.equal(true, inputBlurStub.calledWith());
      inputBlurStub.restore();
    });

    test('fires the rocketbarhidden event', function() {
      var called = false;
      window.addEventListener('rocketbarhidden', function() {
        called = true;
      });
      subject.render();
      this.sinon.clock.tick();
      subject.hide();
      assert.equal(called, true);
    });
  });
});
