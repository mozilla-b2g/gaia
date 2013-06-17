'use strict';

mocha.setup({ globals: ['alert'] });

// For Desktop testing
if (!navigator.mozContacts) {
  requireApp('sms/js/desktop_contact_mock.js');
}

requireApp('sms/js/compose.js');
requireApp('sms/js/threads.js');
requireApp('sms/js/thread_ui.js');
requireApp('sms/js/utils.js');
requireApp('sms/js/message_manager.js');

requireApp('sms/test/unit/mock_alert.js');
requireApp('sms/test/unit/mock_attachment.js');
requireApp('sms/test/unit/mock_attachment_menu.js');
requireApp('sms/test/unit/mock_l10n.js');
requireApp('sms/test/unit/mock_utils.js');
requireApp('sms/test/unit/mock_navigatormoz_sms.js');
requireApp('sms/test/unit/mock_link_helper.js');
requireApp('sms/test/unit/mock_moz_activity.js');
requireApp('sms/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('sms/test/unit/mock_messages.js');
requireApp('sms/test/unit/mock_contact.js');
requireApp('sms/test/unit/mock_contacts.js');
requireApp('sms/test/unit/mock_recipients.js');
requireApp('sms/test/unit/mock_settings.js');
requireApp('sms/test/unit/mock_activity_picker.js');
requireApp('sms/test/unit/mock_action_menu.js');
requireApp('sms/test/unit/mock_custom_dialog.js');
requireApp('sms/test/unit/mock_smil.js');

var mocksHelperForThreadUI = new MocksHelper([
  'Attachment',
  'AttachmentMenu',
  'Utils',
  'Settings',
  'Recipients',
  'LinkHelper',
  'MozActivity',
  'ActivityPicker',
  'OptionMenu',
  'CustomDialog',
  'Contacts',
  'SMIL'
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
  var oversizedImageBlob;
  var testAudioBlob;
  var testVideoBlob;

  function mockAttachment(size) {
    return new MockAttachment({
      type: 'video/ogg',
      size: size
    }, 'video.ogv');
  }

  function mockImgAttachment(isOversized) {
    var attachment = isOversized ?
      new MockAttachment(oversizedImageBlob, 'testOversized.jpg') :
      new MockAttachment(testImageBlob, 'test.jpg');
    return attachment;
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
    getAsset('/test/unit/media/IMG_0554.jpg', function(blob) {
      oversizedImageBlob = blob;
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
        ThreadUI.recipients.inputValue = '';
      });

      teardown(function() {
        window.location.hash = '';
        Compose.clear();
        ThreadUI.recipients.length = 0;
        ThreadUI.recipients.inputValue = '';
      });

      test('button should be disabled when there is neither contact or input',
        function() {
        assert.isTrue(sendButton.disabled);
      });

      test('button should be disabled when there is no contact', function() {
        Compose.append('Hola');
        assert.isTrue(sendButton.disabled);
      });

      test('button should be enabled with recipient input', function() {
        Compose.append('Hola');
        ThreadUI.recipients.inputValue = '999';

        // Call directly since no input event will be triggered
        ThreadUI.enableSend();
        assert.isFalse(sendButton.disabled);
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

      test('When adding an image that is under the limitation, button ' +
           'should be enabled right after appended',
        function() {

        ThreadUI.recipients.add({
          number: '999'
        });

        Compose.append(mockImgAttachment());
        assert.isFalse(sendButton.disabled);
      });

      test('When adding an oversized image, button should be disabled while ' +
           'resizing and enabled when resize complete',
        function(done) {

        ThreadUI.recipients.add({
          number: '999'
        });

        function onInput() {
          if (!Compose.isResizing) {
            Compose.off('input', onInput);
            assert.isFalse(sendButton.disabled);
            done();
          }
        };
        Compose.on('input', onInput);
        Compose.append(mockImgAttachment(true));
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
      assert.isTrue(sendButton.classList.contains('has-counter'));
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

      assert.isFalse(sendButton.classList.contains('has-counter'));
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
      suite('send message in airplane mode >', function() {
        var realMozSettings;
        setup(function() {
          MockNavigatorSettings.createLock().set({
            'ril.radio.disabled' : true
          });
        });

        suiteSetup(function() {
          realMozSettings = navigator.mozSettings;
          navigator.mozSettings = MockNavigatorSettings;
        });
        suiteTeardown(function() {
          navigator.mozSettings = realMozSettings;
        });

        test('airplane alert is visible', function(done) {
          ThreadUI.onMessageFailed(this.fakeMessage);
          setTimeout(function() {
            assert.isTrue(MockCustomDialog.mShown);
            done();
          });
        });
      });
    });
  });

  suite('removeMessageDOM', function() {
    setup(function() {
      ThreadUI.container.innerHTML = '<h2></h2><ul><li></li><li></li></ul>';
    });
    teardown(function() {
      ThreadUI.container.innerHTML = '';
    });
    test('removeMessageDOM removes a child', function() {
      ThreadUI.removeMessageDOM(ThreadUI.container.querySelector('li'));
      assert.equal(ThreadUI.container.querySelectorAll('li').length, 1);
    });
    test('removeMessageDOM removes headers and ul', function() {
      ThreadUI.removeMessageDOM(ThreadUI.container.querySelector('li'));
      ThreadUI.removeMessageDOM(ThreadUI.container.querySelector('li'));
      assert.equal(ThreadUI.container.querySelectorAll('h2').length, 0);
      assert.equal(ThreadUI.container.querySelectorAll('ul').length, 0);
    });
  });

  suite('appendMessage removes old message', function() {
    setup(function() {
      this.targetMsg = {
        id: 23,
        type: 'sms',
        receivers: this.receivers,
        body: 'This is a test',
        delivery: 'error',
        timestamp: new Date()
      };
      ThreadUI.appendMessage(this.targetMsg);
      this.original = ThreadUI.container.querySelector(
        '[data-message-id="' + this.targetMsg.id + '"]');
      ThreadUI.appendMessage(this.targetMsg);
    });
    test('original message removed when rendered a second time', function() {
      var message = ThreadUI.container.querySelector(
        '[data-message-id="' + this.targetMsg.id + '"]');
      assert.notEqual(message, this.original);
    });
  });

  suite('buildMessageDOM >', function() {
    setup(function() {
      this.sinon.spy(MockUtils, 'escapeHTML');
      this.sinon.stub(MockSMIL, 'parse');
    });

    function buildSMS(payload) {
      return MockMessages.sms({ body: payload });
    }

    function buildMMS(payload) {
      return MockMessages.mms({
        attachments: [new Blob([payload], {type: 'text/plain'})]
      });
    }

    test('escapes the body for SMS', function() {
      var payload = 'hello <a href="world">world</a>';
      ThreadUI.buildMessageDOM(buildSMS(payload));
      assert.ok(MockUtils.escapeHTML.calledWith(payload));
    });

    test('escapes all text for MMS', function() {
      var payload = 'hello <a href="world">world</a>';
      MockSMIL.parse.yields([{ text: payload }]);
      ThreadUI.buildMessageDOM(buildMMS(payload));
      assert.ok(MockUtils.escapeHTML.calledWith(payload));
    });
  });

  suite('not-downloaded', function() {
    var ONE_DAY_TIME = 24 * 60 * 60 * 1000;
    var testMessages = [{
      id: 1,
      threadId: 8,
      sender: '123456',
      type: 'mms',
      delivery: 'not-downloaded',
      deliveryStatus: ['pending'],
      subject: 'Pending download',
      timestamp: new Date(Date.now() - 150000),
      expiryDate: new Date(Date.now() + ONE_DAY_TIME)
    },
    {
      id: 2,
      threadId: 8,
      sender: '123456',
      type: 'mms',
      delivery: 'not-downloaded',
      deliveryStatus: ['manual'],
      subject: 'manual download',
      timestamp: new Date(Date.now() - 150000),
      expiryDate: new Date(Date.now() + ONE_DAY_TIME * 2)
    },
    {
      id: 3,
      threadId: 8,
      sender: '123456',
      type: 'mms',
      delivery: 'not-downloaded',
      deliveryStatus: ['error'],
      subject: 'error download',
      timestamp: new Date(Date.now() - 150000),
      expiryDate: new Date(Date.now() + ONE_DAY_TIME * 2)
    },
    {
      id: 4,
      threadId: 8,
      sender: '123456',
      type: 'mms',
      delivery: 'not-downloaded',
      deliveryStatus: ['error'],
      subject: 'Error download',
      timestamp: new Date(Date.now() - 150000),
      expiryDate: new Date(Date.now() - ONE_DAY_TIME)
    }];
    setup(function() {
      sinon.stub(Utils.date.format, 'localeFormat', function() {
        return 'date_stub';
      });
      sinon.stub(MessageManager, 'retrieveMMS', function() {
        return {};
      });
    });
    teardown(function() {
      Utils.date.format.localeFormat.restore();
      MessageManager.retrieveMMS.restore();
    });
    suite('pending message', function() {
      var message = testMessages[0];
      var element;
      var notDownloadedMessage;
      var button;
      setup(function() {
        ThreadUI.appendMessage(message);
        element = document.getElementById('message-' + message.id);
        notDownloadedMessage = element.querySelector('.not-downloaded-message');
        button = element.querySelector('button');
      });
      test('element has correct data-message-id', function() {
        assert.equal(element.dataset.messageId, message.id);
      });
      test('not-downloaded class present', function() {
        assert.isTrue(element.classList.contains('not-downloaded'));
      });
      test('error class absent', function() {
        assert.isFalse(element.classList.contains('error'));
      });
      test('expired class absent', function() {
        assert.isFalse(element.classList.contains('expired'));
      });
      test('pending class present', function() {
        assert.isTrue(element.classList.contains('pending'));
      });
      test('message is correct', function() {
        assert.equal(notDownloadedMessage.textContent,
          'not-downloaded-mms{"date":"date_stub"}');
      });
      test('date is correctly determined', function() {
        assert.equal(Utils.date.format.localeFormat.args[0][0],
          message.expiryDate);
        assert.equal(Utils.date.format.localeFormat.args[0][1],
          'dateTimeFormat_%x');
      });
      test('button text is correct', function() {
        assert.equal(button.textContent, 'downloading');
      });
      suite('clicking', function() {
        setup(function() {
          ThreadUI.handleMessageClick({
            target: button
          });
        });
        test('does not call retrieveMMS', function() {
          assert.equal(MessageManager.retrieveMMS.args.length, 0);
        });
      });
    });
    suite('manual message', function() {
      var message = testMessages[1];
      var element;
      var notDownloadedMessage;
      var button;
      setup(function() {
        ThreadUI.appendMessage(message);
        element = document.getElementById('message-' + message.id);
        notDownloadedMessage = element.querySelector('.not-downloaded-message');
        button = element.querySelector('button');
      });
      test('element has correct data-message-id', function() {
        assert.equal(element.dataset.messageId, message.id);
      });
      test('not-downloaded class present', function() {
        assert.isTrue(element.classList.contains('not-downloaded'));
      });
      test('error class absent', function() {
        assert.isFalse(element.classList.contains('error'));
      });
      test('expired class absent', function() {
        assert.isFalse(element.classList.contains('expired'));
      });
      test('pending class absent', function() {
        assert.isFalse(element.classList.contains('pending'));
      });
      test('message is correct', function() {
        assert.equal(notDownloadedMessage.textContent,
          'not-downloaded-mms{"date":"date_stub"}');
      });
      test('date is correctly determined', function() {
        assert.equal(Utils.date.format.localeFormat.args[0][0],
          message.expiryDate);
        assert.equal(Utils.date.format.localeFormat.args[0][1],
          'dateTimeFormat_%x');
      });
      test('button text is correct', function() {
        assert.equal(button.textContent, 'download');
      });
      suite('clicking', function() {
        setup(function() {
          ThreadUI.handleMessageClick({
            target: button
          });
        });
        test('changes download text', function() {
          assert.equal(button.textContent, 'downloading');
        });
        test('error class absent', function() {
          assert.isFalse(element.classList.contains('error'));
        });
        test('pending class present', function() {
          assert.isTrue(element.classList.contains('pending'));
        });
        test('click calls retrieveMMS', function() {
          assert.isTrue(MessageManager.retrieveMMS.calledWith(message.id));
        });
        suite('response error', function() {
          setup(function() {
            MessageManager.retrieveMMS.returnValues[0].onerror();
          });
          test('error class present', function() {
            assert.isTrue(element.classList.contains('error'));
          });
          test('pending class absent', function() {
            assert.isFalse(element.classList.contains('pending'));
          });
          test('changes download text', function() {
            assert.equal(button.textContent, 'download');
          });
        });
        suite('response success', function() {
          setup(function() {
            MessageManager.retrieveMMS.returnValues[0].onsuccess();
          });
          // re-rendering message happens from a status handler
          test('removes message', function() {
            assert.equal(element.parentNode, null);
          });
        });
      });
    });
    suite('error message', function() {
      var message = testMessages[2];
      var element;
      var notDownloadedMessage;
      var button;
      setup(function() {
        ThreadUI.appendMessage(message);
        element = document.getElementById('message-' + message.id);
        notDownloadedMessage = element.querySelector('.not-downloaded-message');
        button = element.querySelector('button');
      });
      test('element has correct data-message-id', function() {
        assert.equal(element.dataset.messageId, message.id);
      });
      test('not-downloaded class present', function() {
        assert.isTrue(element.classList.contains('not-downloaded'));
      });
      test('error class present', function() {
        assert.isTrue(element.classList.contains('error'));
      });
      test('expired class absent', function() {
        assert.isFalse(element.classList.contains('expired'));
      });
      test('pending class absent', function() {
        assert.isFalse(element.classList.contains('pending'));
      });
      test('message is correct', function() {
        assert.equal(notDownloadedMessage.textContent,
          'not-downloaded-mms{"date":"date_stub"}');
      });
      test('date is correctly determined', function() {
        assert.equal(Utils.date.format.localeFormat.args[0][0],
          message.expiryDate);
        assert.equal(Utils.date.format.localeFormat.args[0][1],
          'dateTimeFormat_%x');
      });
      test('button text is correct', function() {
        assert.equal(button.textContent, 'download');
      });
      suite('clicking', function() {
        setup(function() {
          ThreadUI.handleMessageClick({
            target: button
          });
        });
        test('changes download text', function() {
          assert.equal(button.textContent, 'downloading');
        });
        test('error class absent', function() {
          assert.isFalse(element.classList.contains('error'));
        });
        test('pending class present', function() {
          assert.isTrue(element.classList.contains('pending'));
        });
        test('click calls retrieveMMS', function() {
          assert.isTrue(MessageManager.retrieveMMS.calledWith(message.id));
        });
        suite('response error', function() {
          setup(function() {
            MessageManager.retrieveMMS.returnValues[0].onerror();
          });
          test('error class present', function() {
            assert.isTrue(element.classList.contains('error'));
          });
          test('pending class absent', function() {
            assert.isFalse(element.classList.contains('pending'));
          });
          test('changes download text', function() {
            assert.equal(button.textContent, 'download');
          });
        });
        suite('response success', function() {
          setup(function() {
            MessageManager.retrieveMMS.returnValues[0].onsuccess();
          });
          // re-rendering message happens from a status handler
          test('removes message', function() {
            assert.equal(element.parentNode, null);
          });
        });
      });
    });

    suite('expired message', function() {
      var message = testMessages[3];
      var element;
      var element;
      var notDownloadedMessage;
      var button;
      setup(function() {
        ThreadUI.appendMessage(message);
        element = document.getElementById('message-' + message.id);
        notDownloadedMessage = element.querySelector('.not-downloaded-message');
        button = element.querySelector('button');
      });
      test('element has correct data-message-id', function() {
        assert.equal(element.dataset.messageId, message.id);
      });
      test('not-downloaded class present', function() {
        assert.isTrue(element.classList.contains('not-downloaded'));
      });
      test('error class present', function() {
        assert.isTrue(element.classList.contains('error'));
      });
      test('expired class present', function() {
        assert.isTrue(element.classList.contains('expired'));
      });
      test('pending class absent', function() {
        assert.isFalse(element.classList.contains('pending'));
      });
      test('message is correct', function() {
        assert.equal(notDownloadedMessage.textContent,
          'expired-mms{"date":"date_stub"}');
      });
      test('date is correctly determined', function() {
        assert.equal(Utils.date.format.localeFormat.args[0][0],
          message.expiryDate);
        assert.equal(Utils.date.format.localeFormat.args[0][1],
          'dateTimeFormat_%x');
      });
      suite('clicking', function() {
        setup(function() {
          ThreadUI.handleMessageClick({
            target: button
          });
        });
        test('does not call retrieveMMS', function() {
          assert.equal(MessageManager.retrieveMMS.args.length, 0);
        });
      });
    });
  });

  suite('resendMessage', function() {
    setup(function() {
      this.receivers = ['1234'];
      this.targetMsg = {
        id: 23,
        type: 'sms',
        receivers: this.receivers,
        body: 'This is a test',
        delivery: 'error',
        timestamp: new Date()
      };
      this.otherMsg = {
        id: 45,
        type: 'sms',
        receivers: this.receivers,
        body: 'this test',
        delivery: 'error',
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
      sinon.stub(MessageManager, 'resendMessage');
    });
    teardown(function() {
      MessageManager.getMessage.restore();
      MessageManager.deleteMessage.restore();
      MessageManager.resendMessage.restore();
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

    test('invokes MessageManager.resendMessage', function() {
      ThreadUI.resendMessage(23);

      this.getMessageReq.result = this.targetMsg;
      this.getMessageReq.onsuccess();

      assert.deepEqual(MessageManager.resendMessage.args[0],
        [this.targetMsg]);
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
    test('clicking on "pack-end" aside in an error message' +
      'triggers a confirmation dialog',
      function() {
      this.elems.errorMsg.querySelector('.pack-end').click();
      assert.equal(window.confirm.callCount, 1);
    });
    test('clicking on p element in an error message' +
      'does not triggers a confirmation  dialog',
      function() {
      this.elems.errorMsg.querySelector('.bubble p').click();
      assert.equal(window.confirm.callCount, 0);
    });
    test('clicking on an error message does not trigger a confirmation dialog',
      function() {
      this.elems.errorMsg.click();
      assert.equal(window.confirm.callCount, 0);
    });
    test('clicking on "pack-end" aside in an error message and accepting the ' +
      'confirmation dialog triggers a message re-send operation', function() {
      window.confirm.returns(true);
      this.elems.errorMsg.querySelector('.pack-end').click();
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
    suite('generated html', function() {

      test('text content', function() {
        var inputArray = [{
          text: 'part 1'
        }, {
          text: 'part 2'
        }];
        var output = ThreadUI.createMmsContent(inputArray);

        assert.equal(output.childNodes.length, 2);
        assert.equal(output.childNodes[0].innerHTML, 'part 1');
        assert.equal(output.childNodes[1].innerHTML, 'part 2');
      });

      test('blob content', function() {
        var inputArray = [{
          name: 'imageTest.jpg',
          blob: testImageBlob
        }, {
          name: 'imageTest.jpg',
          blob: testImageBlob
        }];
        var output = ThreadUI.createMmsContent(inputArray);

        assert.equal(output.childNodes.length, 2);
        assert.match(output.childNodes[0].nodeName, /iframe/i);
        assert.match(output.childNodes[1].nodeName, /iframe/i);
      });

      test('mixed content', function() {
        var inputArray = [{
          text: 'text',
          name: 'imageTest.jpg',
          blob: testImageBlob
        }];
        var output = ThreadUI.createMmsContent(inputArray);

        assert.equal(output.childNodes.length, 2);
        assert.match(output.childNodes[0].nodeName, /iframe/i);
        assert.equal(output.childNodes[1].innerHTML, 'text');
      });
    });

    test('Clicking on an attachment triggers its `view` method', function() {
      var messageContainer;
      // create an image mms DOM Element:
      var inputArray = [{
        name: 'imageTest.jpg',
        blob: testImageBlob
      }];
      var viewSpy = this.sinon.spy(Attachment.prototype, 'view');

      // quick dirty creation of a thread with image:
      var output = ThreadUI.createMmsContent(inputArray);
      var attachmentDOM = output.childNodes[0];

      // need to get a container from ThreadUI because event is delegated
      messageContainer = ThreadUI.getMessageContainer(Date.now(), false);
      messageContainer.appendChild(output);
      this.sinon.stub(ThreadUI, 'handleMessageClick');

      // Start the test: simulate a click event
      attachmentDOM.click();

      assert.equal(viewSpy.callCount, 1);
      assert.ok(viewSpy.calledWith, { allowSave: true });
    });
  });

  suite('Render Contact', function() {

    test('Rendered Contact "givenName familyName"', function() {
      var ul = document.createElement('ul');
      var contact = new MockContact();
      var html;

      ThreadUI.renderContact({
        contact: contact,
        input: 'foo',
        target: ul,
        isContact: true,
        isSuggestion: true
      });
      html = ul.firstElementChild.innerHTML;
      assert.include(html, 'Pepito O\'Hare');
    });

    test('Rendered Contact highlighted "givenName familyName"', function() {
      var ul = document.createElement('ul');
      var contact = new MockContact();
      var html;

      ThreadUI.renderContact({
        contact: contact,
        input: 'Pepito O\'Hare',
        target: ul,
        isContact: true,
        isSuggestion: true
      });
      html = ul.firstElementChild.innerHTML;

      assert.include(html, '<span class="highlight">Pepito</span>');
      assert.include(html, '<span class="highlight">O\'Hare</span>');
    });

    test('Rendered Contact "number"', function() {
      var ul = document.createElement('ul');
      var contact = new MockContact();
      var html;

      contact.tel[0].carrier = null;
      contact.tel[0].type = null;

      ThreadUI.renderContact({
        contact: contact,
        input: 'foo',
        target: ul,
        isContact: true,
        isSuggestion: true
      });
      html = ul.firstElementChild.innerHTML;

      assert.ok(html.contains('+346578888888'));
    });

    test('Rendered Contact highlighted "number"', function() {
      var ul = document.createElement('ul');
      var contact = new MockContact();
      var html;

      contact.tel[0].carrier = null;
      contact.tel[0].type = null;

      ThreadUI.renderContact({
        contact: contact,
        input: '346578888888',
        target: ul,
        isContact: true,
        isSuggestion: true
      });
      html = ul.firstElementChild.innerHTML;

      assert.ok(
        html.contains('+<span class="highlight">346578888888</span>')
      );
    });

    test('Rendered Contact "type | number"', function() {
      var ul = document.createElement('ul');
      var contact = new MockContact();
      var html;

      contact.tel[0].carrier = null;

      ThreadUI.renderContact({
        contact: contact,
        input: 'foo',
        target: ul,
        isContact: true,
        isSuggestion: true
      });
      html = ul.firstElementChild.innerHTML;

      assert.ok(html.contains('Mobile | +346578888888'));
    });

    test('Rendered Contact highlighted "type | number"', function() {
      var ul = document.createElement('ul');
      var contact = new MockContact();
      var html;

      contact.tel[0].carrier = null;

      ThreadUI.renderContact({
        contact: contact,
        input: '346578888888',
        target: ul,
        isContact: true,
        isSuggestion: true
      });
      html = ul.firstElementChild.innerHTML;

      assert.ok(
        html.contains('Mobile | +<span class="highlight">346578888888</span>')
      );
    });

    test('Rendered Contact "type | carrier, number"', function() {
      var ul = document.createElement('ul');
      var contact = new MockContact();
      var html;

      ThreadUI.renderContact({
        contact: contact,
        input: 'foo',
        target: ul,
        isContact: true,
        isSuggestion: true
      });
      html = ul.firstElementChild.innerHTML;

      assert.ok(html.contains('Mobile | TEF, +346578888888'));
    });

    test('Rendered Contact highlighted "type | carrier, number"', function() {
      var ul = document.createElement('ul');
      var contact = new MockContact();
      var html;

      ThreadUI.renderContact({
        contact: contact,
        input: '346578888888',
        target: ul,
        isContact: true,
        isSuggestion: true
      });
      html = ul.firstElementChild.innerHTML;

      assert.ok(
        html.contains(
          'Mobile | TEF, +<span class="highlight">346578888888</span>'
        )
      );
    });

    test('Rendered Contact w/ multiple: one', function() {
      var target = document.createElement('ul');

      ThreadUI.renderContact({
        contact: MockContact(),
        input: '+12125559999',
        target: target,
        isContact: true,
        isSuggestion: false
      });

      assert.equal(target.children.length, 1);
    });

    test('Rendered Contact w/ multiple: one w/ minimal match', function() {
      var target = document.createElement('ul');

      ThreadUI.renderContact({
        contact: MockContact(),
        input: '5559999',
        target: target,
        isContact: true,
        isSuggestion: false
      });

      assert.equal(target.children.length, 1);
    });

    test('Rendered Contact w/ multiple: all (isSuggestion)', function() {
      var target = document.createElement('ul');

      ThreadUI.renderContact({
        contact: MockContact(),
        input: '+12125559999',
        target: target,
        isContact: true,
        isSuggestion: true
      });

      assert.equal(target.children.length, 2);
    });

    test('Rendered Contact omit numbers already in recipient list', function() {
      var ul = document.createElement('ul');
      var contact = new MockContact();
      var html;

      ThreadUI.recipients.add({
        number: '+346578888888'
      });

      // This contact has two tel entries.
      ThreadUI.renderContact({
        contact: contact,
        input: '+346578888888',
        target: ul,
        isContact: true,
        isSuggestion: true
      });

      html = ul.innerHTML;

      assert.ok(!html.contains('346578888888'));
      assert.equal(ul.children.length, 1);
    });
  });

  suite('Header Actions', function() {
    setup(function() {
      window.location.hash = '';
      MockActivityPicker.call.mSetup();
      MockOptionMenu.mSetup();
    });

    teardown(function() {
      Threads.delete(1);
      window.location.hash = '';
      MockActivityPicker.call.mTeardown();
      MockOptionMenu.mTeardown();
    });

    test('Single participant: Contact Options (known)', function() {

      Threads.set(1, {
        participants: ['999']
      });

      window.location.hash = '#thread=1';

      ThreadUI.headerText.dataset.isContact = true;
      ThreadUI.headerText.dataset.number = '999';

      ThreadUI.onHeaderActivation();

      var calls = MockOptionMenu.calls;

      assert.equal(calls.length, 1);
      assert.equal(calls[0].section, '999');
      assert.equal(calls[0].items.length, 3);
      assert.equal(typeof calls[0].complete, 'function');
    });

    test('Single participant: Contact Options (unknown)', function() {

      Threads.set(1, {
        participants: ['777']
      });

      window.location.hash = '#thread=1';

      ThreadUI.headerText.dataset.isContact = false;
      ThreadUI.headerText.dataset.number = '777';

      ThreadUI.onHeaderActivation();

      var calls = MockOptionMenu.calls;

      assert.equal(calls.length, 1);
      assert.equal(calls[0].header, '777');
      assert.equal(calls[0].items.length, 5);
      assert.equal(typeof calls[0].complete, 'function');
    });

    test('Multi participant: DOES NOT Invoke Activities', function() {

      Threads.set(1, {
        participants: ['999', '888']
      });

      window.location.hash = '#thread=1';

      ThreadUI.headerText.dataset.isContact = true;
      ThreadUI.headerText.dataset.number = '999';

      ThreadUI.onHeaderActivation();

      assert.equal(MockActivityPicker.call.called, false);
      assert.equal(MockActivityPicker.call.calledWith, null);
    });

    test('Multi participant: DOES NOT Invoke Options', function() {

      Threads.set(1, {
        participants: ['999', '888']
      });

      window.location.hash = '#thread=1';

      ThreadUI.headerText.dataset.isContact = true;
      ThreadUI.headerText.dataset.number = '999';

      ThreadUI.onHeaderActivation();

      assert.equal(MockOptionMenu.calls.length, 0);
    });

    test('Multi participant: Moves to Group View', function(done) {
      Threads.set(1, {
        participants: ['999', '888']
      });

      // Change to #thread=n
      window.onhashchange = function() {
        // Change to #group-view (per ThreadUI.onHeaderActivation())
        window.onhashchange = function() {
          assert.equal(window.location.hash, '#group-view');
          assert.equal(ThreadUI.headerText.textContent, 'participant{"n":2}');
          window.onhashchange = null;
          done();
        };

        ThreadUI.onHeaderActivation();
        ThreadUI.groupView();
      };

      window.location.hash = '#thread=1';
    });

    test('Multi participant: Correctly Displayed', function() {
      var contacts = {
        a: new MockContact(),
        b: new MockContact()
      };

      // Truncate the tel record arrays; there should
      // only be one when renderContact does its
      // loop and comparison of dialiables
      contacts.a.tel.length = 1;
      contacts.b.tel.length = 1;

      // Set to our "participants"
      contacts.a.tel[0].value = '999';
      contacts.b.tel[0].value = '888';

      // "input" value represents the participant entry value
      // that would be provided in ThreadUI.groupView()
      ThreadUI.renderContact({
        contact: contacts.a,
        input: '999',
        target: ThreadUI.participantsList,
        isContact: true,
        isSuggestion: false
      });

      ThreadUI.renderContact({
        contact: contacts.b,
        input: '888',
        target: ThreadUI.participantsList,
        isContact: true,
        isSuggestion: false
      });

      assert.equal(
        ThreadUI.participantsList.children.length, 2
      );
    });

    test('Multi participant: Reset Group View', function() {
      var list = ThreadUI.participants.firstElementChild;

      assert.equal(list.children.length, 0);

      list.innerHTML = '<li></li><li></li><li></li>';

      assert.equal(list.children.length, 3);

      ThreadUI.groupView.reset();

      assert.equal(list.children.length, 0);
    });
  });

  suite('Sending Behavior (onSendClick)', function() {
    var realComposeisEmpty;
    var realMessageManager;
    var realEnableSend;

    suiteSetup(function() {
      realEnableSend = ThreadUI.enableSend;
      realComposeisEmpty = Compose.isEmpty;
      realMessageManager = MessageManager;

      ThreadUI.enableSend = function() {
        ThreadUI.sendButton.disabled = false;
      };

      Compose.isEmpty = function() {
        return false;
      };

      MessageManager = {
        activity: {
          recipients: []
        }
      };

      ['sendMMS', 'sendSMS'].forEach(function(prop) {
        MessageManager[prop] = function() {
          MessageManager[prop].called = true;
          MessageManager[prop].calledWith = [].slice.call(arguments);
        };

        MessageManager[prop].mSetup = function() {
          MessageManager[prop].called = false;
          MessageManager[prop].calledWith = null;
        };

        MessageManager[prop].mTeardown = function() {
          delete MessageManager[prop].called;
          delete MessageManager[prop].calledWith;
        };
      });

      MessageManager = MessageManager;
    });

    suiteTeardown(function() {
      ThreadUI.enableSend = realEnableSend;
      Compose.isEmpty = realComposeisEmpty;
      MessageManager = realMessageManager;
    });

    setup(function() {
      window.location.hash = '#new';
      MessageManager.sendMMS.mSetup();
      MessageManager.sendSMS.mSetup();
    });

    teardown(function() {
      MessageManager.sendMMS.mTeardown();
      MessageManager.sendSMS.mTeardown();
    });


    test('SMS, 1 Recipient, stays in view', function() {
      ThreadUI.recipients.add({
        number: '999'
      });

      Compose.append('foo');

      ThreadUI.onSendClick();

      assert.ok(MessageManager.sendSMS.called);
      assert.deepEqual(
        MessageManager.sendSMS.calledWith,
        [['999'], 'foo']
      );
      assert.equal(window.location.hash, '#new');
    });

    test('MMS, 1 Recipient, stays in view', function() {
      ThreadUI.recipients.add({
        number: '999'
      });

      Compose.append(mockAttachment(512));

      ThreadUI.onSendClick();

      assert.ok(MessageManager.sendMMS.called);
      assert.deepEqual(MessageManager.sendMMS.calledWith[0], ['999']);
      assert.equal(window.location.hash, '#new');
    });

    test('SMS, >1 Recipient, moves to thread list', function(done) {

      ThreadUI.recipients.add({
        number: '999'
      });
      ThreadUI.recipients.add({
        number: '888'
      });

      Compose.append('foo');

      window.onhashchange = function() {
        assert.equal(window.location.hash, '#thread-list');
        window.onhashchange = null;
        done();
      };

      ThreadUI.onSendClick();

      assert.ok(MessageManager.sendSMS.called);
      assert.deepEqual(
        MessageManager.sendSMS.calledWith,
        [['999', '888'], 'foo']
      );
    });

    test('MMS, >1 Recipient, stays in view', function() {
      ThreadUI.recipients.add({
        number: '999'
      });
      ThreadUI.recipients.add({
        number: '888'
      });

      Compose.append(mockAttachment(512));

      ThreadUI.onSendClick();

      assert.ok(MessageManager.sendMMS.called);
      assert.deepEqual(MessageManager.sendMMS.calledWith[0], ['999', '888']);
      assert.equal(window.location.hash, '#new');
    });
  });

});
