'use strict';

var Keyboard = require('./lib/keyboard'),
    KeyboardTestApp = require('./lib/keyboard_test_app');

marionette('screenshot reference test', function() {
  var apps = {},
      keyboardTestApp = null,
      keyboard = null,
      client = null;

  apps[KeyboardTestApp.ORIGIN] = __dirname + '/keyboardtestapp';
  client = marionette.client({
    apps: apps,
    prefs: {
      'focusmanager.testmode': true
    }
  });

  setup(function() {
    keyboard = new Keyboard(client);

    keyboardTestApp = new KeyboardTestApp(client);
    keyboardTestApp.launch();
    keyboardTestApp.textInput.click();

    keyboard.waitForDisplayed();
  });

  test('should show the correct UI of lowercase layout', function() {
    // Switch to System app.
    client.switchToFrame();
    console.log('Screenshot: data:image/png;base64,' + client.screenshot());
  });
});
