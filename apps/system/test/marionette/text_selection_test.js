'use strict';

marionette('Text selection >', function() {
  var Actions = require('marionette-client').Actions;
  var FakeTextSelectionApp = require('./lib/faketextselectionapp');
  var assert = require('assert');
  var apps = {};
  var action;

  apps[FakeTextSelectionApp.ORIGIN] =
    __dirname + '/faketextselectionapp';

  suite('without lockscreen', function() {
    var fakeTextselectionApp;
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

    setup(function() {
      fakeTextselectionApp = new FakeTextSelectionApp(client);
      action = new Actions(client);
    });

    suite('check functionality', function() {
      setup(function() {
        fakeTextselectionApp.setTestFrame('functionality');
      });

      test('short cut test', function(done) {
        fakeTextselectionApp.longPress('FunctionalitySourceInput');
        // store caret position
        var caretPositionOfSourceInput =
          fakeTextselectionApp.FunctionalitySourceInput
          .selectionHelper.selectionLocationHelper();
        fakeTextselectionApp.copy('FunctionalitySourceInput');

        fakeTextselectionApp.FunctionalitySourceInput.tap();
        assert.ok(fakeTextselectionApp.bubbleVisiblity,
          'bubble should show since we have copied sth before');
        fakeTextselectionApp.paste('FunctionalitySourceInput');

        client.helper.wait(500);
        action.tap(
          fakeTextselectionApp.FunctionalitySourceInput,
          caretPositionOfSourceInput.caretA.x,
          caretPositionOfSourceInput.caretA.y).wait(1)
        .press(fakeTextselectionApp.FunctionalitySourceInput,
          caretPositionOfSourceInput.caretA.x,
          caretPositionOfSourceInput.caretA.y + 15)
        .wait(0.5).release().perform(function(){
          assert.ok(fakeTextselectionApp.bubbleVisiblity,
            'bubble should show after tapping on the caret');
          done();
        });
      });

      test('copy and paste', function() {
        fakeTextselectionApp.copyTo('FunctionalitySourceInput',
          'FunctionalityTargetInput');
        assert.equal(
          fakeTextselectionApp.FunctionalityTargetInput.getAttribute('value'),
          'testvalue');
      });

      test('cut and paste', function() {
        fakeTextselectionApp.cutTo('FunctionalitySourceInput',
          'FunctionalityTargetInput');
        assert.equal(
          fakeTextselectionApp.FunctionalitySourceInput.getAttribute('value'),
          '');
        assert.equal(
          fakeTextselectionApp.FunctionalityTargetInput.getAttribute('value'),
          'testvalue');
      });

      test('select all and cut', function() {
        fakeTextselectionApp.selectAllAndCut('FunctionalitySourceInput');
        assert.equal(fakeTextselectionApp.FunctionalitySourceInput
          .getAttribute('value'), '');
      });

      test.skip('cut part of content and paste', function() {
        fakeTextselectionApp.longPress('FunctionalitySourceInput');
        fakeTextselectionApp.FunctionalitySourceInput
          .selectionHelper.moveCaretByWords({
            'caretB': {offset: -2}
          });
        fakeTextselectionApp.textSelection.pressCut();
        fakeTextselectionApp.paste('FunctionalityTargetInput');

        assert.equal(fakeTextselectionApp.FunctionalityTargetInput
          .getAttribute('value'), 'testval');
        assert.equal(fakeTextselectionApp.FunctionalitySourceInput
          .getAttribute('value'), 'ue');
      });
    });

    suite('check dialog location', function() {
      setup(function() {
        fakeTextselectionApp.setTestFrame('dialogposition');
      });
      test('click center input', function() {
        fakeTextselectionApp.longPress('DialogPositionCenterInput');

        assert.ok(
          fakeTextselectionApp.textSelection.location.y <
          fakeTextselectionApp.DialogPositionCenterInput.location.y,
          'dialog should be placed higher than the input field'
        );
      });

      test('click top-left input', function() {
        fakeTextselectionApp.longPress('DialogPositionTopLeftInput');
        var textSelectionLocation = fakeTextselectionApp.textSelection.location;

        assert.ok(
          fakeTextselectionApp.DialogPositionTopLeftInput.location.y <
          textSelectionLocation.y,
          'dialog should be placed lower than the input field'
        );
        assert.equal(
          textSelectionLocation.x, 0,
          'dialog should be placed near left boundary'
        );
      });

      test('click top-right input', function() {
        fakeTextselectionApp.longPress('DialogPositionTopRightInput');
        var textSelectionLocation = fakeTextselectionApp.textSelection.location;

        assert.ok(
          fakeTextselectionApp.DialogPositionTopRightInput.location.y <
          textSelectionLocation.y,
          'dialog should be placed lower than the input field'
        );
        assert.equal(
          Math.ceil(textSelectionLocation.x +
            fakeTextselectionApp.textSelection.width),
          fakeTextselectionApp.width,
          'dialog should be placed near right boundary'
        );
      });

      test('click bottom-left input', function() {
        fakeTextselectionApp.longPress('DialogPositionBottomLeftInput');
        var textSelectionLocation = fakeTextselectionApp.textSelection.location;

        assert.ok(
          textSelectionLocation.y <
          fakeTextselectionApp.DialogPositionBottomLeftInput.location.y,
          'dialog should be placed higher than the input field'
        );
        assert.equal(
          textSelectionLocation.x, 0,
          'dialog should be placed near left boundary'
        );
      });

      test('click bottom-right input', function() {
        fakeTextselectionApp.longPress('DialogPositionBottomRightInput');
        var textSelectionLocation = fakeTextselectionApp.textSelection.location;

        assert.ok(
          textSelectionLocation.y <
          fakeTextselectionApp.DialogPositionBottomRightInput.location.y,
          'dialog should be placed higher than the input field'
        );
        assert.equal(
          Math.ceil(textSelectionLocation.x +
            fakeTextselectionApp.textSelection.width),
          fakeTextselectionApp.width,
          'dialog should be placed near right boundary'
        );
      });
    });

    suite('non-editable', function() {
      setup(function() {
        fakeTextselectionApp.setTestFrame('noneditable');
      });

      test('lonePress non-editable field', function() {
        fakeTextselectionApp.longPress('NonEditableNormalDiv');
        assert.ok(fakeTextselectionApp.bubbleVisiblity);
      });

      test('copy non-editable field', function() {
        fakeTextselectionApp.copyTo('NonEditableNormalDiv',
          'NonEditableCenterInput');
        assert.equal(fakeTextselectionApp.NonEditableCenterInput
          .getAttribute('value'), 'NONEDITIABLEFIELD');
      });
      test('lonePress non-editable and user-select is none', function() {
        fakeTextselectionApp.longPress('NonEditableNonSelectedDiv');
        assert.ok(!fakeTextselectionApp.bubbleVisiblity);
      });

      test('lonePress non-editable field and then click non-editable with ' +
           'user-select none field', function() {
        fakeTextselectionApp.longPress('NonEditableNormalDiv');
        assert.ok(fakeTextselectionApp.bubbleVisiblity);
        var element = fakeTextselectionApp.NonEditableNonSelectedDiv;
        element.tap();
        client.waitFor(function() {
          return !fakeTextselectionApp.bubbleVisiblity;
        });
        assert.ok(!fakeTextselectionApp.bubbleVisiblity);
      });
    });

    suite('bugs', function() {
      var systemInputMgmt;
      setup(function() {
        fakeTextselectionApp.setTestFrame('bug');
      });

      test('bug1110963 : Cut/Copy/Paste menu should dismiss ' +
           'when tapping the keyboard',
        function() {
          fakeTextselectionApp.longPress('BugCenterInput');
          assert.ok(fakeTextselectionApp.bubbleVisiblity);

          // Click keyboard
          client.switchToFrame();
          var keyboard =
            client.findElement('#keyboards .inputWindow.top-most iframe');
          client.switchToFrame(keyboard);
          client.helper.waitForElement('.keyboard-type-container[data-active]' +
            ' button.keyboard-key').tap();
          client.waitFor(function() {
            return !fakeTextselectionApp.bubbleVisiblity;
          });
        });

      test('bug1119126 : Shortcut bubble should hide when system is resized',
        function() {
          systemInputMgmt = client.loader.getAppClass('system',
                                                      'input_management');
          fakeTextselectionApp.copy('BugCenterInput');

          systemInputMgmt.waitForKeyboardFrameDisplayed();

          fakeTextselectionApp.switchToTestApp();
          fakeTextselectionApp.BugNormalDiv.tap();
          client.waitFor(function() {
            return systemInputMgmt.keyboardFrameHidden();
          });
          fakeTextselectionApp.switchToTestApp();
          fakeTextselectionApp.BugButtomInput.tap();

          systemInputMgmt.waitForKeyboardFrameDisplayed();

          fakeTextselectionApp.switchToTestApp();
          assert.ok(!fakeTextselectionApp.bubbleVisiblity);
        });
    });
  });

  suite('with lockscreen enabled', function() {
    var fakeTextselectionAppWithLockscreen;
    var clientWithLockscreen = marionette.client({
      apps: apps,
      prefs: {
        'dom.w3c_touch_events.enabled': 1,
        'docshell.device_size_is_page_size': true,
        'dom.mozInputMethod.enabled': false
      },
      settings: {
        'ftu.manifestURL': null,
        'lockscreen.enabled': true
      }
    });

    setup(function() {
      fakeTextselectionAppWithLockscreen =
        new FakeTextSelectionApp(clientWithLockscreen);
      fakeTextselectionAppWithLockscreen.setTestFrame('bug');
    });

    test('bug 1115508: the utility bubble should hide when lockscreen',
      function() {
        clientWithLockscreen.switchToFrame();
        // quick unlock screen
        clientWithLockscreen.executeScript(function() {
          window.wrappedJSObject.Service.request('unlock', {
            forcibly: true
          });
        });
        clientWithLockscreen.apps.switchToApp(FakeTextSelectionApp.ORIGIN);
        fakeTextselectionAppWithLockscreen.longPress('BugCenterInput');

        // turn off screen
        clientWithLockscreen.switchToFrame();
        clientWithLockscreen.executeScript(function() {
          window.wrappedJSObject.ScreenManager.turnScreenOff(true, 'powerkey');
        });
        clientWithLockscreen.helper.wait(500);
        // turn on screen
        clientWithLockscreen.executeScript(function() {
          window.wrappedJSObject.ScreenManager.turnScreenOn();
        });
        clientWithLockscreen.waitFor(function() {
          return !fakeTextselectionAppWithLockscreen.bubbleVisiblity;
        });
      });
  });
});
