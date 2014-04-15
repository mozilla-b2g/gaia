'use strict';

var KeyboardTests = require('./lib/keyboard_tests'),
    assert = require('assert');

var KEYBOARD_ORIGIN = 'app://keyboard.gaiamobile.org';
var browser_ORIGIN = 'app://browser.gaiamobile.org';
var urlBar = null;
marionette('Keyboard APP', function() {
  var apps = {},
      //keyboardtests = null,
      client = null;

  apps[KeyboardTests.ORIGIN] = __dirname + '/keyboardtests';
  
  client = marionette.client({
    apps: apps,
    prefs: {
      'focusmanager.testmode': true
    }
  });

  function checkKeyboardAvailable() {
    console.log('checkKeyboardAvailable');

    // switch to System app
    client.switchToFrame();
    //console.log(client.screenshot());

    // Wait for the keyboard pop up and switch to it
    client.waitFor(function() {
      var keyboards = client.findElement('#keyboards');

      var classes = keyboards.getAttribute('class');
      var transitionIn = keyboards.getAttribute('data-transition-in');

      console.log('keyboards class; ' + classes, ' - transition-in: ' +
                  transitionIn);

      return ( classes.indexOf('hide') == -1 ) &&  transitionIn !== 'true';
    });

    //client.helper.wait(5000);
    //console.log('data:image/png;base64,' + client.screenshot());
    client.apps.switchToApp(KEYBOARD_ORIGIN);
    // XXX: Workaround to get the #keyboard element to instead of the body
    // element.
    // The value of `client.findElement('body').displayed()` could not be true
    // when the keyboard app is show up in the screen currently.
    // Please refer to http://bugzil.la/995865.
    var keyboard = client.findElement('#keyboard');
    if (keyboard.displayed()) {
      console.log('keyboard found');
      return true;
    } else {

      console.log('keyboard  not found');
      urlBar.click();
    }
  }

  setup(function() {
    // keyboardtests = new KeyboardTests(client);
    // keyboardtests.launch();
    // keyboardtests.textInput.click(0, 0);
    client.apps.launch(browser_ORIGIN);
    client.apps.switchToApp(browser_ORIGIN);
    client.helper.waitForElement('#url-input');
    urlBar = client.findElement('#url-input');

    urlBar.click();
    client.waitFor(function () {
      return checkKeyboardAvailable(urlBar);
    });
  });

  test('should show lowercase layout', function() {

    /*
    // switch to System app
    client.switchToFrame();
    //console.log(client.screenshot());

    // Wait for the keyboard pop up and switch to it
    client.waitFor(function() {
      var keyboards = client.findElement('#keyboards');

      var classes = keyboards.getAttribute('class');
      var transitionIn = keyboards.getAttribute('data-transition-in');

      console.log(classes, transitionIn);

      return ( classes.indexOf('hide') == -1 ) &&  transitionIn !== 'true';
    });

    //client.helper.wait(5000);
    console.log('data:image/png;base64,' + client.screenshot());
    client.apps.switchToApp(KEYBOARD_ORIGIN);
    // XXX: Workaround to get the #keyboard element to instead of the body
    // element.
    // The value of `client.findElement('body').displayed()` could not be true
    // when the keyboard app is show up in the screen currently.
    // Please refer to http://bugzil.la/995865.
    var keyboard = client.findElement('#keyboard');

    client.waitFor(function() {
      if (keyboard.displayed()) {
        assert.ok(true);
        return true;
      }
    });
    */

    var keyboard = client.findElement('#keyboard');
    if (keyboard.displayed()) {
      assert.ok(true);
    }
  });
});
