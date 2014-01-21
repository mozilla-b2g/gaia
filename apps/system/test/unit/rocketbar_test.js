'use strict';

requireApp('system/shared/js/url_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_cards_view.js');
requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_lock_screen.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/js/lockscreen.js');
mocha.globals(['Rocketbar']);

var LockScreen = { locked: false };

var mocksForRocketBar = new MocksHelper([
  'AppWindowManager',
  'CardsView',
  'LockScreen',
  'AppWindow',
  'SettingsListener'
]).init();

suite('system/Rocketbar', function() {
  var stubById;
  var fakeEvt;
  var fakeElement;

  var fakeAppConfig = {
    url: 'app://www.fake/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake/ManifestURL',
    origin: 'app://www.fake',
    title: 'default'
  };

  mocksForRocketBar.attachTestHelpers();
  setup(function(done) {
    fakeElement = document.createElement('div');
    fakeElement.style.cssText = 'height: 100px; display: block;';
    stubById = this.sinon.stub(document, 'getElementById')
                          .returns(fakeElement.cloneNode(true));
    this.sinon.useFakeTimers();
    requireApp('system/js/rocketbar.js', done);
  });

  teardown(function() {
    stubById.restore();
    this.sinon.clock.restore();
  });

  suite('input', function() {
    test('hides task manager on input', function() {
      var screen = document.getElementById('screen');
      screen.classList.add('task-manager');

      Rocketbar._port = {
        postMessage: function() {}
      };
      var dispatchStub = this.sinon.stub(window, 'dispatchEvent');
      Rocketbar.input.dispatchEvent(new CustomEvent('input'));
      assert.equal(dispatchStub.getCall(0).args[0].type, 'taskmanagerhide');
      screen.classList.remove('task-manager');
    });

    test('adds rocketbar-focus on focus', function() {
      assert.ok(!Rocketbar.screen.classList.contains('rocketbar-focus'));
      Rocketbar.input.value = '';
      Rocketbar.handleFocus();
      assert.ok(Rocketbar.screen.classList.contains('rocketbar-focus'));
    });

    test('removes rocketbar-focus on blur', function() {
      Rocketbar.input.value = '';
      Rocketbar.handleBlur();
      assert.ok(!Rocketbar.screen.classList.contains('rocketbar-focus'));
    });

    test('input on event call updateResetButton', function() {
      var stub = this.sinon.stub(Rocketbar, 'updateResetButton');

      var evt = document.createEvent('CustomEvent');
      evt.initEvent('input', true, true);
      Rocketbar.input.dispatchEvent(evt);

      assert.ok(stub.calledOnce);
      stub.restore();
    });
  });

  suite('events', function() {
    setup(function() {
      this.sinon.stub(Rocketbar, 'initSearchConnection');
    });

    test('updateTitle event should not trigger focus if card', function() {
      var focusStub = this.sinon.stub(Rocketbar.input, 'focus');
      Rocketbar.updateTitle({});
      assert.ok(focusStub.notCalled);
    });

    test('cardviewclosed event should trigger focus', function() {
      Rocketbar.expand();
      var focusStub = this.sinon.stub(Rocketbar.input, 'focus');
      this.sinon.clock.tick(1);
      Rocketbar.cardviewClosed();
      Rocketbar.collapse();
      assert.ok(focusStub.calledOnce);
    });

    test('should not focus when closing rocketbar', function() {
      var stub = this.sinon.stub(Rocketbar.input, 'focus').returns(true);
      Rocketbar.expand();
      Rocketbar.cardviewClosedHome();
      assert.ok(stub.notCalled);
    });

    test('search-cancel element should hide the task manager', function() {
      var dispatchStub = this.sinon.stub(window, 'dispatchEvent');
      Rocketbar.expand();
      Rocketbar.screen.classList.add('task-manager');
      Rocketbar.handleCancel();
      assert.equal(dispatchStub.getCall(1).args[0].type, 'taskmanagerhide');
    });

    test('search-cancel element should show the task manager', function() {
      var dispatchStub = this.sinon.stub(window, 'dispatchEvent');
      var awmStub = this.sinon.stub(AppWindowManager, 'getRunningApps')
        .returns({app1: true, app2: true});
      Rocketbar.screen.classList.remove('task-manager');

      Rocketbar.expand();
      Rocketbar.handleFocus();
      Rocketbar.handleCancel();

      // XXX: assert.equal(dispatchStub.getCall(2).args[0].type,
      //  'taskmanagershow');
    });

    test('focus on event call updateResetButton', function() {
      var stub = this.sinon.stub(Rocketbar, 'updateResetButton');
      Rocketbar.handleFocus();

      assert.ok(stub.calledOnce);
      stub.restore();
    });
  });

  suite('render', function() {
    setup(function() {
      this.sinon.stub(Rocketbar, 'initSearchConnection');
    });

    test('shown should be true', function() {
      Rocketbar.expand();
      assert.equal(Rocketbar.expanded, true);
      Rocketbar.collapse();
    });

    test('only renders once', function() {
      var eventListenerStub = this.sinon.stub(window.document.body,
        'addEventListener');
      Rocketbar.expand();
      Rocketbar.expand();
      assert.isTrue(eventListenerStub.withArgs('keyboardchange').calledOnce);
      Rocketbar.collapse();
    });

    test('resets the value', function() {
      Rocketbar.input.value = 'foo';
      Rocketbar.expand();
      Rocketbar.handleFocus();
      assert.equal(Rocketbar.input.value, '');
      Rocketbar.collapse();
    });

    test('loads the search app', function() {
      var searchAppStub = this.sinon.stub(Rocketbar, 'loadSearchApp');
      Rocketbar.expand();
      assert.equal(true, searchAppStub.calledWith());
      Rocketbar.collapse();
      searchAppStub.restore();
    });

    suite('interactions', function() {
      var searchAppStub, cardsViewStub, focusStub;

      setup(function() {
        searchAppStub = this.sinon.stub(Rocketbar, 'loadSearchApp')
                            .returns(true);
        cardsViewStub = this.sinon.stub(window, 'dispatchEvent');
        focusStub = this.sinon.stub(Rocketbar.input, 'focus');
      });

      teardown(function() {
        cardsViewStub.restore();
        searchAppStub.restore();
        focusStub.restore();
      });

      test('swipe event', function() {
        Rocketbar.showTaskManager();
        this.sinon.clock.tick();
        assert.equal(cardsViewStub.getCall(0).args[0].type, 'taskmanagershow');
        assert.equal(true, focusStub.notCalled);
        Rocketbar.collapse();
      });

      test('tap event', function() {
        var called = false;
        window.addEventListener('taskmanagershow', function() {
          called = true;
        });
        Rocketbar.expand();
        assert.equal(false, called);
        assert.equal(cardsViewStub.getCall(0).args[0].type, 'taskmanagershow');
        assert.equal(true, focusStub.notCalled);
        Rocketbar.collapse();
      });
    });
  });

  suite('onSearchMessage', function() {
    test('fires a change event', function() {
      var message;
      Rocketbar._port = {
        postMessage: function(msg) {
          message = msg;
        }
      };
      Rocketbar.onSearchMessage({
        detail: {input: 'foo'}
      });
      assert.equal(message.action, 'change');
      assert.equal(message.input, 'foo');
    });
  });

  suite('hide', function() {
    setup(function() {
      this.sinon.stub(Rocketbar, 'initSearchConnection');
    });

    test('shown should be false', function() {
      Rocketbar.expand();
      Rocketbar.collapse();
      assert.equal(Rocketbar.expanded, false);
    });

    test('keyboardchange listener is removed', function() {
      var eventListenerStub = this.sinon.stub(window.document.body,
        'removeEventListener');
      Rocketbar.expand();
      Rocketbar.collapse();
      assert.isTrue(eventListenerStub.withArgs('keyboardchange').calledOnce);
    });

   test('blurs the input', function() {
      var inputBlurStub = this.sinon.stub(Rocketbar.input, 'blur')
                          .returns(true);
      Rocketbar.expand();
      Rocketbar.collapse();
      assert.equal(true, inputBlurStub.calledWith());
      inputBlurStub.restore();
    });
  });

  function check(content) {
    assert.equal(Rocketbar.input.value, content);
  }

  suite('handleEvent', function() {
    test('default state', function() {
      Rocketbar.input.value = '';
      check('');
    });

    test('home event', function() {
      Rocketbar.input.value = '';
      window.dispatchEvent(new CustomEvent('home'));
      check('');
    });

    test('app events', function() {
      var events = [
        'appforeground',
        'apploading',
        'apptitlechange'
      ];

      events.forEach(function(event, idx) {
        check('');
        fakeAppConfig.title = 'Test-' + idx;
        var detail = new AppWindow(fakeAppConfig);
        this.sinon.stub(detail, 'isActive').returns(true);

        window.dispatchEvent(new CustomEvent(event, {
          detail: detail}));
        check('Test-' + idx);

        // Reset the title
        Rocketbar.input.value = '';
      }, this);
    });

    test('title does not update if appwindow not active', function() {
      // Set the title to something initially
      fakeAppConfig.title = 'default';
      var detail = new AppWindow(fakeAppConfig);
      this.sinon.stub(detail, 'isActive').returns(true);

      window.dispatchEvent(new CustomEvent('apptitlechange', {
        detail: detail}));
      check('default');

      fakeAppConfig.title = 'not updated';
      var detail = new AppWindow(fakeAppConfig);
      this.sinon.stub(detail, 'isActive').returns(false);
      window.dispatchEvent(new CustomEvent('apptitlechange', {
        detail: detail}));
      check('default');
    });
  });

});
