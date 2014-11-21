/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var assert = require('chai').assert;

var Messages = require('./lib/messages.js');
var MessagesActivityCaller = require('./lib/messages_activity_caller.js');

marionette('Messages Composer', function() {
  var apps = {};

  apps[MessagesActivityCaller.ORIGIN] = __dirname + '/apps/activitycaller';

  var client = marionette.client({
    prefs: {
      'focusmanager.testmode': true
    },
    settings: {
      'lockscreen.enabled': false,
      'ftu.manifestURL': null
    },

    apps: apps
  });

  var messagesApp, activityCallerApp;

  function assertIsDisplayed(element) {
    assert.isTrue(element.displayed(), 'Element should be displayed');
  }

  function assertIsNotDisplayed(element) {
    assert.isFalse(element.displayed(), 'Element should not be displayed');
  }

  setup(function() {
    messagesApp = Messages.create(client);
    activityCallerApp = MessagesActivityCaller.create(client);

    client.contentScript.inject(
      __dirname + '/mocks/mock_navigator_moz_mobile_message.js'
    );
  });

  suite('Messages Composer Test Suite', function() {
    var message = 'long long long long long message long long message long ' +
        'message long long message message long message long message long ' +
        'for message long message long message long message long message long';

    setup(function() {
      messagesApp.launch();
      messagesApp.ThreadList.navigateToComposer();
    });

    test('Message char counter and MMS label', function() {
      var composer = messagesApp.Composer;

      // Case #1: When we open composer initially we should not see neither char
      // counter nor MMS label.
      assertIsNotDisplayed(composer.charCounter);
      assertIsNotDisplayed(composer.mmsLabel);

      // Case #2: Focus on message editor and enter some text. If we have more
      // than 20 chars left then we don't show available char counter yet
      composer.messageInput.tap();
      composer.messageInput.sendKeys(message.slice(0, 70));

      assertIsNotDisplayed(composer.charCounter);
      assertIsNotDisplayed(composer.mmsLabel);

      // Case #3: Enter some more text to see available char counter
      composer.messageInput.sendKeys(message.slice(0, 70));

      client.helper.waitForElement(composer.charCounter);
      assert.equal(composer.charCounter.text(), '20/1');
      assertIsNotDisplayed(composer.mmsLabel);

      // Case #4: Remove one character and char counter should disappear
      composer.messageInput.sendKeys(Messages.Chars.BACKSPACE);
      client.helper.waitForElementToDisappear(composer.charCounter);
      assertIsNotDisplayed(composer.mmsLabel);

      // Case #5: Add empty subject, if subject is empty then we still have SMS
      // and char counter can be displayed
      messagesApp.showSubject();

      assert.equal(composer.subjectInput.text(), '');
      assertIsNotDisplayed(composer.mmsLabel);
      assertIsNotDisplayed(composer.charCounter);

      // Case #6: Enter some text to message input to show available char
      // counter while subject is empty
      composer.messageInput.sendKeys('ab');

      client.helper.waitForElement(composer.charCounter);
      assert.equal(composer.charCounter.text(), '19/1');
      assertIsNotDisplayed(composer.mmsLabel);

      // Case #7: Enter some text to subject input. Message should be converted
      // to MMS and appropriate label should appear near subject field,
      // available char counter should disappear
      composer.subjectInput.sendKeys('subject');

      client.helper.waitForElement(composer.mmsLabel);
      client.helper.waitForElementToDisappear(composer.charCounter);

      // Case #8: Enter some text to message input while subject is not empty
      // and visible. In this case we still update available char counter, but
      // doesn't display it to the user as currently message is MMS
      composer.messageInput.sendKeys('cd');

      assertIsDisplayed(composer.mmsLabel);
      assertIsNotDisplayed(composer.charCounter);

      // Case #9: Remove subject when there is enough text to show available
      // char counter (with actual value), message converted to SMS
      messagesApp.hideSubject();

      client.helper.waitForElementToDisappear(composer.mmsLabel);
      client.helper.waitForElement(composer.charCounter);
      assert.equal(composer.charCounter.text(), '17/1');

      // Case #10: Add attachment, message is converted to MMS and appropriate
      // label appears in the subject line.
      client.waitFor(function() {
        return composer.attachButton.enabled();
      }.bind(this));
      composer.attachButton.tap();
      messagesApp.selectSystemMenuOption('Messages Activity Caller');

      activityCallerApp.switchTo();
      activityCallerApp.pickImage();

      messagesApp.switchTo();

      client.helper.waitForElement(composer.mmsLabel);
      client.helper.waitForElementToDisappear(composer.charCounter);
      // Since we have an attachment we don't track available characters and old
      // available char value should be removed to not confusing user
      assert.equal(composer.charCounter.text(), '');

      // Case #11: show subject when we have an attachment, message is still
      // MMS.
      messagesApp.showSubject();

      assertIsDisplayed(composer.mmsLabel);
      assertIsNotDisplayed(composer.charCounter);

      // Case #12: remove subject when we have an attachment, message is still
      // MMS
      messagesApp.hideSubject();

      assertIsDisplayed(composer.mmsLabel);
      assertIsNotDisplayed(composer.charCounter);

      // Case #13: edit some text and remove attachment, in this case message is
      // converted to SMS and we should show actual available char counter
      composer.messageInput.sendKeys('ef');

      composer.attachment.scriptWith(function(el) {
        el.scrollIntoView(false);
      });

      // Remove this workaround once Marionette bug is resolved:
      // "Bug 1046706 - "tap" does not find the element after scrolling in APZC"
      client.helper.wait(600);

      composer.attachment.tap();
      messagesApp.selectAttachmentMenuOption('Remove image');

      client.helper.waitForElementToDisappear(composer.mmsLabel);
      client.helper.waitForElement(composer.charCounter);
      assert.equal(composer.charCounter.text(), '15/1');
    });
  });
});
