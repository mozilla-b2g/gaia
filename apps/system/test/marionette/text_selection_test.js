'use strict';

marionette('Text selection >', function() {
  var FakeTextSelectionApp = require('./lib/faketextselectionapp');
  var assert = require('assert');

  var apps = {};
  apps[FakeTextSelectionApp.ORIGIN] =
    __dirname + '/faketextselectionapp';

  var client = marionette.client({
    apps: apps,
    prefs: {
      'dom.w3c_touch_events.enabled': 1,
      'docshell.device_size_is_page_size': true,
      'dom.mozInputMethod.enabled': false
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  });

  var fakeTextselectionApp;

  setup(function() {
    fakeTextselectionApp = new FakeTextSelectionApp(client);
  });

  suite('check dialog location', function() {
    test('click center input', function() {
      fakeTextselectionApp.press('centerInput');

      assert.ok(
        fakeTextselectionApp.textSelection.location.y <
        fakeTextselectionApp.centerInput.location.y,
        'dialog should be placed higher than the input field'
      );
    });

    test('click top-left input', function() {
      fakeTextselectionApp.press('topLeftInput');
      var textSelectionLocation = fakeTextselectionApp.textSelection.location;

      assert.ok(
        fakeTextselectionApp.topLeftInput.location.y < textSelectionLocation.y,
        'dialog should be placed lower than the input field'
      );
      assert.equal(
        textSelectionLocation.x, 0,
        'dialog should be placed near left boundary'
      );
    });

    test('click top-right input', function() {
      fakeTextselectionApp.press('topRightInput');
      var textSelectionLocation = fakeTextselectionApp.textSelection.location;

      assert.ok(
        fakeTextselectionApp.topRightInput.location.y < textSelectionLocation.y,
        'dialog should be placed lower than the input field'
      );
      assert.equal(
        textSelectionLocation.x,
        fakeTextselectionApp.width - fakeTextselectionApp.textSelection.width,
        'dialog should be placed near right boundary'
      );
    });

    test('click bottom-left input', function() {
      fakeTextselectionApp.press('bottomLeftInput');
      var textSelectionLocation = fakeTextselectionApp.textSelection.location;

      assert.ok(
        textSelectionLocation.y <
        fakeTextselectionApp.bottomLeftInput.location.y,
        'dialog should be placed higher than the input field'
      );
      assert.equal(
        textSelectionLocation.x, 0,
        'dialog should be placed near left boundary'
      );
    });

    test('click bottom-right input', function() {
      fakeTextselectionApp.press('bottomRightInput');
      var textSelectionLocation = fakeTextselectionApp.textSelection.location;

      assert.ok(
        textSelectionLocation.y <
        fakeTextselectionApp.bottomRightInput.location.y,
        'dialog should be placed higher than the input field'
      );
      assert.equal(
        textSelectionLocation.x,
        fakeTextselectionApp.width - fakeTextselectionApp.textSelection.width,
        'dialog should be placed near right boundary'
      );
    });
  });
});
