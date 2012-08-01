requireCommon('/test/marionette.js');

suite('hardware keys', function() {

  var device;

  testSupport.startMarionette(function(driver) {
    device = driver;
  });

  function chromeEvent(name) {
    var details = {};

    if (typeof(name) === 'object') {
      details = name;
    } else {
      details = { type: name };
    }

    args.push(details);

    // remember this is toString'ed
    // and sent over the wire at some point
    // to the device so we can't use
    // static scope magic to help us here.
    device.executeScript(function(test, details) {
      var browser = Services.wm.getMostRecentWindow('navigator:browser');
      var content = browser.getContentWindow();
      var events = [];

      if (!content) {
        return;
      }

      if (!Array.isArray(details)) {
        details = [details];
      }

      var i = 0;
      var len = details.length;

      for (; i < len; i++) {
        let event = content.document.createEvent('CustomEvent');
        event.initCustomEvent('mozChromeEvent', true, true, details[i]);
        content.dispatchEvent(event);
        console.log('MARIONETTE CHROME EVENT: ', JSON.stringify(details[i]));
      }
    }, args, MochaTask.nextNodeStyle);
  }

  function isScreenEnabled() {
    device.executeScript(function() {
      return window.wrappedJSObject.navigator.mozPower.screenEnabled;
    }, MochaTask.nextNodeStyle);
  }

  test('power button', function() {
    var isEnabled;

    this.timeout(10000);
    yield device.setScriptTimeout(5000);

    yield device.goUrl('app://system.gaiamobile.org');

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
