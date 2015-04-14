'use strict';

marionette('Text selection >', function() {
  var Actions = require('marionette-client').Actions;
  var FakeTextSelectionApp = require('./lib/faketextselectionapp');
  var assert = require('assert');
  var apps = {};
  var action;

  apps[FakeTextSelectionApp.ORIGIN] =
    __dirname + '/../apps/faketextselectionapp';

  suite('without lockscreen', function() {
    var fakeTextselectionApp;
    var system;
    var client = marionette.client({
      apps: apps,
      prefs: {
        'dom.w3c_touch_events.enabled': 1,
        'docshell.device_size_is_page_size': true,
        'dom.mozInputMethod.enabled': false
      }
    });

    setup(function() {
      system = client.loader.getAppClass('system');
      system.waitForStartup();
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

        fakeTextselectionApp.textSelection.startCountVisibilityChanged();
        client.helper.wait(500);
        action.tap(
          fakeTextselectionApp.FunctionalitySourceInput,
          caretPositionOfSourceInput.caretA.x,
          caretPositionOfSourceInput.caretA.y).wait(1)
        .press(fakeTextselectionApp.FunctionalitySourceInput,
          caretPositionOfSourceInput.caretA.x,
          caretPositionOfSourceInput.caretA.y + 15)
        .wait(0.5).release().perform(function() {
          assert.ok(
            fakeTextselectionApp.textSelection.stopCountVisibilityChanged(), 1,
            'visibility should be only triggered once');
          assert.ok(fakeTextselectionApp.bubbleVisiblity,
            'bubble should show after tapping on the caret');
          done();
        });
      });

      test('copy and paste', function() {
        fakeTextselectionApp.longPress('FunctionalitySourceInput');
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
          textSelectionLocation.x, 5,
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
          fakeTextselectionApp.width - 5,
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
          textSelectionLocation.x, 5,
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
          fakeTextselectionApp.width - 5,
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

      test.skip('bug1110963 : Cut/Copy/Paste menu should dismiss ' +
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

      // Enable the test til bug 1120750 is merged.
      test.skip('bug1120750 : Send out carets position for the short cut mode ',
        function() {
          fakeTextselectionApp.longPress('BugCenterInput');
          var originalLocation = fakeTextselectionApp.textSelection.location;
          fakeTextselectionApp.cut('BugCenterInput');

          fakeTextselectionApp.tap('BugBottomInput');
          var newLocation = fakeTextselectionApp.textSelection.location;
          assert.ok(fakeTextselectionApp.bubbleVisiblity);
          assert.ok(newLocation.y > originalLocation.y);
        });

      // Enable the test til bug 1120750 is merged.
      test.skip('bug1119126 : Shortcut bubble should hide when system is' +
                ' resized',
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
          fakeTextselectionApp.BugBottomInput.tap();

          systemInputMgmt.waitForKeyboardFrameDisplayed();

          fakeTextselectionApp.switchToTestApp();
          assert.ok(!fakeTextselectionApp.bubbleVisiblity);
        });
    });

    suite('selection carets bug', function() {
      setup(function() {
        fakeTextselectionApp.setTestFrame('bug1120358');
      });
      test('bug1120358 : Positions of selection carets should be updated ' +
           'correctly while scrolling (so far on device only)',
        function() {
          fakeTextselectionApp.longPressByPosition('BugContent', 30, 150);
          var source =
            fakeTextselectionApp.BugContent.selectionHelper.selectedContent;
          client.executeScript('document.getElementById("bug-content").' +
                               'scrollTop += 100');
          client.helper.wait(500);
          var caretPositions =
            fakeTextselectionApp.BugContent.selectionHelper.
            selectionLocationHelper();
          fakeTextselectionApp.BugContent.selectionHelper.
          moveCaretByPosition({
            caretB: {
              offset: {
                x: caretPositions.caretA.x - caretPositions.caretB.x, y: 0
              }
            }
          });
          var target =
            fakeTextselectionApp.BugContent.selectionHelper.selectedContent;
          assert.ok(source.charAt(0)===target,
          'carets should be dragable to narrow down selection range to the ' +
          'first character if positions of carets are updated correctly');
        });
    });

    suite('bug1020801', function() {
      setup(function() {
        fakeTextselectionApp.setTestFrame('bug1120358');
      });
      test('bug1020801 : We should hide/show the utility bubble when ' +
           'scrolling starts/ends',
        function() {
          fakeTextselectionApp.longPressByPosition('BugContent', 100, 100);
          assert.ok(fakeTextselectionApp.bubbleVisiblity,
                    'bubble should be shown before scroll starts');
          fakeTextselectionApp.textSelection.startCountVisibilityChanged();
          action.press(fakeTextselectionApp.BugContent, 30, 100)
                .moveByOffset(0, -50).perform();
          client.helper.wait(500);
          assert.equal(fakeTextselectionApp.textSelection
                                           .stopCountVisibilityChanged(), 2,
                       'visibility should be triggered exactly twice');
          assert.ok(fakeTextselectionApp.bubbleVisiblity,
                    'bubble should be shown since scroll is ended');
        });
    });

    suite('bug1120316', function() {
      setup(function() {
        fakeTextselectionApp.setTestFrame('bug1120316');
      });

      test('bug1120316 : After select all, bubble should appear',
        function() {
          fakeTextselectionApp.selectAll('BugInput');
          assert.ok(fakeTextselectionApp.bubbleVisiblity,
            'bubble should show since we press selectall');

          fakeTextselectionApp.selectAll('BugTextarea');
          assert.ok(fakeTextselectionApp.bubbleVisiblity,
            'bubble should show since we press selectall');
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
});
