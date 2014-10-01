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

  //var realDispatchEvent = window.dispatchEvent;
  var CustomEvent = window.CustomEvent;

  var fireChromeEvent = function(type) {
    var evt = new CustomEvent('mozChromeEvent', {
      detail: {
        type: type
      }
    });

    /**
     * XXX: Instead of dispatch the event through real dispatchEvent here
     * (bypass stub), we call handleEvent() directly to avoid possible conflict
     * within our dirty unit test environment. See bug 864178 for detail.
     */
    //realDispatchEvent.call(window, evt);
    hardwareButtons.handleEvent(evt);
  };

  suiteSetup(function(done) {
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
    fireChromeEvent('home-button-press');
    fireChromeEvent('home-button-release');

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
    fireChromeEvent('home-button-press');
    fireChromeEvent('home-button-release');

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

    fireChromeEvent('home-button-press');
    fireChromeEvent('home-button-release');

    assert.isTrue(stubDispatchEvent.notCalled);
  });

  test('press and release sleep (screen enabled)', function() {
    fireChromeEvent('sleep-button-press');
    fireChromeEvent('sleep-button-release');

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
    fireChromeEvent('sleep-button-press');
    fireChromeEvent('sleep-button-release');

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

    fireChromeEvent('sleep-button-press');
    fireChromeEvent('volume-down-button-press');

    // hold timeout was cancelled, screenshot timeout called
    assert.isTrue(stubClearTimeout.calledOnce);
    assert.isTrue(stubSetTimeout.calledTwice);

    // Fire the screenshot timeout
    stubSetTimeout.getCall(1).args[0].call(window);
    assert.isTrue(stubDispatchEvent.calledOnce);
    assert.isTrue(stubDispatchEvent.calledWith({ type: 'volumedown+sleep',
                                                 bubbles: false }));
  });

  test('hold volume-down and press sleep (screen disabled)', function() {
    ScreenManager.screenEnabled = false;
    fireChromeEvent('sleep-button-press');
    fireChromeEvent('volume-down-button-press');

    assert.isTrue(stubSetTimeout.calledTwice);
    stubSetTimeout.getCall(1).args[0].call(window);

    fireChromeEvent('sleep-button-release');
    fireChromeEvent('volume-down-button-release');

    assert.isTrue(stubDispatchEvent.calledTwice);
    assert.isTrue(
      stubDispatchEvent.getCall(0).calledWith({ type: 'wake',
                                                bubbles: false }));
    assert.isTrue(
      stubDispatchEvent.getCall(1).calledWith({ type: 'volumedown+sleep',
                                                bubbles: false }));
  });

  test('hold sleep and press volume-down (screen enabled)', function() {
    fireChromeEvent('volume-down-button-press');
    fireChromeEvent('sleep-button-press');
    assert.isTrue(stubSetTimeout.calledTwice);
    stubSetTimeout.getCall(1).args[0].call(window);
    fireChromeEvent('sleep-button-release');
    fireChromeEvent('volume-down-button-release');

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
    fireChromeEvent('sleep-button-press');
    fireChromeEvent('volume-down-button-press');
    assert.isTrue(stubSetTimeout.calledTwice);
    stubSetTimeout.getCall(1).args[0].call(window);
    fireChromeEvent('volume-down-button-release');
    fireChromeEvent('sleep-button-release');

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
    fireChromeEvent('home-button-press');

    assert.isTrue(stubSetTimeout.calledOnce);
    assert.equal(stubSetTimeout.getCall(0).args[1],
      hardwareButtons.HOLD_INTERVAL);
    stubSetTimeout.getCall(0).args[0].call(window);

    fireChromeEvent('home-button-release');

    assert.isTrue(stubDispatchEvent.calledOnce);
    assert.isTrue(stubDispatchEvent.calledWith({ type: 'holdhome',
                                                 bubbles: false }));
    assert.isTrue(stubClearTimeout.calledOnce);
    assert.equal(stubClearTimeout.getCall(0).args[0],
      stubSetTimeout.getCall(0).returnValue);
  });

  test('press and hold home (screen disabled)', function() {
    ScreenManager.screenEnabled = false;
    fireChromeEvent('home-button-press');

    assert.isTrue(stubSetTimeout.calledOnce);
    assert.equal(stubSetTimeout.getCall(0).args[1],
      hardwareButtons.HOLD_INTERVAL);
    stubSetTimeout.getCall(0).args[0].call(window);

    fireChromeEvent('home-button-release');

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
    fireChromeEvent('sleep-button-press');

    assert.isTrue(stubSetTimeout.calledOnce);
    assert.equal(stubSetTimeout.getCall(0).args[1],
      hardwareButtons.HOLD_INTERVAL);
    stubSetTimeout.getCall(0).args[0].call(window);

    fireChromeEvent('sleep-button-release');

    assert.isTrue(stubDispatchEvent.calledOnce);
    assert.isTrue(stubDispatchEvent.calledWith({ type: 'holdsleep',
                                                 bubbles: false }));
    assert.isTrue(stubClearTimeout.calledOnce);
    assert.equal(stubClearTimeout.getCall(0).args[0],
      stubSetTimeout.getCall(0).returnValue);
  });

  test('press and hold sleep (screen disabled)', function() {
    ScreenManager.screenEnabled = false;
    fireChromeEvent('sleep-button-press');

    assert.isTrue(stubSetTimeout.calledOnce);
    assert.equal(stubSetTimeout.getCall(0).args[1],
      hardwareButtons.HOLD_INTERVAL);
    stubSetTimeout.getCall(0).args[0].call(window);

    fireChromeEvent('sleep-button-release');

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
    fireChromeEvent('volume-up-button-press');
    fireChromeEvent('volume-up-button-release');

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
    fireChromeEvent('volume-up-button-press');
    fireChromeEvent('volume-up-button-release');

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
    fireChromeEvent('volume-up-button-press');

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

    fireChromeEvent('volume-up-button-release');

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
    fireChromeEvent('volume-up-button-press');

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

    fireChromeEvent('volume-up-button-release');

    assert.isTrue(stubDispatchEvent.calledTwice);
    assert.isTrue(
      stubDispatchEvent.getCall(1).calledWith({ type: 'volumeup',
                                                bubbles: false }));
    assert.isTrue(stubClearTimeout.calledOnce);
    assert.equal(stubClearTimeout.getCall(0).args[0],
      stubSetTimeout.getCall(0).returnValue);
  });

  test('press and release volume down (screen enabled)', function() {
    fireChromeEvent('volume-down-button-press');
    fireChromeEvent('volume-down-button-release');

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
    fireChromeEvent('volume-down-button-press');
    fireChromeEvent('volume-down-button-release');

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
    fireChromeEvent('volume-down-button-press');

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

    fireChromeEvent('volume-down-button-release');

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
    fireChromeEvent('volume-down-button-press');

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

    fireChromeEvent('volume-down-button-release');

    assert.isTrue(stubDispatchEvent.calledTwice);
    assert.isTrue(
      stubDispatchEvent.getCall(1).calledWith({ type: 'volumedown',
                                                bubbles: false }));
    assert.isTrue(stubClearTimeout.calledOnce);
    assert.equal(stubClearTimeout.getCall(0).args[0],
      stubSetTimeout.getCall(0).returnValue);
  });
});
