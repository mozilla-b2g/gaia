'use strict';

// remove this when https://github.com/visionmedia/mocha/issues/819 is merged in
// mocha and when we have that new mocha in test agent
mocha.setup({ globals: ['alert'] });

requireApp('sms/test/unit/mock_utils.js');
requireApp('sms/test/unit/mock_l10n.js');
requireApp('sms/test/unit/mock_navigatormoz_sms.js');
requireApp('sms/js/thread_ui.js');

var mocksHelperForThreadUI = new MocksHelper([
  'Utils'
]);

mocksHelperForThreadUI.init();

suite('thread_ui.js >', function() {
  var sendButton;
  var input;
  var composeForm;
  var recipient;

  var realMozL10n;
  var realMozSms;

  var mocksHelper = mocksHelperForThreadUI;

  suiteSetup(function() {
    mocksHelper.suiteSetup();

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    mocksHelper.suiteTeardown();
  });

  setup(function() {
    mocksHelper.setup();
    loadBodyHTML('/index.html');

    sendButton = document.getElementById('send-message');
    input = document.getElementById('message-to-send');
    composeForm = document.getElementById('new-sms-form');
    recipient = document.getElementById('receiver-input');

    ThreadUI.init();
    ThreadUI.sendButton = sendButton;
    ThreadUI.input = input;
    ThreadUI.sendForm = composeForm;
    ThreadUI.contactInput = recipient;

    realMozSms = ThreadUI._mozSms;
    ThreadUI._mozSms = MockNavigatormozSms;
  });

  teardown(function() {
    document.body.innerHTML = '';

    MockNavigatormozSms.mTeardown();
    mocksHelper.teardown();
    ThreadUI._mozSms = realMozSms;
  });

  suite('enableSend() >', function() {
    setup(function() {
      ThreadUI.updateCounter();
    });

    test('button should be disabled at the beginning', function() {
      ThreadUI.enableSend();
      assert.isTrue(sendButton.disabled);
    });

    test('button should be enabled when there is some text', function() {
      input.value = 'Hola';
      ThreadUI.enableSend();
      assert.isFalse(sendButton.disabled);
    });

    test('button should be disabled if there is some text ' +
      'but too many segments', function() {

      MockNavigatormozSms.mNextSegmentInfo = {
        segments: 11,
        charsAvailableInLastSegment: 10
      };
      input.value = 'Hola';

      ThreadUI.enableSend();

      assert.isTrue(sendButton.disabled);
    });

    suite('#new mode >', function() {
      setup(function() {
        window.location.hash = '#new';
      });

      teardown(function() {
        window.location.hash = '';
      });

      test('button should be disabled when there is neither contact or input',
        function() {

        ThreadUI.enableSend();
        assert.isTrue(sendButton.disabled);
      });

      test('button should be disabled when there is no contact', function() {
        input.value = 'Hola';
        ThreadUI.enableSend();
        assert.isTrue(sendButton.disabled);
      });

      test('button should be enabled when there is both contact and input',
        function() {

        input.value = 'Hola';
        recipient.value = '123123123';
        ThreadUI.enableSend();
        assert.isFalse(sendButton.disabled);
      });

      test('button should be enabled when there is both contact and input, ' +
          'but too many segments',
        function() {

        MockNavigatormozSms.mNextSegmentInfo = {
          segments: 11,
          charsAvailableInLastSegment: 10
        };

        input.value = 'Hola';
        recipient.value = '123123123';
        ThreadUI.enableSend();

        assert.isTrue(sendButton.disabled);
      });
    });
  });

  suite('cleanFields >', function() {
    setup(function() {
      window.location.hash = '#new';
      input.value = 'Hola';
      recipient.value = '123123123';
      ThreadUI.enableSend();
      ThreadUI.cleanFields();
    });

    teardown(function() {
      window.location.hash = '';
    });

    test('should disable the button', function() {
      assert.isTrue(sendButton.disabled);
    });
  });

  suite('updateCounter() >', function() {
    var banner, shouldEnableSend;

    setup(function() {
      banner = document.getElementById('messages-max-length-notice');
    });

    suite('no characters entered >', function() {
      setup(function() {
        MockNavigatormozSms.mNextSegmentInfo = {
          segments: 0,
          charsAvailableInLastSegment: 0
        };

        // display the banner to check that it is correctly hidden
        banner.classList.remove('hide');

        // add a maxlength to check that it is correctly removed
        input.setAttribute('maxlength', 25);

        shouldEnableSend = ThreadUI.updateCounter();
      });

      test('no counter is displayed', function() {
        assert.equal(sendButton.dataset.counter, '');
      });

      test('the user can enter more characters', function() {
        assert.equal(input.maxLength, -1);
      });

      test('no banner is displayed', function() {
        assert.ok(banner.classList.contains('hide'));
      });
    });

    suite('in first segment >', function() {
      setup(function() {
        MockNavigatormozSms.mNextSegmentInfo = {
          segments: 1,
          charsAvailableInLastSegment: 20
        };

        // display the banner to check that it is correctly hidden
        banner.classList.remove('hide');

        // add a maxlength to check that it is correctly removed
        input.setAttribute('maxlength', 25);

        shouldEnableSend = ThreadUI.updateCounter();
      });

      test('no counter is displayed', function() {
        assert.equal(sendButton.dataset.counter, '');
      });

      test('the user can enter more characters', function() {
        assert.equal(input.maxLength, -1);
      });

      test('no banner is displayed', function() {
        assert.ok(banner.classList.contains('hide'));
      });

      test('the send button should be enabled', function() {
        assert.isTrue(shouldEnableSend);
      });
    });

    suite('in first segment, less than 10 chars left >', function() {
      var segment = 1,
          availableChars = 10;

      setup(function() {
        MockNavigatormozSms.mNextSegmentInfo = {
          segments: segment,
          charsAvailableInLastSegment: availableChars
        };

        // display the banner to check that it is correctly hidden
        banner.classList.remove('hide');

        // add a maxlength to check that it is correctly removed
        input.setAttribute('maxlength', 25);

        shouldEnableSend = ThreadUI.updateCounter();
      });

      test('a counter is displayed', function() {
        var expected = availableChars + '/' + segment;
        assert.equal(sendButton.dataset.counter, expected);
      });

      test('the user can enter more characters', function() {
        assert.equal(input.maxLength, -1);
      });

      test('no banner is displayed', function() {
        assert.ok(banner.classList.contains('hide'));
      });

      test('the send button should be enabled', function() {
        assert.isTrue(shouldEnableSend);
      });
    });

    suite('in second segment >', function() {
      var segment = 2,
          availableChars = 20;

      setup(function() {
        MockNavigatormozSms.mNextSegmentInfo = {
          segments: segment,
          charsAvailableInLastSegment: availableChars
        };

        // display the banner to check that it is correctly hidden
        banner.classList.remove('hide');

        // add a maxlength to check that it is correctly removed
        input.setAttribute('maxlength', 25);

        shouldEnableSend = ThreadUI.updateCounter();
      });

      test('a counter is displayed', function() {
        var expected = availableChars + '/' + segment;
        assert.equal(sendButton.dataset.counter, expected);
      });

      test('the user can enter more characters', function() {
        assert.equal(input.maxLength, -1);
      });

      test('no banner is displayed', function() {
        assert.ok(banner.classList.contains('hide'));
      });

      test('the send button should be enabled', function() {
        assert.isTrue(shouldEnableSend);
      });
    });

    suite('in last segment >', function() {
      var segment = 10,
          availableChars = 20;

      setup(function() {
        MockNavigatormozSms.mNextSegmentInfo = {
          segments: segment,
          charsAvailableInLastSegment: availableChars
        };

        // display the banner to check that it is correctly hidden
        banner.classList.remove('hide');

        // add a maxlength to check that it is correctly removed
        input.setAttribute('maxlength', 25);

        shouldEnableSend = ThreadUI.updateCounter();
      });

      test('a counter is displayed', function() {
        var expected = availableChars + '/' + segment;
        assert.equal(sendButton.dataset.counter, expected);
      });

      test('the user can enter more characters', function() {
        assert.equal(input.maxLength, -1);
      });

      test('no banner is displayed', function() {
        assert.ok(banner.classList.contains('hide'));
      });

      test('the send button should be enabled', function() {
        assert.isTrue(shouldEnableSend);
      });
    });

    suite('in last segment, no characters left >', function() {
      var segment = 10,
          availableChars = 0;

      setup(function() {
        MockNavigatormozSms.mNextSegmentInfo = {
          segments: segment,
          charsAvailableInLastSegment: availableChars
        };

        // display the banner again, to check it's correctly displayed
        banner.classList.add('hide');
        shouldEnableSend = ThreadUI.updateCounter();
      });

      test('a counter is displayed', function() {
        var expected = availableChars + '/' + segment;
        assert.equal(sendButton.dataset.counter, expected);
      });

      test('the user can not enter more characters', function() {
        assert.equal(input.maxLength, input.value.length);
      });

      test('the banner is displayed', function() {
        assert.isFalse(banner.classList.contains('hide'));
      });

      test('the banner has the max length message', function() {
        var actual = banner.querySelector('p').textContent;
        assert.equal(actual, 'messages-max-length-text');
      });

      test('the send button should be enabled', function() {
        assert.isTrue(shouldEnableSend);
      });
    });

    suite('too many segments >', function() {
      var segment = 11,
          availableChars = 25;

      setup(function() {
        MockNavigatormozSms.mNextSegmentInfo = {
          segments: segment,
          charsAvailableInLastSegment: availableChars
        };

        shouldEnableSend = ThreadUI.updateCounter();
      });

      test('a counter is displayed', function() {
        var expected = availableChars + '/' + segment;
        assert.equal(sendButton.dataset.counter, expected);
      });

      test('the user can not enter more characters', function() {
        assert.equal(input.maxLength, input.value.length);
      });

      test('the banner is displayed', function() {
        assert.isFalse(banner.classList.contains('hide'));
      });

      test('the banner has the exceeded length message', function() {
        var actual = banner.querySelector('p').textContent;
        assert.equal(actual, 'messages-exceeded-length-text');
      });

      test('the send button should be disabled', function() {
        assert.isFalse(shouldEnableSend);
      });
    });
  });
});
