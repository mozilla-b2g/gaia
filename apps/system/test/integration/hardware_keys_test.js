requireCommon('/test/marionette.js');
require('apps/system/test/integration/helper.js');

suite('hardware keys', function() {

  var device;
  var chromeEvent;

  testSupport.startMarionette(function(driver) {
    device = driver;
    chromeEvent = testSupport.system.chromeEvent.bind(
      this, device
    );
  });

  function isScreenEnabled() {
    device.executeScript(function() {
      return window.wrappedJSObject.navigator.mozPower.screenEnabled;
    }, MochaTask.nextNodeStyle);
  }

  setup(function() {
    this.timeout(10000);
    yield device.setScriptTimeout(5000);
    yield device.goUrl(testSupport.gaiaUrl('system'));
  });

  test('power button', function() {
    var isEnabled;

    this.timeout(10000);

    // We must wait until the initial loading of the screen
    // and the initial screenchange event to be fired before
    // we can start sending hardware events. They will be ignored
    // until this point (or always send wake).
    var result = yield device.executeAsyncScript(function() {
      var win = window.wrappedJSObject;
      var first = true;

      function notifyChange() {
        win.removeEventListener('screenchange', notifyChange);
        marionetteScriptFinished();
      }

      win.addEventListener('screenchange', notifyChange);
    });

    yield device.setContext('chrome');

    isEnabled = yield isScreenEnabled();

    assert.isTrue(
      isEnabled,
      'screen should be enabled when phone starts'
    );

    yield chromeEvent([
      { type: 'sleep-button-press' },
      { type: 'sleep-button-release' }
    ]);

    isEnabled = yield isScreenEnabled();

    assert.isFalse(
      isEnabled,
      'screen should be disabled after pressing power button'
    );

    yield chromeEvent([
      { type: 'sleep-button-press' },
      { type: 'sleep-button-release' }
    ]);

    isEnabled = yield isScreenEnabled();

    assert.isTrue(
      isEnabled,
      'screen should be enabled by pressing power again'
    );
  });

});
