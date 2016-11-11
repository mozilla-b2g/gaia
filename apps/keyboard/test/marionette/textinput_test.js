'use strict';

var FakeForm = require('./lib/fake_form'),
    assert = require('assert');

var FAKE_FORM_ORIGIN = 'fakeform.gaiamobile.org';


marionette('Keyboard APP', function() {
  var apps = {};
  apps[FAKE_FORM_ORIGIN] = __dirname + '/fakeform';
  var client = marionette.client({
    apps: apps,
    prefs: {
      'focusmanager.testmode': true
    }
  });
  var form;

  setup(function() {
    form = new FakeForm(client, 'app://' + FAKE_FORM_ORIGIN);
    form.launch();
    client.helper.waitForElement('body.loaded');
  });

  suite('input type is text', function() {

    setup(function() {
      form.textInputElement.click();
    });

    test('type string on input', function() {
      // switch to keyboard app
      client.switchToFrame();
      var keyboardORIGIN = 'app://keyboard.gaiamobile.org';
      client.apps.switchToApp(keyboardORIGIN);
      var keyboardBody = client.findElement('div#keyboard');
      client.waitFor(function waiting() {
        return keyboardBody.displayed();
      });

      assert.ok(true);
    });

  });

});
