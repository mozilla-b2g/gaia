requireCommon('/test/marionette.js');

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
    this.timeout(4000);
    yield device.setScriptTimeout(5000);
    yield device.goUrl('app://system.gaiamobile.org');
  });

  test('power button', function() {
    var isEnabled;

    this.timeout(10000);
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
