'use strict';

/* global HardwareButtons, MocksHelper, MockService, MockSettingsListener */

require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_service.js');
require('/js/browser_key_event_manager.js');
require('/js/hardware_buttons.js');

var mocksForHardwareButtons = new MocksHelper([
  'SettingsListener',
  'LazyLoader',
  'Service'
]).init();

suite('system/HardwareButtons', function() {
  mocksForHardwareButtons.attachTestHelpers();

  var hardwareButtons;

  var stubDispatchEvent;
  var stubSetTimeout;
  var stubClearTimeout;
  var i = 0;

  //var realDispatchEvent = window.dispatchEvent;
  var CustomEvent = window.CustomEvent;

  var fireHardwareKeyEvent = function (type, key, embeddedCancelled) {
    var evt = {
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
    hardwareButtons.handleEvent(evt);
  };

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
    MockService.mockQueryWith('screenEnabled', true);
  });

  teardown(function() {
    hardwareButtons.stop();

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
    MockService.mockQueryWith('screenEnabled', false);
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
    MockService.mockQueryWith('screenEnabled', false);
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

    fireHardwareKeyEvent('mozbrowserbeforekeydown', 'Home', false);
    fireHardwareKeyEvent('mozbrowserbeforekeyup', 'Home', false);

    assert.isTrue(stubDispatchEvent.notCalled);
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
    MockService.mockQueryWith('screenEnabled', false);
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

  test('hold volume-up and press sleep (screen enabled)', function() {
    fireHardwareKeyEvent('mozbrowserbeforekeydown', 'Power', false);
    fireHardwareKeyEvent('mozbrowserafterkeydown', 'VolumeUp', false);

    // hold timeout was cancelled, capture timeout called
    assert.isTrue(stubClearTimeout.calledOnce);
    assert.isTrue(stubSetTimeout.calledTwice);

    // Fire the capturelog timeout
    stubSetTimeout.getCall(1).args[0].call(window);
    assert.isTrue(stubDispatchEvent.calledOnce);
    assert.isTrue(stubDispatchEvent.calledWith({ type: 'volumeup+sleep',
                                                 bubbles: false }));
  });

  test('hold volume-down and press sleep (screen disabled)', function() {
    MockService.mockQueryWith('screenEnabled', false);
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
    MockService.mockQueryWith('screenEnabled', false);
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
    MockService.mockQueryWith('screenEnabled', false);
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
    MockService.mockQueryWith('screenEnabled', false);
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
    MockService.mockQueryWith('screenEnabled', false);
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
    MockService.mockQueryWith('screenEnabled', false);
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
    MockService.mockQueryWith('screenEnabled', false);
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
    MockService.mockQueryWith('screenEnabled', false);
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
