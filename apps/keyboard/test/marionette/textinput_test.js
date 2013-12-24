var Keyboard = require('./lib/keyboard'),
    FakeForm = require('./lib/fake_form');
    assert = require('assert');

var FAKE_FORM_ORIGIN = 'fakeform.gaiamobile.org';


marionette('Keyboard APP', function() {
  var apps = {};
  apps[FAKE_FORM_ORIGIN] = __dirname + '/fakeform';
  var client = marionette.client({
    apps: apps
  });
  var subject;
  var keyboard;
  var form;

  setup(function() {
    keyboard = new Keyboard(client);
    form = new FakeForm(client, 'app://' + FAKE_FORM_ORIGIN);
    form.launch();
    client.helper.waitForElement('body.loaded');
    client.setSearchTimeout(10000);
  });

  suite('input type is text', function() {

    setup(function() {
      form.textInputElement.click();
    });

    test('type string on input', function() {
      var text = 'http://mozilla.com.tw';
      var layout = 'index.html#en';
      client.helper.waitForElement('input#text_input');

      // switch to keyboard app
      client.switchToFrame();
      keyboard.switchToKeyboard(layout);
      client.waitFor(function waiting() {
        var flag = false;
        client.findElement('button.keyboard-key[data-keycode="13"]',
          function(error, element) {
            if (!error) {
              flag = element.displayed();
            }
          });

        return flag;
      });
      //client.helper.waitForElement('button.keyboard-key[data-keycode="13"]');
      keyboard.tapString(text);
      form.backToApp();
      var tabsBadge = client.findElement('input#text_input');
      assert.equal(tabsBadge.getAttribute('value'), text);
    });

  });

});
