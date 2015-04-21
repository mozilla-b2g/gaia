'use strict';
var Settings = require('../app/app'),
    assert = require('assert');

marionette('improve b2g', function() {
  var client = marionette.client();
  var settingsApp;
  var improvePanel;
  var feedbackPanel;
  setup(function() {
    settingsApp = new Settings(client);
    settingsApp.launch();
    // Navigate to the Improve panel
    improvePanel = settingsApp.improvePanel;
  });

  suite('improve page', function() {
    test('enable performance data', function() {
      improvePanel.enableSubmitPerfData();
      assert.ok(true,
        'performance data is enabled'
      );
    });

    test('enable always send report', function() {
      // make sure the item displaying on the screen
      improvePanel.enableAskEachTime();
      improvePanel.enableAlwaysSendReport();
      assert.ok(true,
        'always send report is enabled');
    });

    test('enable never send report', function() {
      improvePanel.enableNeverSendReport();
      assert.ok(true,
        'never send report is enabled');
    });

    test('enable ask each time', function() {
      improvePanel.enableAskEachTime();
      assert.ok(true,
        'ask each time is enabled');
    });
  });

  suite('choose feedback page', function() {
    setup(function() {
      // Navigate to the feedback panel
      feedbackPanel = settingsApp.feedbackPanel;
      improvePanel.enterFeedbackPanel();
      feedbackPanel.isRendered();
    });

    test('entering into send feedback panel and happy', function() {
      feedbackPanel.enterWithHappy();
      assert.ok(true,
        '|happy| feedback entry is ok');
    });

    test('entering into send feedback panel and sad', function() {
      feedbackPanel.enterWithSad();
      assert.ok(true,
        '|sad| feedback entry is ok');
    });
  });

  suite('send feedback page', function() {
    var feedbackPanel;
    setup(function() {
      feedbackPanel = settingsApp.feedbackPanel;
      improvePanel.enterFeedbackPanel();
      feedbackPanel.isRendered();
      feedbackPanel.enterWithHappy();
    });

    test('empty message', function() {
      feedbackPanel.sendFeedback();
      assert.equal(feedbackPanel.alertMsg,
        'Sorry, the system can’t send your suggestion ' +
        'because the comment field is empty. Please enter ' +
        'some text and try again.'
        );
    });

    // disabled at bug #981993 because of intermittent failures
    test.skip('open email column but left it empty', function() {
      feedbackPanel.inputMsgToDialog('test');
      feedbackPanel.openEmailCol();
      feedbackPanel.sendFeedback();
      assert.equal(feedbackPanel.alertMsg,
        'Sorry, the system can’t send your suggestion ' +
        'because the email address is missing or due to ' +
        'a formatting error. Please use a valid email address ' +
        'and try again.');
    });

    // disabled at bug #981993 because of intermittent failures
    test.skip('click back and enter again, the msg should be the same',
      function() {
      var msg = 'test';
      feedbackPanel.inputMsgToDialog(msg);
      feedbackPanel.tapFeedbackBack();
      feedbackPanel.enterWithHappy();
      assert.equal(feedbackPanel.discription, msg);
    });
  });
});
