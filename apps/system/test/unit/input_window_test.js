'use strict';

/* globals InputWindow, AppWindow */

require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/test/unit/mock_orientation_manager.js');
require('/shared/test/unit/mocks/mock_manifest_helper.js');

var mocksForInputWindow = new window.MocksHelper([
  'OrientationManager', 'SettingsListener', 'ManifestHelper'
]).init();

suite('system/InputWindow', function() {
  mocksForInputWindow.attachTestHelpers();

  var app;
  var keyboardContainer;

  setup(function(done) {
    keyboardContainer = document.createElement('div');
    keyboardContainer.id = 'keyboards';
    document.body.appendChild(keyboardContainer);

    require('/js/browser_frame.js');
    require('/js/app_transition_controller.js');
    require('/js/app_window.js');
    require('/js/browser_mixin.js');
    require('/js/input_window.js', function(){
      app = new InputWindow({
        manifest: {},
        manifestURL: 'app://keyboard.gaiamobile.org/manifestURL.webapp',
        origin: 'app://keyboard.gaiamobile.org',
        path: '/index.html#ime1',
        id: 'ime1'
      });

      done();
    });
  });

  teardown(function() {
    document.body.removeChild(keyboardContainer);
  });

  test('Constructor', function() {
    assert.isTrue(app.isInputMethod);
    assert.equal(app.url, 'app://keyboard.gaiamobile.org/index.html#ime1');

    assert.equal(app.browser.element.dataset.frameName, 'ime1');
  });

  suite('Event handlings', function() {
    suite('mozbrowserresize', function() {
      var stubPublish ;
      var stubSetHeight;

      setup(function(){
        // this attaches mozbrowserresize listener
        app._setAsActiveInput(true);

        stubPublish = this.sinon.stub(app, 'publish');
        stubSetHeight = this.sinon.stub(app, '_setHeight');
      });

      teardown(function(){
        app._setAsActiveInput(false);
      });

      var triggerEvent = function (){
        var evt = new CustomEvent('mozbrowserresize', {
          detail: {
            height: 200
          }
        });

        sinon.spy(evt, 'stopPropagation');

        app.browser.element.dispatchEvent(evt);

        return evt;
      };

      test('transitionstate-invariant part', function() {
        var evt = triggerEvent();
        assert.isTrue(stubSetHeight.calledWith(200));
        assert.isTrue(stubPublish.calledWith('ready'));
        assert.isTrue(evt.stopPropagation.called);
      });

      test('transitionstate is opened', function() {
        app.transitionController._transitionState = 'opened';

        triggerEvent();

        assert.isTrue(
          stubPublish.calledWith('heightchanged'),
          'heightchanged should be published when transitionState is opened'
        );
      });

      // these states should not trigger heightchanged
      var otherStates = ['opening', 'closing', 'closed'];

      otherStates.forEach(state => {
        test('transitionstate is ' + state, function() {
          app.transitionController._transitionState = state;

          triggerEvent();

          assert.isFalse(
            stubPublish.calledWith('heightchanged'),
            `heightchanged should not be published
              when transitionState is ${state}`
          );
        });
      });
    });

    suite('_ready', function() {
      var stubSetHeight;
      var stubOpen;

      setup(function(){
        app.element.addEventListener('_ready', app);
        app.height = 300;
        app._pendingReady = true;

        stubSetHeight = this.sinon.stub(app, '_setHeight');
        stubOpen = this.sinon.stub(AppWindow.prototype, 'open');
      });

      test('handler', function() {
        app.publish('ready');

        assert.isTrue(stubSetHeight.calledWith(300));
        assert.isTrue(stubOpen.calledOn(app),
                      'should call superclass open');
        assert.isFalse(app._pendingReady, 'should reset _pendingReady');
      });

      test('immediateOpen = true', function() {
        app.immediateOpen = true;
        app.publish('ready');

        assert.isTrue(stubOpen.calledWith('immediate'),
                      'open should be called with immediate');
      });

      test('immediateOpen = false', function() {
        app.immediateOpen = false;
        app.publish('ready');

        assert.isFalse(stubOpen.calledWith('immediate'),
                       'open should not be called with immediate');
      });

      test('should not be able to triggered twice', function() {
        app.publish('ready');

        app.publish('ready');

        assert.isFalse(stubSetHeight.calledTwice);
        assert.isFalse(stubOpen.calledTwice);
      });
    });
  });

  suite('setHeight()', function() {
    var oldDevicePixelRatio;

    suiteSetup(function() {
      oldDevicePixelRatio = window.devicePixelRatio;

      Object.defineProperty(window, 'devicePixelRatio', {
        get: function() {
          return 2.5;
        },
        configurable: true
      });
    });

    suiteTeardown(function() {
      Object.defineProperty(window, 'devicePixelRatio', {
        get: function() {
          return oldDevicePixelRatio;
        },
        configurable: true
      });
    });

    test('without rounding', function () {
      app._setHeight(20);
      assert.equal(app.height, 20);
    });

    test('with rounding', function () {
      app._setHeight(25);

      // with the round calculation the resulting height should be closed to
      // 24.8, whose dpx should be one px less than ceil(25*dpx).
      assert.isTrue(
        Math.abs(app.height - 24.8) < Number.EPSILON
      );
    });
  });

  suite('setAsActiveInput', function() {
    var stubSetVisible;
    var stubSetInputMethodActive;
    setup(function(){
      stubSetVisible = this.sinon.stub(app, 'setVisible');
      // perhaps the iframe (or any browser element) doesn't have
      // setInputMethodActive, so we need to add it
      if (app.browser.element.setInputMethodActive) {
        stubSetInputMethodActive =
          this.sinon.stub(app.browser.element, 'setInputMethodActive');
      } else {
        stubSetInputMethodActive =
          app.browser.element.setInputMethodActive = this.sinon.stub();
      }

      app.height = 123;
    });

    test('active = true', function() {
      var stubClassListAdd = this.sinon.stub(app.element.classList, 'add');
      var stubAddEventListener =
        this.sinon.stub(app.browser.element, 'addEventListener');

      app._setAsActiveInput(true);

      assert.isTrue(stubSetVisible.calledWith(true));
      assert.isTrue(stubSetInputMethodActive.calledWith(true));
      assert.isTrue(stubClassListAdd.calledWith('top-most'));
      assert.isTrue(
        stubAddEventListener.calledWith('mozbrowserresize', app, true)
      );

      assert.equal(app.height, 123);
    });

    test('active = false', function() {
      var stubClassListRemove =
        this.sinon.stub(app.element.classList, 'remove');
      var stubRemoveEventListener =
        this.sinon.stub(app.browser.element, 'removeEventListener');

      app._setAsActiveInput(false);

      assert.isTrue(stubSetVisible.calledWith(false));
      assert.isTrue(stubSetInputMethodActive.calledWith(false));
      assert.isTrue(stubClassListRemove.calledWith('top-most'));
      assert.isTrue(
        stubRemoveEventListener.calledWith('mozbrowserresize', app, true)
      );

      assert.strictEqual(app.height, 0);
    });
  });

  test('close', function() {
    var stubRemoveEventListener =
      this.sinon.stub(app.element, 'removeEventListener');
    var stubClose = this.sinon.stub(AppWindow.prototype, 'close');

    app.close('immediate');

    assert.isTrue(stubRemoveEventListener.calledWith('_ready'), app);
    assert.isTrue(stubClose.calledOn(app), 'should call superclass open');
    assert.isTrue(stubClose.calledWith('immediate'));

    stubClose.reset();

    app.close();

    assert.isFalse(stubClose.calledWith('immediate'));
  });

  suite('open', function() {
    setup(function() {
      app.hash = '#ime1';
      app.pathInitial = '/index.html';
    });

    test('should set _pendingReady', function() {
      app._pendingReady = false;

      app.open({
        hash: '#ime1',
        immediateOpen: false
      });

      assert.isTrue(app._pendingReady);
    });

    test('hash changed', function() {
      app.immediateOpen = true;

      var configs = {
        id: 'ime2',
        hash: '#ime2',
        immediateOpen: false
      };

      var stubReadyHandler = this.sinon.stub(app, '_handle__ready');
      var stubSetAsActiveInput = this.sinon.stub(app, '_setAsActiveInput');

      app.open(configs);

      assert.equal(app.browser.element.src,
                   'app://keyboard.gaiamobile.org/index.html#ime2');
      assert.equal(app.browser.element.dataset.frameName, 'ime2');
      assert.isFalse(app.immediateOpen);
      assert.isTrue(stubSetAsActiveInput.calledWith(true));

      app.publish('ready');
      assert.isTrue(stubReadyHandler.called);
    });

    suite('hash not changed', function() {
      var stubReadyHandler;
      var configs = {
        hash: '#ime1',
        immediateOpen: false
      };

      setup(function() {
        stubReadyHandler = this.sinon.stub(app, '_handle__ready');
        this.sinon.stub(app, '_setAsActiveInput');

        app.immediateOpen = false;
      });

      test('transitionState is closing', function() {
        app.transitionController._transitionState = 'closing';

        app.open(configs);

        assert.isTrue(
          app.immediateOpen,
          'immediateOpen should be true if hash not changed and state = closing'
        );
        assert.isTrue(
          stubReadyHandler.called,
          `ready should be automatically triggered if hash not changed
            and state = closing`
        );
      });

      // these states should not immediateOpen + trigger ready event
      var otherStates = ['opening', 'opened', 'closed'];

      otherStates.forEach(state => {
        test('transitionState is ' + state, function() {
          app.transitionController._transitionState = state;

          app.open(configs);

          assert.isFalse(
            app.immediateOpen,
            `immediateOpen should be false if hash not changed
              and state = ${state}`
          );

          assert.isFalse(
            stubReadyHandler.called,
            `ready should not be automatically triggered if hash not changed
              and state = ${state}`
          );
        });
      });
    });
  });

  test('should not set/lock orientation', function() {
    var stubLockOrientation =
      this.sinon.stub(AppWindow.prototype, 'lockOrientation');
    var stubSetOrientation =
      this.sinon.stub(AppWindow.prototype, 'setOrientation');

    app.lockOrientation();

    app.setOrientation();

    assert.isFalse(stubLockOrientation.called);
    assert.isFalse(stubSetOrientation.called);
  });
});
