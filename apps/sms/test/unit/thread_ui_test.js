'use strict';

// remove this when https://github.com/visionmedia/mocha/issues/819 is merged in
// mocha and when we have that new mocha in test agent
mocha.setup({ globals: ['alert', '0', '1'] });

requireApp('sms/js/compose.js');
requireApp('sms/js/threads.js');
requireApp('sms/js/thread_ui.js');
requireApp('sms/js/utils.js');
requireApp('sms/js/message_manager.js');

requireApp('sms/test/unit/mock_alert.js');
requireApp('sms/test/unit/mock_attachment.js');
requireApp('sms/test/unit/mock_l10n.js');
requireApp('sms/test/unit/mock_utils.js');
requireApp('sms/test/unit/mock_navigatormoz_sms.js');
requireApp('sms/test/unit/mock_link_helper.js');
requireApp('sms/test/unit/mock_moz_activity.js');
requireApp('sms/test/unit/mock_contact.js');
requireApp('sms/test/unit/mock_recipients.js');
requireApp('sms/test/unit/mock_settings.js');


var mocksHelperForThreadUI = new MocksHelper([
  'Attachment',
  'Utils',
  'Settings',
  'Recipients',
  'LinkHelper',
  'MozActivity'
]);

mocksHelperForThreadUI.init();

