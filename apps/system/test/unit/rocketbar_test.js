'use strict';
/* global AppWindowManager, MocksHelper, Rocketbar, MockLockScreen */

requireApp('system/shared/js/url_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_cards_view.js');
requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_lock_screen.js');
mocha.globals(['Rocketbar', 'lockScreen']);

mocha.globals(['dispatchEvent']);

var mocksForRocketBar = new MocksHelper([
  'AppWindowManager',
  'CardsView',
  'SettingsListener'
]).init();

suite('system/Rocketbar', function() {
  var originalLocked;
  var stubById;
  var fakeElement;

  mocksForRocketBar.attachTestHelpers();
  setup(function(done) {
    window.lockScreen = MockLockScreen;
    originalLocked = window.lockScreen.locked;

    // The tests except it always false in this file.
    window.lockScreen.locked = false;
    fakeElement = document.createElement('div');
    fakeElement.style.cssText = 'height: 100px; display: block;';
    stubById = this.sinon.stub(document, 'getElementById')
                          .returns(fakeElement.cloneNode(true));
    this.sinon.useFakeTimers();
    requireApp('system/js/rocketbar.js', done);
  });

  teardown(function() {
    stubById.restore();
    window.lockScreen.locked = originalLocked;
    this.sinon.clock.restore();
  });

  suite('searchInput', function() {
    test('hides task manager on input', function() {
      var screen = document.getElementById('screen');
      screen.classList.add('task-manager');

      Rocketbar._port = {
        postMessage: function() {}
      };
      var dispatchStub = this.sinon.stub(window, 'dispatchEvent');
      Rocketbar.searchInput.dispatchEvent(new CustomEvent('input'));
      assert.equal(dispatchStub.getCall(0).args[0].type, 'taskmanagerhide');
      screen.classList.remove('task-manager');
    });

    test('adds rocketbar-focus on focus', function() {
      assert.ok(!Rocketbar.screen.classList.contains('rocketbar-focus'));
      Rocketbar.searchInput.value = '';
      Rocketbar.handleEvent({
        target: {
          id: 'search-input'
        }
      });
      assert.ok(Rocketbar.screen.classList.contains('rocketbar-focus'));
    });

    test('focus, when currentURL is set', function() {
      Rocketbar.searchInput.select = function() {};
      var selectStub = this.sinon.stub(Rocketbar.searchInput, 'select');
      Rocketbar.currentURL = 'http://mozilla.org';
      Rocketbar.searchInput.value = '';
      Rocketbar.handleEvent({
        target: {
          id: 'search-input'
        }
      });
      assert.equal(Rocketbar.searchInput.value, 'http://mozilla.org');
      assert.ok(selectStub.calledOnce);
    });

    test('focus, when currentURL is not set', function() {
      Rocketbar.searchInput.select = function() {};
      var selectStub = this.sinon.stub(Rocketbar.searchInput, 'select');
      Rocketbar.currentURL = null;
      Rocketbar.searchInput.value = '';
      Rocketbar.handleEvent({
        target: {
          id: 'search-input'
        }
      });
      assert.equal(Rocketbar.searchInput.value, '');
      assert.ok(selectStub.notCalled);
    });

    test('removes rocketbar-focus on blur', function() {
      Rocketbar.searchInput.value = '';
      Rocketbar.handleEvent({
        type: 'blur',
        target: {
          id: 'search-input'
        }
      });
      assert.ok(!Rocketbar.screen.classList.contains('rocketbar-focus'));
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
    setup(function() {
      this.sinon.stub(Rocketbar, 'initSearchConnection');
    });

    test('cardviewclosed event should trigger focus', function() {
      Rocketbar.render();
      var focusStub = this.sinon.stub(Rocketbar.searchInput, 'focus');
      this.sinon.clock.tick(1);
      Rocketbar.handleEvent({
        type: 'cardviewclosed'
      });
      Rocketbar.hide();
      assert.ok(focusStub.calledOnce);
    });

    test('should not focus when closing rocketbar', function() {
      var stub = this.sinon.stub(Rocketbar.searchInput, 'focus').returns(true);
      Rocketbar.searchBar.dataset.visible = true;
      Rocketbar.handleEvent({
        type: 'cardviewclosed'
      });
      assert.ok(stub);
    });

    test('search-cancel sends event to launch active card', function() {
      Rocketbar.screen.classList.add('task-manager');
      this.sinon.stub(AppWindowManager, 'getRunningApps')
        .returns({app1: true, app2: true});
      var dispatchStub = this.sinon.stub(window, 'dispatchEvent');
      Rocketbar.handleEvent({
        target: {
          id: 'search-cancel'
        },
        preventDefault: function() {},
        stopPropagation: function() {}
      });

      assert.equal(dispatchStub.getCall(0).args[0].type, 'opencurrentcard');
      Rocketbar.screen.classList.remove('task-manager');
    });

    test('search-cancel calls Rocketbar.hide', function() {
      var hideStub = this.sinon.stub(Rocketbar, 'hide');
      Rocketbar.handleEvent({
        target: {
          id: 'search-cancel'
        },
        preventDefault: function() {},
        stopPropagation: function() {}
      });

      assert.ok(hideStub.calledOnce);
    });

    test('search-cancel element should show the task manager', function() {
      var dispatchStub = this.sinon.stub(window, 'dispatchEvent');
      this.sinon.stub(AppWindowManager, 'getRunningApps')
        .returns({app1: true, app2: true});
      Rocketbar.home = 'tasks';

      // Set the value to ensure that it clears when the task manager shows
      Rocketbar.searchInput.value = 'http://mozilla.org';

      Rocketbar.handleEvent({
        target: {
          id: 'search-cancel'
        },
        preventDefault: function() {},
        stopPropagation: function() {}
      });

      assert.equal(dispatchStub.getCall(0).args[0].type, 'taskmanagershow');
      assert.equal(Rocketbar.searchInput.value, '');
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

    test('rocketbar hide events', function() {
      var hideEvents = ['home', 'lock', 'appopened'];
      hideEvents.forEach(function(evtType) {
        var hideStub = this.sinon.stub(Rocketbar, 'hide');
        Rocketbar.handleEvent({
          type: evtType
        });
        assert.ok(hideStub.calledOnce);
        hideStub.restore();
      }, this);
    });
  });

  suite('render', function() {
    setup(function() {
      this.sinon.stub(Rocketbar, 'initSearchConnection');
    });

    test('shown should be true', function() {
      Rocketbar.render();
      this.sinon.clock.tick(1);
      assert.equal(Rocketbar.shown, true);
      Rocketbar.hide();
    });

    test('only renders once', function() {
      var eventListenerStub = this.sinon.stub(window.document.body,
        'addEventListener');
      Rocketbar.render();
      this.sinon.clock.tick();
      Rocketbar.render();
      this.sinon.clock.tick();
      assert.isTrue(eventListenerStub.withArgs('keyboardchange').calledOnce);
      Rocketbar.hide();
    });

    test('resets the value', function() {
      Rocketbar.searchInput.value = 'foo';
      Rocketbar.render();
      this.sinon.clock.tick();
      assert.equal(Rocketbar.searchInput.value, '');
      Rocketbar.hide();
    });

    test('fires the rocketbarshown event', function() {
      var called = false;
      window.addEventListener('rocketbarshown', function() {
        called = true;
      });
      Rocketbar.render();
      this.sinon.clock.tick();
      assert.equal(called, true);
      Rocketbar.hide();
    });

    test('posts a message to clear', function() {
      var message;
      Rocketbar._port = {
        postMessage: function(msg) {
          message = msg;
        }
      };
      Rocketbar.render();
      this.sinon.clock.tick();
      assert.equal('clear', message.action);
      Rocketbar.hide();
    });

    test('loads the search app', function() {
      var searchAppStub = this.sinon.stub(Rocketbar, 'loadSearchApp')
                          .returns(true);
      Rocketbar.render();
      Rocketbar.searchBar.dispatchEvent(
        new CustomEvent('transitionend')
      );
      assert.equal(true, searchAppStub.calledWith());
      Rocketbar.hide();
      searchAppStub.restore();
    });

    test('sets currentURL', function() {
      assert.equal(Rocketbar.currentURL, null);
      this.sinon.stub(AppWindowManager, 'getActiveApp')
        .returns({
          config: {
            chrome: true,
            url: 'http://mozilla.org'
          }
        });
      Rocketbar.render(true);

      assert.equal(Rocketbar.currentURL, 'http://mozilla.org');
      Rocketbar.hide();
    });

    suite('interactions', function() {
      var searchAppStub, cardsViewStub, focusStub;

      setup(function() {
        searchAppStub = this.sinon.stub(Rocketbar, 'loadSearchApp')
                            .returns(true);
        cardsViewStub = this.sinon.stub(window, 'dispatchEvent');
        focusStub = this.sinon.stub(Rocketbar.searchBar, 'focus');
      });

      teardown(function() {
        cardsViewStub.restore();
        searchAppStub.restore();
        focusStub.restore();
      });

      test('swipe event', function() {
        Rocketbar.pointerY = 100;
        Rocketbar.render(200);
        this.sinon.clock.tick();
        assert.equal(cardsViewStub.getCall(0).args[0].type, 'taskmanagershow');
        assert.equal(true, focusStub.notCalled);
        Rocketbar.hide();
      });

      test('tap event', function() {
        var called = false;
        window.addEventListener('taskmanagershow', function() {
          called = true;
        });
        Rocketbar.pointerY = 0;
        Rocketbar.render(100);
        this.sinon.clock.tick();
        assert.equal(false, called);
        assert.equal(cardsViewStub.getCall(0).args[0].type, 'taskmanagershow');
        assert.equal(true, focusStub.notCalled);
        Rocketbar.hide();
      });
    });
  });

  suite('onSearchMessage', function() {
    test('sets the input value', function() {
      Rocketbar.onSearchMessage({
        detail: {input: 'foo'}
      });
      assert.equal(Rocketbar.searchInput.value, 'foo');
    });

    test('can hide the rocketbar', function() {
      var stub = this.sinon.stub(Rocketbar, 'hide');
      Rocketbar.onSearchMessage({
        detail: {action: 'hide'}
      });
      assert.ok(stub.calledOnce);
    });
  });

  suite('hide', function() {
    setup(function() {
      this.sinon.stub(Rocketbar, 'initSearchConnection');
    });

    test('shown should be false', function() {
      Rocketbar.render();
      this.sinon.clock.tick();
      Rocketbar.hide();
      assert.equal(Rocketbar.shown, false);
    });

    test('keyboardchange listener is removed', function() {
      var eventListenerStub = this.sinon.stub(window.document.body,
        'removeEventListener');
      Rocketbar.render();
      this.sinon.clock.tick();
      Rocketbar.hide();
      assert.isTrue(eventListenerStub.withArgs('keyboardchange').calledOnce);
    });

   test('blurs the input', function() {
      var inputBlurStub = this.sinon.stub(Rocketbar.searchInput, 'blur')
                          .returns(true);
      Rocketbar.render();
      this.sinon.clock.tick();
      Rocketbar.hide();
      assert.equal(true, inputBlurStub.calledWith());
      inputBlurStub.restore();
    });

    test('fires the rocketbarhidden event', function() {
      var called = false;
      window.addEventListener('rocketbarhidden', function() {
        called = true;
      });
      Rocketbar.render();
      this.sinon.clock.tick();
      Rocketbar.hide();
      assert.equal(called, true);
    });
  });
});
