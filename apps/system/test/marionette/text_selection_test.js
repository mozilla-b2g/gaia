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

  suite('check button functionality', function() {
    test('copy and paste', function() {
      fakeTextselectionApp.copyTo('centerInput', 'topLeftInput');
      assert.equal(fakeTextselectionApp.topLeftInput.getAttribute('value'),
        'testcenterinput');
    });

    test('cut and paste', function() {
      fakeTextselectionApp.cutTo('centerInput', 'topRightInput');
      assert.equal(fakeTextselectionApp.centerInput.getAttribute('value'),
        '');
      assert.equal(fakeTextselectionApp.topRightInput.getAttribute('value'),
        'testcenterinput');
    });

    test('select all and cut', function() {
      fakeTextselectionApp.selectAllAndCut('bottomLeftInput');
      assert.equal(fakeTextselectionApp.bottomLeftInput.getAttribute('value'),
        '');
    });
  });

  suite('check dialog location', function() {
    test('click center input', function() {
      fakeTextselectionApp.longPress('centerInput');

      assert.ok(
        fakeTextselectionApp.textSelection.location.y <
        fakeTextselectionApp.centerInput.location.y,
        'dialog should be placed higher than the input field'
      );
    });

    test('click top-left input', function() {
      fakeTextselectionApp.longPress('topLeftInput');
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
      fakeTextselectionApp.longPress('topRightInput');
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
      fakeTextselectionApp.longPress('bottomLeftInput');
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
      fakeTextselectionApp.longPress('bottomRightInput');
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

  suite('non-editable', function() {
    test('lonePress non-editable field', function() {
      fakeTextselectionApp.longPress('normalDiv');
      assert.ok(fakeTextselectionApp.bubbleVisiblity);
    });

    test('copy non-editable field', function() {
      fakeTextselectionApp.copyTo('normalDiv', 'centerInput');
      assert.equal(fakeTextselectionApp.centerInput.getAttribute('value'),
        'NONEDITIABLEFIELD');
    });

    test('lonePress non-editable and user-select is none', function() {
      fakeTextselectionApp.longPress('nonSelectedDiv');
      assert.ok(!fakeTextselectionApp.bubbleVisiblity);
    });

    // Waiting for bug 1114853.
    test.skip('lonePress non-editable field and then click non-editable with ' +
         'user-select none field', function() {
      fakeTextselectionApp.longPress('normalDiv');
      assert.ok(fakeTextselectionApp.bubbleVisiblity);
      var element = fakeTextselectionApp.nonSelectedDiv;
      element.tap();
      client.waitFor(function() {
        return !fakeTextselectionApp.bubbleVisiblity;
      });
      assert.ok(!fakeTextselectionApp.bubbleVisiblity);
    });
  });
});