suite('thread_ui.js >', function() {
  var sendButton;
  var input;
  var composeForm;
  var recipient;

  var realMozL10n;
  var realMozMobileMessage;

  var mocksHelper = mocksHelperForThreadUI;
  var testImageBlob;
  var testAudioBlob;
  var testVideoBlob;

  function mockAttachment(size) {
    return new MockAttachment({
      type: 'image/jpeg',
      size: size
    }, 'kitten-450.jpg');
  }

  suiteSetup(function(done) {
    mocksHelper.suiteSetup();

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    var assetsNeeded = 0;
    function getAsset(filename, loadCallback) {
      assetsNeeded++;

      var req = new XMLHttpRequest();
      req.open('GET', filename, true);
      req.responseType = 'blob';
      req.onload = function() {
        loadCallback(req.response);
        if (--assetsNeeded === 0) {
          done();
        }
      };
      req.send();
    }
    getAsset('/test/unit/media/kitten-450.jpg', function(blob) {
      testImageBlob = blob;
    });
    getAsset('/test/unit/media/audio.oga', function(blob) {
      testAudioBlob = blob;
    });
    getAsset('/test/unit/media/video.ogv', function(blob) {
      testVideoBlob = blob;
    });
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    mocksHelper.suiteTeardown();
  });

  setup(function() {
    mocksHelper.setup();
    loadBodyHTML('/index.html');

    sendButton = document.getElementById('messages-send-button');
    input = document.getElementById('messages-input');
    composeForm = document.getElementById('messages-compose-form');

    ThreadUI.recipients = null;
    ThreadUI.init();
    realMozMobileMessage = ThreadUI._mozMobileMessage;
    ThreadUI._mozMobileMessage = MockNavigatormozMobileMessage;
  });

  teardown(function() {
    document.body.innerHTML = '';

    MockNavigatormozMobileMessage.mTeardown();
    mocksHelper.teardown();
    ThreadUI._mozMobileMessage = realMozMobileMessage;
  });

  suite('Search', function() {
    test('search results cleared', function() {
      Compose.clear();
      Compose.append('foo');
      ThreadUI.cleanFields(true);
      assert.equal(Compose.getContent(), '');
    });
  });

  suite('enableSend() >', function() {
    setup(function() {
      Compose.clear();
      ThreadUI.updateCounter();
    });

    teardown(function() {
      Compose.clear();
    });

    test('button should be disabled at the beginning', function() {
      Compose.clear();
      assert.isTrue(sendButton.disabled);
    });

    test('button should be enabled when there is some text', function() {
      Compose.append('Hola');
      assert.isFalse(sendButton.disabled);
    });

    test('button should be disabled if there is some text ' +
      'but too many segments', function() {

      MockNavigatormozMobileMessage.mNextSegmentInfo = {
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
        Compose.clear();
        ThreadUI.recipients.length = 0;
      });

      teardown(function() {
        window.location.hash = '';
        Compose.clear();
        ThreadUI.recipients.length = 0;
      });

      test('button should be disabled when there is neither contact or input',
        function() {
        assert.isTrue(sendButton.disabled);
      });

      test('button should be disabled when there is no contact', function() {
        Compose.append('Hola');
        assert.isTrue(sendButton.disabled);
      });

      test('button should be enabled after adding a recipient when text exists',
        function() {
        Compose.append('Hola');

        ThreadUI.recipients.add({
          number: '999'
        });

        assert.isFalse(sendButton.disabled);
      });

      test('button should be enabled after adding text when recipient exists',
        function() {

        ThreadUI.recipients.add({
          number: '999'
        });
        Compose.append('Hola');

        assert.isFalse(sendButton.disabled);
      });

      // TODO: Fix this test to be about being over the MMS limit inside #840035

      test('button should be disabled when there is both contact and ' +
          'input, but too much data to send as mms',
        function() {

        ThreadUI.recipients.add({
          number: '999'
        });

        Compose.append(mockAttachment(300 * 1024));

        assert.isFalse(sendButton.disabled);
        Compose.append('Hola');

        assert.isTrue(sendButton.disabled);
      });
    });
  });

  suite('updateCounter() >', function() {
    var banner, convertBanner, shouldEnableSend, form;

    setup(function() {
      banner = document.getElementById('messages-max-length-notice');
      convertBanner = document.getElementById('messages-convert-notice');
      form = document.getElementById('messages-compose-form');
    });

    suite('no characters entered >', function() {
      setup(function() {
        MockNavigatormozMobileMessage.mNextSegmentInfo = {
          segments: 0,
          charsAvailableInLastSegment: 0
        };

        // display the banner to check that it is correctly hidden
        banner.classList.remove('hide');

        // add a lock to check that it is correctly removed
        Compose.lock = true;

        shouldEnableSend = ThreadUI.updateCounter();
      });

      test('no counter is displayed', function() {
        assert.isFalse(sendButton.classList.contains('has-counter'));
      });

      test('no banner is displayed', function() {
        assert.ok(banner.classList.contains('hide'));
      });

      test('lock is unset', function() {
        assert.isFalse(Compose.lock);
      });
    });

    suite('in first segment >', function() {
      setup(function() {
        MockNavigatormozMobileMessage.mNextSegmentInfo = {
          segments: 1,
          charsAvailableInLastSegment: 20
        };

        // display the banner to check that it is correctly hidden
        banner.classList.remove('hide');

        // add a lock to check that it is correctly removed
        Compose.lock = true;

        shouldEnableSend = ThreadUI.updateCounter();
      });

      test('no counter is displayed', function() {
        assert.isFalse(sendButton.classList.contains('has-counter'));
      });

      test('no banner is displayed', function() {
        assert.ok(banner.classList.contains('hide'));
      });

      test('the send button should be enabled', function() {
        assert.isTrue(shouldEnableSend);
      });

      test('lock is unset', function() {
        assert.isFalse(Compose.lock);
      });
    });

    suite('in first segment, less than 10 chars left >', function() {
      var segment = 1,
          availableChars = 10;

      setup(function() {
        MockNavigatormozMobileMessage.mNextSegmentInfo = {
          segments: segment,
          charsAvailableInLastSegment: availableChars
        };

        // display the banner to check that it is correctly hidden
        banner.classList.remove('hide');

        // add a lock to check that it is correctly removed
        Compose.lock = true;

        shouldEnableSend = ThreadUI.updateCounter();
      });

      test('a counter is displayed', function() {
        var expected = availableChars + '/' + segment;
        assert.equal(sendButton.dataset.counter, expected);
      });

      test('no banner is displayed', function() {
        assert.ok(banner.classList.contains('hide'));
      });

      test('the send button should be enabled', function() {
        assert.isTrue(shouldEnableSend);
      });

      test('lock is unset', function() {
        assert.isFalse(Compose.lock);
      });
    });

    suite('in second segment >', function() {
      var segment = 2,
          availableChars = 20;

      setup(function() {
        MockNavigatormozMobileMessage.mNextSegmentInfo = {
          segments: segment,
          charsAvailableInLastSegment: availableChars
        };

        // display the banner to check that it is correctly hidden
        banner.classList.remove('hide');

        // add a lock to check that it is correctly removed
        Compose.lock = true;

        shouldEnableSend = ThreadUI.updateCounter();
      });

      test('a counter is displayed', function() {
        var expected = availableChars + '/' + segment;
        assert.equal(sendButton.dataset.counter, expected);
      });

      test('no banner is displayed', function() {
        assert.ok(banner.classList.contains('hide'));
      });

      test('the send button should be enabled', function() {
        assert.isTrue(shouldEnableSend);
      });

      test('lock is unset', function() {
        assert.isFalse(Compose.lock);
      });

    });

    suite('in last segment >', function() {
      var segment = 10,
          availableChars = 20;

      setup(function() {
        MockNavigatormozMobileMessage.mNextSegmentInfo = {
          segments: segment,
          charsAvailableInLastSegment: availableChars
        };

        // display the banner to check that it is correctly hidden
        banner.classList.remove('hide');

        // add a lock to check that it is correctly removed
        Compose.lock = true;

        shouldEnableSend = ThreadUI.updateCounter();
      });

      test('a counter is displayed', function() {
        var expected = availableChars + '/' + segment;
        assert.equal(sendButton.dataset.counter, expected);
      });

      test('no banner is displayed', function() {
        assert.ok(banner.classList.contains('hide'));
      });

      test('the send button should be enabled', function() {
        assert.isTrue(shouldEnableSend);
      });

      test('lock is unset', function() {
        assert.isFalse(Compose.lock);
      });
    });

    suite('in last segment, no characters left >', function() {
      var segment = 10,
          availableChars = 0;

      setup(function() {
        MockNavigatormozMobileMessage.mNextSegmentInfo = {
          segments: segment,
          charsAvailableInLastSegment: availableChars
        };

        // display the banner to check that it is correctly hidden
        banner.classList.remove('hide');

        // add a lock to check that it is correctly removed
        Compose.lock = true;

        shouldEnableSend = ThreadUI.updateCounter();
      });

      test('a counter is displayed', function() {
        var expected = availableChars + '/' + segment;
        assert.equal(sendButton.dataset.counter, expected);
      });

      test('the send button should be enabled', function() {
        assert.isTrue(shouldEnableSend);
      });

      test('message type is sms', function() {
        assert.equal(form.dataset.messageType, 'sms');
      });

      test('lock is disabled', function() {
        assert.isFalse(Compose.lock);
      });
    });

    suite('too many segments >', function() {
      var segment = 11,
          availableChars = 25;

      setup(function() {
        MockNavigatormozMobileMessage.mNextSegmentInfo = {
          segments: segment,
          charsAvailableInLastSegment: availableChars
        };

        // add a lock to check that it is correctly removed
        Compose.lock = true;

        shouldEnableSend = ThreadUI.updateCounter();
      });

      test('a counter is displayed', function() {
        var expected = availableChars + '/' + segment;
        assert.equal(sendButton.dataset.counter, expected);
      });

      test('message type is mms', function() {
        assert.equal(form.dataset.messageType, 'mms');
      });

      test('lock is disabled', function() {
        assert.isFalse(Compose.lock);
      });
    });

    suite('at size limit in mms >', function() {
      setup(function() {
        Settings.mmsSizeLimitation = 1024;
        Compose.append(mockAttachment(512));
        Compose.append(mockAttachment(512));
        shouldEnableSend = ThreadUI.updateCounter();
      });

      teardown(function() {
        Compose.clear();
      });

      test('shouldEnableSend', function() {
        assert.isTrue(shouldEnableSend);
      });

      test('banner is displayed', function() {
        assert.isFalse(banner.classList.contains('hide'));
      });

      test('banner has at size limit text', function() {
        assert.equal(banner.querySelector('p').textContent,
          'messages-max-length-text');
      });

      test('message type is mms', function() {
        assert.equal(form.dataset.messageType, 'mms');
      });

      test('lock is enabled', function() {
        assert.isTrue(Compose.lock);
      });
    });

    suite('over size limit in mms >', function() {
      setup(function() {
        Settings.mmsSizeLimitation = 1024;
        Compose.append(mockAttachment(512));
        Compose.append('sigh');
        Compose.append(mockAttachment(512));
        shouldEnableSend = ThreadUI.updateCounter();
      });

      teardown(function() {
        Compose.clear();
      });

      test('shouldEnableSend is false', function() {
        assert.isFalse(shouldEnableSend);
      });

      test('banner is displayed', function() {
        assert.isFalse(banner.classList.contains('hide'));
      });

      test('banner has at size limit text', function() {
        assert.equal(banner.querySelector('p').textContent,
          'messages-exceeded-length-text');
      });

      test('message type is mms', function() {
        assert.equal(form.dataset.messageType, 'mms');
      });

      test('lock is enabled', function() {
        assert.isTrue(Compose.lock);
      });
    });

  });
  suite('message type conversion >', function() {
    var convertBanner, convertBannerText, fakeTime, form;
    setup(function() {
      fakeTime = sinon.useFakeTimers();
      convertBanner = document.getElementById('messages-convert-notice');
      convertBannerText = convertBanner.querySelector('p');
      form = document.getElementById('messages-compose-form');
    });
    teardown(function() {
      fakeTime.restore();
    });
    test('sms to mms and back displays banner', function() {
      // cause a type switch event to happen
      Compose.type = 'mms';
      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is shown for mms');
      assert.equal(convertBannerText.textContent, 'converted-to-mms',
        'conversion banner has mms message');

      fakeTime.tick(2999);
      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is shown for just shy of 3 seconds');

      fakeTime.tick(1);
      assert.isTrue(convertBanner.classList.contains('hide'),
        'conversion banner is hidden at 3 seconds');

      Compose.type = 'sms';

      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is shown for sms');
      assert.equal(convertBannerText.textContent, 'converted-to-sms',
        'conversion banner has sms message');

      fakeTime.tick(2999);
      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is shown for just shy of 3 seconds');

      fakeTime.tick(1);
      assert.isTrue(convertBanner.classList.contains('hide'),
        'conversion banner is hidden at 3 seconds');

    });

    test('character limit from sms to mms and back displays banner',
      function() {

      // go over the limit
      MockNavigatormozMobileMessage.mNextSegmentInfo = {
        segments: 11,
        charsAvailableInLastSegment: 0
      };

      ThreadUI.updateCounter();
      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is shown for mms');
      assert.equal(convertBannerText.textContent, 'converted-to-mms',
        'conversion banner has mms message');

      fakeTime.tick(2999);
      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is shown for just shy of 3 seconds');

      fakeTime.tick(1);
      assert.isTrue(convertBanner.classList.contains('hide'),
        'conversion banner is hidden at 3 seconds');

      MockNavigatormozMobileMessage.mNextSegmentInfo.segments = 0;
      Compose.clear();

      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is shown for sms');
      assert.equal(convertBannerText.textContent, 'converted-to-sms',
        'conversion banner has sms message');

      fakeTime.tick(2999);
      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is shown for just shy of 3 seconds');

      fakeTime.tick(1);
      assert.isTrue(convertBanner.classList.contains('hide'),
        'conversion banner is hidden at 3 seconds');

    });
    test('converting from sms to mms and back quickly', function() {
      // go over the limit
      MockNavigatormozMobileMessage.mNextSegmentInfo = {
        segments: 11,
        charsAvailableInLastSegment: 0
      };

      ThreadUI.updateCounter();
      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is shown for mms');
      assert.equal(convertBannerText.textContent, 'converted-to-mms',
        'conversion banner has mms message');

      fakeTime.tick(1500);
      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is still shown');

      MockNavigatormozMobileMessage.mNextSegmentInfo.segments = 0;
      Compose.clear();

      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is shown for sms');
      assert.equal(convertBannerText.textContent, 'converted-to-sms',
        'conversion banner has sms message');

      // long enough to go past the previous timeout 1500 + 2000 > 3000
      fakeTime.tick(2000);
      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is still shown');

      fakeTime.tick(1000);
      assert.isTrue(convertBanner.classList.contains('hide'),
        'conversion banner is hidden at 3 seconds');

    });
  });

  suite('message status update handlers >', function() {
    suiteSetup(function() {
      this.fakeMessage = {
        id: 24601
      };
    });
    teardown(function() {
      document.body.removeChild(this.container);
    });
    setup(function() {
      this.container = document.createElement('div');
      this.container.id = 'message-' + this.fakeMessage.id;
      this.container.className = 'sending';
      this.container.innerHTML = ThreadUI.tmpl.message.interpolate({});
      document.body.appendChild(this.container);
    });

    suite('onMessageSent >', function() {
      test('removes the "sending" class from the message element', function() {
        ThreadUI.onMessageSent(this.fakeMessage);
        assert.isFalse(this.container.classList.contains('sending'));
      });
      test('adds the "sent" class to the message element', function() {
        ThreadUI.onMessageSent(this.fakeMessage);
        assert.isTrue(this.container.classList.contains('sent'));
      });
    });

    suite('onMessageFailed >', function() {
      suite('messages that were *not* previously in the "error" state >',
        function() {
        test('removes the "sending" class from the message element',
          function() {
          ThreadUI.onMessageFailed(this.fakeMessage);
          assert.isFalse(this.container.classList.contains('sending'));
        });
        test('adds the "error" class to the message element', function() {
          ThreadUI.onMessageFailed(this.fakeMessage);
          assert.isTrue(this.container.classList.contains('error'));
        });
      });
      suite('messages that were previously in the "error" state >',
        function() {
        setup(function() {
          this.container.classList.add('error');
        });
        test('does not remove the "sending" class to the message element',
          function() {
          ThreadUI.onMessageFailed(this.fakeMessage);
          assert.isTrue(this.container.classList.contains('sending'));
        });
      });
    });

  });

  suite('resendMessage', function() {
    setup(function() {
      this.targetMsg = {
        id: 23,
        type: 'sms',
        body: 'This is a test',
        delivery: 'error',
        timestamp: new Date()
      };
      this.otherMsg = {
        id: 45,
        type: 'sms',
        body: 'This is another test',
        delivery: 'sent',
        timestamp: new Date()
      };
      ThreadUI.appendMessage(this.targetMsg);
      ThreadUI.appendMessage(this.otherMsg);

      assert.length(
        ThreadUI.container.querySelectorAll('[data-message-id="23"]'),
        1);
      assert.length(
        ThreadUI.container.querySelectorAll('[data-message-id="45"]'),
        1);

      this.getMessageReq = {};
      sinon.stub(MessageManager, 'getMessage')
        .returns(this.getMessageReq);
      sinon.stub(MessageManager, 'deleteMessage').callsArgWith(1, true);

      sinon.stub(ThreadUI, 'sendMessage');
    });
    teardown(function() {
      MessageManager.getMessage.restore();
      MessageManager.deleteMessage.restore();
      ThreadUI.sendMessage.restore();
    });

    // TODO: Implement this functionality in a specialized method and update
    // this test accordingly.
    // Bug 872725 - [MMS] Message deletion logic is duplicated
    test('removes the markup of only the specified message from the DOM',
      function() {
      ThreadUI.resendMessage(23);

      this.getMessageReq.result = this.targetMsg;
      this.getMessageReq.onsuccess();

      assert.length(
        ThreadUI.container.querySelectorAll('[data-message-id="23"]'),
        0);
      assert.length(
        ThreadUI.container.querySelectorAll('[data-message-id="45"]'),
        1);
    });

    test('invokes the `sendMessage` method', function() {
      ThreadUI.resendMessage(23);

      this.getMessageReq.result = this.targetMsg;
      this.getMessageReq.onsuccess();

      assert.deepEqual(ThreadUI.sendMessage.args, [[this.targetMsg.body]]);
    });

  });

  // TODO: Move these tests to an integration test suite.
  // Bug 868056 - Clean up SMS test suite
  suite('Message resending UI', function() {
    setup(function() {
      ThreadUI.appendMessage({
        id: 23,
        type: 'sms',
        body: 'This is a test',
        delivery: 'error',
        timestamp: new Date()
      });
      ThreadUI.appendMessage({
        id: 45,
        type: 'sms',
        body: 'This is another test',
        delivery: 'sent',
        timestamp: new Date()
      });
      sinon.stub(window, 'confirm');
      sinon.stub(ThreadUI, 'resendMessage');
      this.elems = {
        errorMsg: ThreadUI.container.querySelector('.error'),
        sentMsg: ThreadUI.container.querySelector('.sent')
      };
    });
    teardown(function() {
      window.confirm.restore();
      ThreadUI.resendMessage.restore();
    });
    test('clicking on an error message bubble triggers a confirmation dialog',
      function() {
      this.elems.errorMsg.querySelector('.bubble').click();
      assert.equal(window.confirm.callCount, 1);
    });
    test('clicking within an error message bubble triggers a confirmation ' +
      'dialog', function() {
      this.elems.errorMsg.querySelector('.bubble *').click();
      assert.equal(window.confirm.callCount, 1);
    });
    test('clicking on an error message does not trigger a confirmation dialog',
      function() {
      this.elems.errorMsg.click();
      assert.equal(window.confirm.callCount, 0);
    });
    test('clicking on an error message bubble and accepting the ' +
      'confirmation dialog triggers a message re-send operation', function() {
      window.confirm.returns(true);
      this.elems.errorMsg.querySelector('.bubble').click();
      assert.equal(ThreadUI.resendMessage.callCount, 1);
    });
    test('clicking on an error message bubble and rejecting the ' +
      'confirmation dialog does not trigger a message re-send operation',
      function() {
      window.confirm.returns(false);
      this.elems.errorMsg.querySelector('.bubble').click();
      assert.equal(ThreadUI.resendMessage.callCount, 0);
    });
    test('clicking on a sent message does not trigger a confirmation dialog ' +
      'nor a message re-send operation', function() {
      this.elems.sentMsg.click();
      assert.equal(window.confirm.callCount, 0);
      assert.equal(ThreadUI.resendMessage.callCount, 0);
    });
  });

  suite('createMmsContent', function() {
    test('generated html', function() {
      var inputArray = [{
        text: '&escapeTest',
        name: 'imageTest.jpg',
        blob: testImageBlob
      }];
      var output = ThreadUI.createMmsContent(inputArray);
      var img = output.querySelectorAll('img');
      assert.equal(img.length, 1);
      var span = output.querySelectorAll('span');
      assert.equal(span.length, 1);
      assert.equal(span[0].innerHTML.slice(0, 5), '&amp;');
    });
  });

  suite('MMS images', function() {
    var img;
    setup(function() {
      // create an image mms DOM Element:
      var inputArray = [{
        name: 'imageTest.jpg',
        blob: testImageBlob
      }];

      // quick dirty creation of a thread with image:
      var output = ThreadUI.createMmsContent(inputArray);
      // need to get a container from ThreadUI because event is delegated
      var messageContainer = ThreadUI.getMessageContainer(Date.now(), false);
      messageContainer.appendChild(output);

      img = output.querySelector('img');
    });
    test('MozActivity is called with the proper info on click', function() {
      // Start the test: simulate a click event
      img.click();

      assert.equal(MockMozActivity.calls.length, 1);
      var call = MockMozActivity.calls[0];
      assert.equal(call.name, 'open');
      assert.isTrue(call.data.allowSave);
      assert.equal(call.data.type, 'image/jpeg');
      assert.equal(call.data.filename, 'imageTest.jpg');
      assert.equal(call.data.blob, testImageBlob);
    });
  });

  suite('MMS audio', function() {
    var audio;
    setup(function() {
      // create an image mms DOM Element:
      var inputArray = [{
        name: 'audio.oga',
        blob: testAudioBlob
      }];

      // quick dirty creation of a thread with image:
      var output = ThreadUI.createMmsContent(inputArray);
      // need to get a container from ThreadUI because event is delegated
      var messageContainer = ThreadUI.getMessageContainer(Date.now(), false);
      messageContainer.appendChild(output);

      audio = output.querySelector('.audio-placeholder');
    });

    test('MozActivity is called with the proper info on click', function() {
      audio.click();

      // check that the MozActivity was called with the proper info
      assert.equal(MockMozActivity.calls.length, 1);
      var call = MockMozActivity.calls[0];
      assert.equal(call.name, 'open');
      assert.isTrue(call.data.allowSave);
      assert.equal(call.data.type, 'audio/ogg');
      assert.equal(call.data.filename, 'audio.oga');
      assert.equal(call.data.blob, testAudioBlob);
    });
  });

  suite('MMS video', function() {
    var video;
    setup(function() {
      // create an image mms DOM Element:
      var inputArray = [{
        name: 'video.ogv',
        blob: testVideoBlob
      }];

      // quick dirty creation of a thread with video:
      var output = ThreadUI.createMmsContent(inputArray);
      // need to get a container from ThreadUI because event is delegated
      var messageContainer = ThreadUI.getMessageContainer(Date.now(), false);
      messageContainer.appendChild(output);

      video = output.querySelector('.video-placeholder');
    });

    test('MozActivity is called with the proper info on click', function() {
      video.click();

      // check that the MozActivity was called with the proper info
      assert.equal(MockMozActivity.calls.length, 1);
      var call = MockMozActivity.calls[0];
      assert.equal(call.name, 'open');
      assert.isTrue(call.data.allowSave);
      assert.equal(call.data.type, 'video/ogg');
      assert.equal(call.data.filename, 'video.ogv');
      assert.equal(call.data.blob, testVideoBlob);
    });
  });
});
