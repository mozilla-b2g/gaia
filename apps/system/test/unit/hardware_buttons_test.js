'use strict';

/* global HardwareButtons, MocksHelper, ScreenManager, MockSettingsListener */

require('/test/unit/mock_screen_manager.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');

var mocksForHardwareButtons = new MocksHelper([
  'SettingsListener',
  'ScreenManager'
]).init();

suite('system/HardwareButtons', function() {
  mocksForHardwareButtons.attachTestHelpers();

  var hardwareButtons;

  var stubDispatchEvent;
  var stubSetTimeout;
  var stubClearTimeout;
  var i = 0;

  var CustomEvent = window.CustomEvent;

  var createHardwareKeyEvent = function(type, key, embeddedCancelled) {
    return {
      type: type,
      key: key,
      location: 0,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
      repeat: false,
      embeddedCancelled: embeddedCancelled,
      preventDefault: function() {},
      getModifierState: function() {}
    };
  };

  var fireHardwareKeyEvent = function (type, key, embeddedCancelled) {
    hardwareButtons.handleEvent(
      createHardwareKeyEvent(type, key, embeddedCancelled));
  };

  suiteSetup(function(done) {
    require('/js/browser_key_event_manager.js');
    /**
     * Since the script initializes itself, mocks needs to be in it's right
     * places before we could load the script. We also want to stop() the
     * "global" instance so it will not be responsive in our tests here.
     */
    require('/js/hardware_buttons.js', function() {
      window.hardwareButtons.stop();
      window.hardwareButtons = null;

      done();
    });
  });

  setup(function() {
    hardwareButtons = new HardwareButtons();
    hardwareButtons.start();

    window.CustomEvent = function MockCustomEvent(type, dict) {
      return { type: type, bubbles: dict.bubbles };
    };

    stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
    stubSetTimeout = this.sinon.stub(window, 'setTimeout');
    stubSetTimeout.returns(++i);
    stubClearTimeout = this.sinon.stub(window, 'clearTimeout');
  });

  teardown(function() {
    hardwareButtons.stop();

    ScreenManager.screenEnabled = true;
    window.CustomEvent = CustomEvent;
  });

  test('press and release home (screen enabled)', function() {
    fireHardwareKeyEvent('mozbrowserbeforekeydown', 'Home', false);
    fireHardwareKeyEvent('mozbrowserbeforekeyup', 'Home', false);

    assert.isTrue(stubDispatchEvent.calledOnce);
    assert.isTrue(stubDispatchEvent.calledWith({ type: 'home',
                                                 bubbles: true }));

    assert.isTrue(stubSetTimeout.calledOnce);
    assert.equal(stubSetTimeout.getCall(0).args[1],
      hardwareButtons.HOLD_INTERVAL);
    assert.isTrue(stubClearTimeout.calledOnce);
    assert.equal(stubClearTimeout.getCall(0).args[0],
      stubSetTimeout.getCall(0).returnValue);
  });

  test('press and release home (screen disabled)', function() {
    ScreenManager.screenEnabled = false;
    fireHardwareKeyEvent('mozbrowserbeforekeydown', 'Home', false);
    fireHardwareKeyEvent('mozbrowserbeforekeyup', 'Home', false);

    assert.isTrue(stubDispatchEvent.calledOnce);
    assert.isTrue(stubDispatchEvent.calledWith({ type: 'wake',
                                                 bubbles: false }));

    assert.isTrue(stubSetTimeout.calledOnce);
    assert.equal(stubSetTimeout.getCall(0).args[1],
      hardwareButtons.HOLD_INTERVAL);
    assert.isTrue(stubClearTimeout.calledOnce);
    assert.equal(stubClearTimeout.getCall(0).args[0],
      stubSetTimeout.getCall(0).returnValue);
  });

  test('press and release home ' +
      '(system app focused and screen enabled)', function() {
    fireHardwareKeyEvent('keydown', 'Home', false);
    fireHardwareKeyEvent('keyup', 'Home', false);

    assert.isTrue(stubDispatchEvent.calledOnce);
    assert.isTrue(stubDispatchEvent.calledWith({ type: 'home',
                                                 bubbles: true }));

    assert.isTrue(stubSetTimeout.calledOnce);
    assert.equal(stubSetTimeout.getCall(0).args[1],
      hardwareButtons.HOLD_INTERVAL);
    assert.isTrue(stubClearTimeout.calledOnce);
    assert.equal(stubClearTimeout.getCall(0).args[0],
      stubSetTimeout.getCall(0).returnValue);
  });

  test('press and release home ' +
      '(system app focused and screen disabled)', function() {
    ScreenManager.screenEnabled = false;
    fireHardwareKeyEvent('keydown', 'Home', false);
    fireHardwareKeyEvent('keyup', 'Home', false);

    assert.isTrue(stubDispatchEvent.calledOnce);
    assert.isTrue(stubDispatchEvent.calledWith({ type: 'wake',
                                                 bubbles: false }));

    assert.isTrue(stubSetTimeout.calledOnce);
    assert.equal(stubSetTimeout.getCall(0).args[1],
      hardwareButtons.HOLD_INTERVAL);
    assert.isTrue(stubClearTimeout.calledOnce);
    assert.equal(stubClearTimeout.getCall(0).args[0],
      stubSetTimeout.getCall(0).returnValue);
  });

  test('press and release home (soft home enabled)', function() {
    MockSettingsListener.mCallbacks['software-button.enabled'](true);

    var beforeKeydownEvent =
      createHardwareKeyEvent('mozbrowserbeforekeydown', 'Home', false);
    var afterKeydownEvent =
      createHardwareKeyEvent('mozbrowserbeforekeyup', 'Home', false);
    this.sinon.spy(beforeKeydownEvent, 'preventDefault');
    this.sinon.spy(afterKeydownEvent, 'preventDefault');

    hardwareButtons.handleEvent(beforeKeydownEvent);
    hardwareButtons.handleEvent(afterKeydownEvent);

    assert.isTrue(stubDispatchEvent.notCalled);
    assert.isTrue(beforeKeydownEvent.preventDefault.calledOnce);
    assert.isTrue(afterKeydownEvent.preventDefault.calledOnce);

    beforeKeydownEvent.preventDefault.restore();
    afterKeydownEvent.preventDefault.restore();
  });

  test('press and release sleep (screen enabled)', function() {
    fireHardwareKeyEvent('mozbrowserbeforekeydown', 'Power', false);
    fireHardwareKeyEvent('mozbrowserbeforekeyup', 'Power', false);

    assert.isTrue(stubDispatchEvent.calledOnce);
    assert.isTrue(stubDispatchEvent.calledWith({ type: 'sleep',
                                                 bubbles: false }));

    assert.isTrue(stubSetTimeout.calledOnce);
    assert.equal(stubSetTimeout.getCall(0).args[1],
      hardwareButtons.HOLD_INTERVAL);
    assert.isTrue(stubClearTimeout.calledOnce);
    assert.equal(stubClearTimeout.getCall(0).args[0],
      stubSetTimeout.getCall(0).returnValue);
  });

  test('press and release sleep (screen disabled)', function() {
    ScreenManager.screenEnabled = false;
    fireHardwareKeyEvent('mozbrowserbeforekeydown', 'Power', false);
    fireHardwareKeyEvent('mozbrowserbeforekeyup', 'Power', false);

    assert.isTrue(stubDispatchEvent.calledOnce);
    assert.isTrue(stubDispatchEvent.calledWith({ type: 'wake',
                                                 bubbles: false }));

    assert.isTrue(stubSetTimeout.calledOnce);
    assert.equal(stubSetTimeout.getCall(0).args[1],
      hardwareButtons.HOLD_INTERVAL);
    assert.isTrue(stubClearTimeout.calledOnce);
    assert.equal(stubClearTimeout.getCall(0).args[0],
      stubSetTimeout.getCall(0).returnValue);
  });

  test('hold volume-down and press sleep (screen enabled)', function() {
    fireHardwareKeyEvent('mozbrowserbeforekeydown', 'Power', false);
    fireHardwareKeyEvent('mozbrowserafterkeydown', 'VolumeDown', false);

    // hold timeout was cancelled, screenshot timeout called
    assert.isTrue(stubClearTimeout.calledOnce);
    assert.isTrue(stubSetTimeout.calledTwice);

    // Fire the screenshot timeout
    stubSetTimeout.getCall(1).args[0].call(window);
    assert.isTrue(stubDispatchEvent.calledOnce);
    assert.isTrue(stubDispatchEvent.calledWith({ type: 'volumedown+sleep',
                                                 bubbles: false }));
  });

  test('hold volume-down and press volume-up (screen enabled)', function() {
    fireHardwareKeyEvent('mozbrowserafterkeydown', 'VolumeDown', false);
    fireHardwareKeyEvent('mozbrowserafterkeydown', 'VolumeUp', false);

    // hold timeout was cancelled, capture timeout called
    assert.isTrue(stubClearTimeout.calledOnce);
    assert.isTrue(stubSetTimeout.calledTwice);

    fireHardwareKeyEvent('mozbrowserbeforekeyup', 'VolumeUp', false);
    fireHardwareKeyEvent('mozbrowserafterkeyup', 'VolumeDown', false);

    // Fire the capturelog timeout
    stubSetTimeout.getCall(1).args[0].call(window);
    assert.isTrue(stubDispatchEvent.calledOnce);
    assert.isTrue(stubDispatchEvent.calledWith({ type: 'volumeup+volumedown',
                                                 bubbles: false }));
  });

  test('hold volume-down and press sleep (screen disabled)', function() {
    ScreenManager.screenEnabled = false;
    fireHardwareKeyEvent('mozbrowserbeforekeydown', 'Power', false);
    fireHardwareKeyEvent('mozbrowserafterkeydown', 'VolumeDown', false);

    assert.isTrue(stubSetTimeout.calledTwice);
    stubSetTimeout.getCall(1).args[0].call(window);

    fireHardwareKeyEvent('mozbrowserbeforekeyup', 'Power', false);
    fireHardwareKeyEvent('mozbrowserafterkeyup', 'VolumeDown', false);

    assert.isTrue(stubDispatchEvent.calledTwice);
    assert.isTrue(
      stubDispatchEvent.getCall(0).calledWith({ type: 'wake',
                                                bubbles: false }));
    assert.isTrue(
      stubDispatchEvent.getCall(1).calledWith({ type: 'volumedown+sleep',
                                                bubbles: false }));
  });

  test('hold sleep and press volume-down (screen enabled)', function() {
    fireHardwareKeyEvent('mozbrowserafterkeydown', 'VolumeDown', false);
    fireHardwareKeyEvent('mozbrowserbeforekeydown', 'Power', false);

    assert.isTrue(stubSetTimeout.calledTwice);
    stubSetTimeout.getCall(1).args[0].call(window);

    fireHardwareKeyEvent('mozbrowserbeforekeyup', 'Power', false);
    fireHardwareKeyEvent('mozbrowserafterkeyup', 'VolumeDown', false);

    assert.isTrue(stubDispatchEvent.calledOnce);
    assert.isTrue(stubDispatchEvent.calledWith({ type: 'volumedown+sleep',
                                                 bubbles: false }));

    assert.isTrue(stubSetTimeout.calledTwice);
    assert.equal(stubSetTimeout.getCall(0).args[1],
      hardwareButtons.REPEAT_DELAY);
    assert.isTrue(stubClearTimeout.calledTwice);
    assert.equal(stubClearTimeout.getCall(0).args[0],
      stubSetTimeout.getCall(0).returnValue);
  });

  test('hold sleep and press volume-down (screen disabled)', function() {
    ScreenManager.screenEnabled = false;
    fireHardwareKeyEvent('mozbrowserbeforekeydown', 'Power', false);
    fireHardwareKeyEvent('mozbrowserafterkeydown', 'VolumeDown', false);

    assert.isTrue(stubSetTimeout.calledTwice);
    stubSetTimeout.getCall(1).args[0].call(window);

    fireHardwareKeyEvent('mozbrowserafterkeyup', 'VolumeDown', false);
    fireHardwareKeyEvent('mozbrowserbeforekeyup', 'Power', false);

    assert.isTrue(stubDispatchEvent.calledTwice);
    assert.isTrue(
      stubDispatchEvent.getCall(0).calledWith({ type: 'wake',
                                                bubbles: false }));
    assert.isTrue(
      stubDispatchEvent.getCall(1).calledWith({ type: 'volumedown+sleep',
                                                bubbles: false }));

    assert.isTrue(stubSetTimeout.calledTwice);
    assert.equal(stubSetTimeout.getCall(0).args[1],
      hardwareButtons.HOLD_INTERVAL);
    assert.isTrue(stubClearTimeout.calledTwice);
    assert.equal(stubClearTimeout.getCall(0).args[0],
      stubSetTimeout.getCall(0).returnValue);
  });

  test('press and hold home (screen enabled)', function() {
    fireHardwareKeyEvent('mozbrowserbeforekeydown', 'Home', false);

    assert.isTrue(stubSetTimeout.calledOnce);
    assert.equal(stubSetTimeout.getCall(0).args[1],
      hardwareButtons.HOLD_INTERVAL);
    stubSetTimeout.getCall(0).args[0].call(window);

    fireHardwareKeyEvent('mozbrowserbeforekeyup', 'Home', false);

    assert.isTrue(stubDispatchEvent.calledOnce);
    assert.isTrue(stubDispatchEvent.calledWith({ type: 'holdhome',
                                                 bubbles: false }));
    assert.isTrue(stubClearTimeout.calledOnce);
    assert.equal(stubClearTimeout.getCall(0).args[0],
      stubSetTimeout.getCall(0).returnValue);
  });

  test('press and hold home (screen disabled)', function() {
    ScreenManager.screenEnabled = false;
    fireHardwareKeyEvent('mozbrowserbeforekeydown', 'Home', false);

    assert.isTrue(stubSetTimeout.calledOnce);
    assert.equal(stubSetTimeout.getCall(0).args[1],
      hardwareButtons.HOLD_INTERVAL);
    stubSetTimeout.getCall(0).args[0].call(window);

    fireHardwareKeyEvent('mozbrowserbeforekeyup', 'Home', false);

    assert.isTrue(stubDispatchEvent.calledTwice);
    assert.isTrue(
      stubDispatchEvent.getCall(0).calledWith({ type: 'wake',
                                                bubbles: false }));
    assert.isTrue(
      stubDispatchEvent.getCall(1).calledWith({ type: 'holdhome',
                                                bubbles: false }));
    assert.isTrue(stubClearTimeout.calledOnce);
    assert.equal(stubClearTimeout.getCall(0).args[0],
      stubSetTimeout.getCall(0).returnValue);
  });

  test('press and hold sleep (screen enabled)', function() {
    fireHardwareKeyEvent('mozbrowserbeforekeydown', 'Power', false);

    assert.isTrue(stubSetTimeout.calledOnce);
    assert.equal(stubSetTimeout.getCall(0).args[1],
      hardwareButtons.HOLD_INTERVAL);
    stubSetTimeout.getCall(0).args[0].call(window);

    fireHardwareKeyEvent('mozbrowserbeforekeyup', 'Power', false);

    assert.isTrue(stubDispatchEvent.calledOnce);
    assert.isTrue(stubDispatchEvent.calledWith({ type: 'holdsleep',
                                                 bubbles: false }));
    assert.isTrue(stubClearTimeout.calledOnce);
    assert.equal(stubClearTimeout.getCall(0).args[0],
      stubSetTimeout.getCall(0).returnValue);
  });

  test('press and hold sleep (screen disabled)', function() {
    ScreenManager.screenEnabled = false;
    fireHardwareKeyEvent('mozbrowserbeforekeydown', 'Power', false);

    assert.isTrue(stubSetTimeout.calledOnce);
    assert.equal(stubSetTimeout.getCall(0).args[1],
      hardwareButtons.HOLD_INTERVAL);
    stubSetTimeout.getCall(0).args[0].call(window);

    fireHardwareKeyEvent('mozbrowserbeforekeyup', 'Power', false);

    assert.isTrue(stubDispatchEvent.calledTwice);
    assert.isTrue(
      stubDispatchEvent.getCall(0).calledWith({ type: 'wake',
                                                bubbles: false }));
    assert.isTrue(
      stubDispatchEvent.getCall(1).calledWith({ type: 'holdsleep',
                                                bubbles: false }));
    assert.isTrue(stubClearTimeout.calledOnce);
    assert.equal(stubClearTimeout.getCall(0).args[0],
      stubSetTimeout.getCall(0).returnValue);
  });

  test('press and release volume up (screen enabled)', function() {
    fireHardwareKeyEvent('mozbrowserafterkeydown', 'VolumeUp', false);
    fireHardwareKeyEvent('mozbrowserafterkeyup', 'VolumeUp', false);

    assert.isTrue(stubDispatchEvent.calledOnce);
    assert.isTrue(stubDispatchEvent.calledWith({ type: 'volumeup',
                                                 bubbles: false }));
    assert.isTrue(stubSetTimeout.calledOnce);
    assert.equal(stubSetTimeout.getCall(0).args[1],
      hardwareButtons.REPEAT_DELAY);
    assert.isTrue(stubClearTimeout.calledOnce);
    assert.equal(stubClearTimeout.getCall(0).args[0],
      stubSetTimeout.getCall(0).returnValue);
  });

  test('press and release volume up (screen disabled)', function() {
    ScreenManager.screenEnabled = false;
    fireHardwareKeyEvent('mozbrowserafterkeydown', 'VolumeUp', false);
    fireHardwareKeyEvent('mozbrowserafterkeyup', 'VolumeUp', false);

    assert.isTrue(stubDispatchEvent.calledOnce);
    assert.isTrue(stubDispatchEvent.calledWith({ type: 'volumeup',
                                                 bubbles: false }));
    assert.isTrue(stubSetTimeout.calledOnce);
    assert.equal(stubSetTimeout.getCall(0).args[1],
      hardwareButtons.REPEAT_DELAY);
    assert.isTrue(stubClearTimeout.calledOnce);
    assert.equal(stubClearTimeout.getCall(0).args[0],
      stubSetTimeout.getCall(0).returnValue);
  });

  test('press and hold volume up (screen enabled)', function() {
    fireHardwareKeyEvent('mozbrowserafterkeydown', 'VolumeUp', false);

    assert.isTrue(stubSetTimeout.calledOnce);
    assert.equal(stubSetTimeout.getCall(0).args[1],
      hardwareButtons.REPEAT_DELAY);
    stubSetTimeout.getCall(0).args[0].call(window);

    assert.isTrue(stubDispatchEvent.calledOnce);
    assert.isTrue(
      stubDispatchEvent.getCall(0).calledWith({ type: 'volumeup',
                                                bubbles: false }));

    assert.isTrue(stubSetTimeout.calledTwice);
    assert.equal(stubSetTimeout.getCall(1).args[1],
      hardwareButtons.REPEAT_INTERVAL);
    stubSetTimeout.getCall(1).args[0].call(window);

    fireHardwareKeyEvent('mozbrowserafterkeyup', 'VolumeUp', false);

    assert.isTrue(stubDispatchEvent.calledTwice);
    assert.isTrue(
      stubDispatchEvent.getCall(1).calledWith({ type: 'volumeup',
                                                bubbles: false }));
    assert.isTrue(stubClearTimeout.calledOnce);
    assert.equal(stubClearTimeout.getCall(0).args[0],
      stubSetTimeout.getCall(0).returnValue);
  });

  test('press and hold volume up (screen disabled)', function() {
    ScreenManager.screenEnabled = false;
    fireHardwareKeyEvent('mozbrowserafterkeydown', 'VolumeUp', false);

    assert.isTrue(stubSetTimeout.calledOnce);
    assert.equal(stubSetTimeout.getCall(0).args[1],
      hardwareButtons.REPEAT_DELAY);
    stubSetTimeout.getCall(0).args[0].call(window);

    assert.isTrue(stubDispatchEvent.calledOnce);
    assert.isTrue(
      stubDispatchEvent.getCall(0).calledWith({ type: 'volumeup',
                                                bubbles: false }));

    assert.isTrue(stubSetTimeout.calledTwice);
    assert.equal(stubSetTimeout.getCall(1).args[1],
      hardwareButtons.REPEAT_INTERVAL);
    stubSetTimeout.getCall(1).args[0].call(window);

    fireHardwareKeyEvent('mozbrowserafterkeyup', 'VolumeUp', false);

    assert.isTrue(stubDispatchEvent.calledTwice);
    assert.isTrue(
      stubDispatchEvent.getCall(1).calledWith({ type: 'volumeup',
                                                bubbles: false }));
    assert.isTrue(stubClearTimeout.calledOnce);
    assert.equal(stubClearTimeout.getCall(0).args[0],
      stubSetTimeout.getCall(0).returnValue);
  });

  test('press and release volume down (screen enabled)', function() {
    fireHardwareKeyEvent('mozbrowserafterkeydown', 'VolumeDown', false);
    fireHardwareKeyEvent('mozbrowserafterkeyup', 'VolumeDown', false);

    assert.isTrue(stubDispatchEvent.calledOnce);
    assert.isTrue(stubDispatchEvent.calledWith({ type: 'volumedown',
                                                  bubbles: false }));
    assert.isTrue(stubSetTimeout.calledOnce);
    assert.equal(stubSetTimeout.getCall(0).args[1],
      hardwareButtons.REPEAT_DELAY);
    assert.isTrue(stubClearTimeout.calledOnce);
    assert.equal(stubClearTimeout.getCall(0).args[0],
      stubSetTimeout.getCall(0).returnValue);
  });

  test('press and release volume down (screen disabled)', function() {
    ScreenManager.screenEnabled = false;
    fireHardwareKeyEvent('mozbrowserafterkeydown', 'VolumeDown', false);
    fireHardwareKeyEvent('mozbrowserafterkeyup', 'VolumeDown', false);

    assert.isTrue(stubDispatchEvent.calledOnce);
    assert.isTrue(stubDispatchEvent.calledWith({ type: 'volumedown',
                                                 bubbles: false }));
    assert.isTrue(stubSetTimeout.calledOnce);
    assert.equal(stubSetTimeout.getCall(0).args[1],
      hardwareButtons.REPEAT_DELAY);
    assert.isTrue(stubClearTimeout.calledOnce);
    assert.equal(stubClearTimeout.getCall(0).args[0],
      stubSetTimeout.getCall(0).returnValue);
  });

  test('press and hold volume down (screen enabled)', function() {
    fireHardwareKeyEvent('mozbrowserafterkeydown', 'VolumeDown', false);

    assert.isTrue(stubSetTimeout.calledOnce);
    assert.equal(stubSetTimeout.getCall(0).args[1],
      hardwareButtons.REPEAT_DELAY);
    stubSetTimeout.getCall(0).args[0].call(window);

    assert.isTrue(stubDispatchEvent.calledOnce);
    assert.isTrue(
      stubDispatchEvent.getCall(0).calledWith({ type: 'volumedown',
                                                bubbles: false }));

    assert.isTrue(stubSetTimeout.calledTwice);
    assert.equal(stubSetTimeout.getCall(1).args[1],
      hardwareButtons.REPEAT_INTERVAL);
    stubSetTimeout.getCall(1).args[0].call(window);

    fireHardwareKeyEvent('mozbrowserafterkeyup', 'VolumeDown', false);

    assert.isTrue(stubDispatchEvent.calledTwice);
    assert.isTrue(
      stubDispatchEvent.getCall(1).calledWith({ type: 'volumedown',
                                                bubbles: false }));
    assert.isTrue(stubClearTimeout.calledOnce);
    assert.equal(stubClearTimeout.getCall(0).args[0],
      stubSetTimeout.getCall(0).returnValue);
  });

  test('press and hold volume down (screen disabled)', function() {
    ScreenManager.screenEnabled = false;
    fireHardwareKeyEvent('mozbrowserafterkeydown', 'VolumeDown', false);

    assert.isTrue(stubSetTimeout.calledOnce);
    assert.equal(stubSetTimeout.getCall(0).args[1],
      hardwareButtons.REPEAT_DELAY);
    stubSetTimeout.getCall(0).args[0].call(window);

    assert.isTrue(stubDispatchEvent.calledOnce);
    assert.isTrue(
      stubDispatchEvent.getCall(0).calledWith({ type: 'volumedown',
                                                bubbles: false }));

    assert.isTrue(stubSetTimeout.calledTwice);
    assert.equal(stubSetTimeout.getCall(1).args[1],
      hardwareButtons.REPEAT_INTERVAL);
    stubSetTimeout.getCall(1).args[0].call(window);

    fireHardwareKeyEvent('mozbrowserafterkeyup', 'VolumeDown', false);

    assert.isTrue(stubDispatchEvent.calledTwice);
    assert.isTrue(
      stubDispatchEvent.getCall(1).calledWith({ type: 'volumedown',
                                                bubbles: false }));
    assert.isTrue(stubClearTimeout.calledOnce);
    assert.equal(stubClearTimeout.getCall(0).args[0],
      stubSetTimeout.getCall(0).returnValue);
  });

  test('press and hold camera', function() {
    fireHardwareKeyEvent('mozbrowserafterkeydown', 'Camera', false);

    assert.isTrue(stubSetTimeout.calledOnce);
    assert.equal(stubSetTimeout.getCall(0).args[1],
      hardwareButtons.HOLD_INTERVAL);
    stubSetTimeout.getCall(0).args[0].call(window);

    fireHardwareKeyEvent('mozbrowserafterkeyup', 'Camera', false);

    assert.isTrue(stubDispatchEvent.calledOnce);
    assert.isTrue(stubDispatchEvent.calledWith({ type: 'holdcamera',
                                                 bubbles: false }));
    assert.isTrue(stubClearTimeout.calledOnce);
    assert.equal(stubClearTimeout.getCall(0).args[0],
      stubSetTimeout.getCall(0).returnValue);
  });
});
