/*global mocha, MocksHelper, MockAttachment, MockL10n, loadBodyHTML, ThreadUI,
         MockNavigatormozMobileMessage, Contacts, Compose, MockErrorDialog,
         Template, MockSMIL, Utils, MessageManager, LinkActionHandler,
         LinkHelper, Attachment, MockContact, MockOptionMenu,
         MockActivityPicker, Threads, Settings, MockMessages, MockUtils,
         MockContacts, ActivityHandler, Recipients, MockMozActivity,
         ThreadListUI, ContactRenderer, UIEvent, Drafts, OptionMenu,
         ActivityPicker, KeyEvent, MockNavigatorSettings, Draft */

'use strict';

mocha.setup({ globals: ['alert'] });

// For Desktop testing
if (!navigator.mozContacts) {
  requireApp('sms/js/desktop_contact_mock.js');
}

requireApp('sms/js/compose.js');
requireApp('sms/js/drafts.js');
requireApp('sms/js/threads.js');
requireApp('sms/js/thread_ui.js');
requireApp('sms/js/thread_list_ui.js');
requireApp('sms/js/fixed_header.js');
requireApp('sms/js/utils.js');
requireApp('sms/js/message_manager.js');
require('/shared/js/async_storage.js');

requireApp('sms/test/unit/mock_time_headers.js');
requireApp('sms/test/unit/mock_alert.js');
requireApp('sms/test/unit/mock_link_action_handler.js');
requireApp('sms/test/unit/mock_attachment.js');
requireApp('sms/test/unit/mock_attachment_menu.js');
requireApp('sms/test/unit/mock_l10n.js');
requireApp('sms/test/unit/mock_utils.js');
requireApp('sms/test/unit/mock_navigatormoz_sms.js');
requireApp('sms/test/unit/mock_moz_sms_filter.js');
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
requireApp('sms/test/unit/mock_dialog.js');
requireApp('sms/test/unit/mock_smil.js');
requireApp('sms/test/unit/mock_custom_dialog.js');
requireApp('sms/test/unit/mock_url.js');
requireApp('sms/test/unit/mock_compose.js');
requireApp('sms/test/unit/mock_activity_handler.js');
requireApp('sms/test/unit/mock_information.js');
require('/test/unit/mock_contact_renderer.js');

var mocksHelperForThreadUI = new MocksHelper([
  'Attachment',
  'AttachmentMenu',
  'Utils',
  'Settings',
  'Recipients',
  'LinkActionHandler',
  'LinkHelper',
  'MozActivity',
  'MozSmsFilter',
  'ActivityPicker',
  'OptionMenu',
  'Dialog',
  'ErrorDialog',
  'Contacts',
  'SMIL',
  'ActivityHandler',
  'TimeHeaders',
  'ContactRenderer',
  'Information'
]);

mocksHelperForThreadUI.init();

suite('thread_ui.js >', function() {
  var input;
  var subject;
  var container;
  var sendButton;
  var composeForm;
  var recipientsList;

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

  function dispatchScrollEvent(elt) {
    var event = new UIEvent('scroll', {
      view: window,
      detail: 0
    });
    elt.dispatchEvent(event);
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

    input = document.getElementById('messages-input');
    subject = document.getElementById('messages-subject-input');
    container = document.getElementById('messages-container');
    sendButton = document.getElementById('messages-send-button');
    composeForm = document.getElementById('messages-compose-form');
    recipientsList = document.getElementById('messages-recipients-list');

    this.sinon.useFakeTimers();

    ThreadUI.recipients = null;
    ThreadUI.init();
    ThreadListUI.init();
    realMozMobileMessage = ThreadUI._mozMobileMessage;
    ThreadUI._mozMobileMessage = MockNavigatormozMobileMessage;
  });

  teardown(function() {
    document.body.innerHTML = '';

    MockNavigatormozMobileMessage.mTeardown();
    mocksHelper.teardown();
    ThreadUI._mozMobileMessage = realMozMobileMessage;
  });

  suite('scrolling', function() {
    teardown(function() {
      container.innerHTML = '';
    });
    setup(function() {
      // we don't have CSS so we must force the scroll here
      container.style.overflow = 'scroll';
      container.style.height = '50px';
      // fake content
      var innerHTML = '';
      for (var i = 0; i < 99; i++) {
        innerHTML += ThreadUI.tmpl.message.interpolate({
          id: String(i),
          bodyHTML: 'test #' + i
        });
      }
      container.innerHTML = innerHTML;
      // This crudely emulates the CSS styles applied to the message list
      container.lastElementChild.style.paddingBottom = '16px';
    });

    test('scroll 100px, should be detected as a manual scroll', function() {
      container.scrollTop = 100;

      dispatchScrollEvent(container);

      assert.ok(ThreadUI.isScrolledManually);
    });

    suite('when adding a line in the composer >', function() {
      setup(function() {
        this.sinon.spy(HTMLElement.prototype, 'scrollIntoView');
      });

      test('when scrolled up, should not scroll', function() {
        container.scrollTop = 100;
        dispatchScrollEvent(container);

        // scrolledManually is true (see above)
        Compose.append('\n');

        sinon.assert.notCalled(HTMLElement.prototype.scrollIntoView);
      });

      test('when scrolled to the bottom, should scroll', function() {
        container.scrollTop = container.scrollTopMax;
        dispatchScrollEvent(container);

        // scrolledManually is false (see above)
        Compose.append('\n');

        sinon.assert.calledOn(
          HTMLElement.prototype.scrollIntoView,
          container.lastElementChild
        );
      });
    });

    test('scroll to bottom, should be detected as an automatic scroll',
    function() {
      ThreadUI.isScrolledManually = false;
      ThreadUI.scrollViewToBottom();

      dispatchScrollEvent(container);

      assert.isFalse(ThreadUI.isScrolledManually);
      assert.ok((container.scrollTop + container.clientHeight) ==
                container.scrollHeight);
    });
  });

  suite('Search', function() {
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

    test('composer cleared', function() {
      Compose.append('foo');
      subject.value = 'foo';
      ThreadUI.cleanFields(true);
      assert.equal(Compose.getContent(), '');
      assert.equal(Compose.getSubject(), '');
    });

    suite('rendering suggestions list', function() {
      setup(function() {
        this.sinon.spy(ContactRenderer.prototype, 'render');
        ThreadUI.recipients.add({
          number: '888'
        });

        var placeholder = document.createElement('span');
        placeholder.setAttribute('contenteditable', 'true');
        placeholder.isPlaceholder = true;
        placeholder.textContent = '999';
        recipientsList.appendChild(placeholder);

        ThreadUI.recipients.inputValue = '999';

        placeholder.dispatchEvent(new CustomEvent('input', { bubbles: true }));
      });

      test('does display found contacts', function() {
        sinon.assert.calledWithMatch(ContactRenderer.prototype.render, {
          input: '999',
          target: container.querySelector('ul.contact-list')
        });
      });

      test('does not display entered recipients', function() {
        sinon.assert.calledWithMatch(ContactRenderer.prototype.render, {
          skip: ['888']
        });
      });
    });
  });

  suite('enableSend() >', function() {
    setup(function() {
      Compose.clear();
      ThreadUI.updateCounter();
      window.location.hash = '#thread-1';
    });

    teardown(function() {
      Compose.clear();
      window.location.hash = '';
    });

    suite('In #thread view, button should be...', function() {
      setup(function() {
        window.location.hash = '#thread-1';
        Compose.clear();
      });

      teardown(function() {
        window.location.hash = '';
      });

      test('disabled at the beginning', function() {
        assert.isTrue(sendButton.disabled);
      });

      test('enabled when there is message input', function() {
        Compose.append('Hola');
        assert.isFalse(sendButton.disabled);
      });

      test('enabled when there is subject input and is visible', function() {
        subject.value = 'Title';
        Compose.toggleSubject(); // show the subject
        subject.dispatchEvent(new CustomEvent('input'));
        assert.isFalse(sendButton.disabled);
      });

      test('disabled when there is subject input, but is hidden', function() {
        subject.value = 'Title';
        subject.dispatchEvent(new CustomEvent('input'));
        assert.isTrue(sendButton.disabled);
      });

      test('enabled when there is message input, but too many segments',
        function() {

        Compose.append('Hola');
        this.sinon.clock.tick(ThreadUI.UPDATE_DELAY);

        var segmentInfo = {
          segments: 11,
          charsAvailableInLastSegment: 10
        };
        MockNavigatormozMobileMessage.mTriggerSegmentInfoSuccess(segmentInfo);

        assert.isFalse(sendButton.disabled);
      });
    });


    suite('In #new view, button should be...', function() {
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

      suite('enabled', function() {

        suite('when there is message input...', function() {
          setup(function() {
            Compose.append('Hola');
          });
          teardown(function() {
            Compose.clear();
          });

          test('and recipient field value is valid ', function() {
            ThreadUI.recipients.inputValue = '999';

            // Call directly since no input event will be triggered
            ThreadUI.enableSend();
            assert.isFalse(sendButton.disabled);
          });

          test('after adding a valid recipient ', function() {
            ThreadUI.recipients.add({
              number: '999'
            });

            assert.isFalse(sendButton.disabled);
          });

          test('after adding valid & questionable recipients ', function() {
            ThreadUI.recipients.add({
              number: 'foo',
              isQuestionable: true
            });

            ThreadUI.recipients.add({
              number: '999'
            });

            assert.isFalse(sendButton.disabled);
          });
        });

        suite('when there is visible subject with input...', function() {
          setup(function() {
            subject.value = 'Title';
            Compose.toggleSubject();
          });

          teardown(function() {
            Compose.clear();
          });

          test('and recipient field value is valid ', function() {
            ThreadUI.recipients.inputValue = '999';

            // Call directly since no input event will be triggered
            ThreadUI.enableSend();
            assert.isFalse(sendButton.disabled);
          });

          test('after adding a valid recipient ', function() {
            ThreadUI.recipients.add({
              number: '999'
            });

            assert.isFalse(sendButton.disabled);
          });

          test('after adding valid & questionable recipients ', function() {
            ThreadUI.recipients.add({
              number: 'foo',
              isQuestionable: true
            });

            ThreadUI.recipients.add({
              number: '999'
            });

            assert.isFalse(sendButton.disabled);
          });
        });

        suite('when a valid recipient exists...', function() {
          setup(function() {
            ThreadUI.recipients.add({
              number: '999'
            });
          });
          teardown(function() {
            Compose.clear();
          });
          test('after adding message input ', function() {
            Compose.append('Hola');
            assert.isFalse(sendButton.disabled);
          });

          test('after adding subject input', function() {
            Compose.toggleSubject();
            subject.value = 'Title';
            subject.dispatchEvent(new CustomEvent('input'));
            assert.isFalse(sendButton.disabled);
          });

          test('after appending image within size limits ', function() {
            Compose.append(mockImgAttachment());
            assert.isFalse(sendButton.disabled);
          });
        });
      });

      suite('disabled', function() {

        test('when there is no message input, subject or recipient',
          function() {
          assert.isTrue(sendButton.disabled);
        });

        test('when message is over data limit ', function() {
          ThreadUI.recipients.add({
            number: '999'
          });

          Compose.append(mockAttachment(300 * 1024));

          assert.isFalse(sendButton.disabled);
          Compose.append('Hola');

          assert.isTrue(sendButton.disabled);
        });

        suite('when there is message input...', function() {
          setup(function() {
            Compose.append('Hola');
          });

          teardown(function() {
            Compose.clear();
          });

          test('there is no recipient ', function() {
            assert.isTrue(sendButton.disabled);
          });

          test('recipient field value is questionable ', function() {
            ThreadUI.recipients.inputValue = 'a';

            // Call directly since no input event will be triggered
            ThreadUI.enableSend();
            assert.isTrue(sendButton.disabled);
          });

          test('after adding a questionable recipient ', function() {
            ThreadUI.recipients.add({
              number: 'foo',
              isQuestionable: true
            });

            assert.isFalse(sendButton.disabled);
          });
        });

        suite('when there is subject input...', function() {
          setup(function() {
            sendButton.disabled = false;
            subject.value = 'Title';
            subject.dispatchEvent(new CustomEvent('input'));
          });

          teardown(function() {
            Compose.clear();
          });

          test('there is no recipient ', function() {
            assert.isTrue(sendButton.disabled);
          });

          test('recipient field value is questionable ', function() {
            ThreadUI.recipients.inputValue = 'a';

            // Call directly since no input event will be triggered
            ThreadUI.enableSend();
            assert.isTrue(sendButton.disabled);
          });

          test('after adding a questionable recipient ', function() {
            ThreadUI.recipients.add({
              number: 'foo',
              isQuestionable: true
            });

            assert.isTrue(sendButton.disabled);
          });

          test('there is recipient, but subject field is hidden', function() {
            ThreadUI.recipients.add({
              number: '999'
            });

            assert.isTrue(sendButton.disabled);
          });
        });

        suite('when a valid recipient exists...', function() {
          test('there is no message input ', function() {

            ThreadUI.recipients.add({
              number: 'foo'
            });

            assert.isTrue(sendButton.disabled);
          });
        });
      });

      test('disabled while resizing oversized image and ' +
        'enabled when resize complete ',
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
        }
        Compose.on('input', onInput);
        Compose.append(mockImgAttachment(true));
        assert.isTrue(sendButton.disabled);
      });
    });
  });

  suite('updateCounter() >', function() {
    var banner, convertBanner, shouldEnableSend, form, localize;

    setup(function() {
      banner = document.getElementById('messages-max-length-notice');
      convertBanner = document.getElementById('messages-convert-notice');
      form = document.getElementById('messages-compose-form');
      localize = this.sinon.spy(navigator.mozL10n, 'localize');

      // let any update timeout play so that we don't have false errors
      this.sinon.clock.tick(ThreadUI.UPDATE_DELAY);

      // and reset any previous possible state
      MockNavigatormozMobileMessage.mTeardown();
    });

    function updateCounter(segmentInfo) {
      /*jshint validthis: true */
      // display the banner to check that it is correctly hidden
      banner.classList.remove('hide');

      // add a lock to check that it is correctly removed
      Compose.lock = true;

      shouldEnableSend = ThreadUI.updateCounter();
      this.sinon.clock.tick(ThreadUI.UPDATE_DELAY);
      MockNavigatormozMobileMessage.mTriggerSegmentInfoSuccess(segmentInfo);
    }

    var initialText = 'some text';
    var followingText = 'some other text';

    test('do not call getSegmentInfoForText twice in a row', function() {
      var spy = this.sinon.spy(MockNavigatormozMobileMessage,
        'getSegmentInfoForText');

      Compose.append(initialText);
      this.sinon.clock.tick(ThreadUI.UPDATE_DELAY / 2);
      Compose.append(followingText);
      this.sinon.clock.tick(ThreadUI.UPDATE_DELAY);

      assert.equal(spy.callCount, 1);
      assert.ok(spy.calledWith(initialText + followingText));
    });

    test('getSegmentInfoForText error hides the counter', function() {
      sendButton.classList.add('has-counter');
      Compose.append(initialText);
      this.sinon.clock.tick(ThreadUI.UPDATE_DELAY);
      MockNavigatormozMobileMessage.mTriggerSegmentInfoError();

      assert.isFalse(sendButton.classList.contains('has-counter'));
    });

    suite('asynchronous tricky tests >', function() {
      var spy;

      var segmentInfo1 = {
        segments: 1,
        charsAvailableInLastSegment: 50
      };

      var segmentInfo2 = {
        segments: 1,
        charsAvailableInLastSegment: 40
      };

      setup(function() {
        spy = this.sinon.spy(MockNavigatormozMobileMessage,
          'getSegmentInfoForText');

        Compose.append(initialText);
        this.sinon.clock.tick(ThreadUI.UPDATE_DELAY);

        // the user appends more text before the segment info request returns
        Compose.append(followingText);

        // wait for the next update delay => should fire
        this.sinon.clock.tick(ThreadUI.UPDATE_DELAY);

      });

      teardown(function() {
        Compose.clear();
      });

      test('getSegmentInfoForText got called twice', function() {
        assert.equal(spy.callCount, 2);
        assert.ok(spy.getCall(0).calledWith(initialText));
        assert.ok(spy.getCall(1).calledWith(initialText + followingText));
      });

      test('segment info requests return ordered', function() {
        // answer the first request
        MockNavigatormozMobileMessage.mTriggerSegmentInfoSuccess(
          segmentInfo1, 0
        );

        // answer the second request
        MockNavigatormozMobileMessage.mTriggerSegmentInfoSuccess(
          segmentInfo2, 0
        );

        var subject = sendButton.dataset.counter;
        var expected = segmentInfo2.charsAvailableInLastSegment + '/' +
          segmentInfo2.segments;

        assert.equal(subject, expected);
      });

      test('2 segment info requests return unordered', function() {
        // answer the last request
        // the index argument is not necessary here but it's esaier to read
        MockNavigatormozMobileMessage.mTriggerSegmentInfoSuccess(
          segmentInfo2, 1
        );

        // then answer the first request
        MockNavigatormozMobileMessage.mTriggerSegmentInfoSuccess(
          segmentInfo1, 0
        );

        var subject = sendButton.dataset.counter;
        var expected = segmentInfo1.charsAvailableInLastSegment + '/' +
          segmentInfo1.segments;

        // note: this is wrong, but this won't happen in real life
        assert.equal(subject, expected);
      });
    });

    suite('type changed after the first segment info request >', function() {
      setup(function() {
        Compose.type = 'sms';

        ThreadUI.updateCounter();
        this.sinon.clock.tick(ThreadUI.UPDATE_DELAY);

        // change type to MMS
        Compose.type = 'mms';

        // no characters were entered in the first call
        var segmentInfo = {
          segments: 0,
          charsAvailableInLastSegment: 0
        };
        MockNavigatormozMobileMessage.mTriggerSegmentInfoSuccess(segmentInfo);
      });

      teardown(function() {
        Compose.type = 'sms';
      });

      test('should not change the segment info', function() {
        assert.ok(sendButton.classList.contains('has-counter'));
      });
    });

    suite('no characters entered >', function() {
      setup(function() {
        var segmentInfo = {
          segments: 0,
          charsAvailableInLastSegment: 0
        };

        updateCounter.call(this, segmentInfo);
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
        var segmentInfo = {
          segments: 1,
          charsAvailableInLastSegment: 25
        };

        updateCounter.call(this, segmentInfo);
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

    suite('in first segment, less than 20 chars left >', function() {
      var segment = 1,
          availableChars = 20;

      setup(function() {
        var segmentInfo = {
          segments: segment,
          charsAvailableInLastSegment: availableChars
        };
        updateCounter.call(this, segmentInfo);
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
        var segmentInfo = {
          segments: segment,
          charsAvailableInLastSegment: availableChars
        };
        updateCounter.call(this, segmentInfo);
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
        var segmentInfo = {
          segments: segment,
          charsAvailableInLastSegment: availableChars
        };
        updateCounter.call(this, segmentInfo);
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
        var segmentInfo = {
          segments: segment,
          charsAvailableInLastSegment: availableChars
        };
        updateCounter.call(this, segmentInfo);
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
      var segmentInfo = {
        segments: 11,
        charsAvailableInLastSegment: 25
      };

      setup(function() {
        updateCounter.call(this, segmentInfo);
      });

      test('message type is mms', function() {
        assert.equal(form.dataset.messageType, 'mms');
      });

      test('lock is disabled', function() {
        assert.isFalse(Compose.lock);
      });

      suite('trying to move back to sms >', function() {
        setup(function() {
          // waiting some seconds so that the existing possible banner is hidden
          this.sinon.clock.tick(5000);
          this.sinon.spy(MockNavigatormozMobileMessage,
            'getSegmentInfoForText');
          Compose.type = 'sms';
          MockNavigatormozMobileMessage.mTriggerSegmentInfoSuccess(segmentInfo);
        });

        test('getSegmentInfoForText was called', function() {
          assert.ok(MockNavigatormozMobileMessage.getSegmentInfoForText.called);
        });

        test('message type is still mms', function() {
          assert.equal(Compose.type, 'mms');
          assert.equal(form.dataset.messageType, 'mms');
        });

        test('the convertion notice is not displayed', function() {
          assert.ok(convertBanner.classList.contains('hide'));
        });
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

      test('banner localized', function() {
        assert.ok(
          localize.calledWith(banner.querySelector('p'),
            'messages-max-length-text')
        );
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

      test('banner localized', function() {
        assert.ok(
          localize.calledWith(banner.querySelector('p'),
            'messages-exceeded-length-text')
        );
      });

      test('message type is mms', function() {
        assert.equal(form.dataset.messageType, 'mms');
      });

      test('lock is enabled', function() {
        assert.isTrue(Compose.lock);
      });
    });
  });

  suite('Subject', function() {

    suite('Max Length banner', function() {
      var banner,
          localize,
          subject;

      setup(function() {
        banner = document.getElementById('messages-max-length-notice');
        subject = document.getElementById('messages-subject-input');
        localize = this.sinon.spy(navigator.mozL10n, 'localize');
        Compose.toggleSubject();
      });

      teardown(function() {
        banner.classList.add('hide');
        Compose.clear();
      });

      test('should be hidden if limit not reached', function() {
        assert.isTrue(banner.classList.contains('hide'));
      });

      suite('when trying to pass the limit...', function() {
        var clock;
        setup(function() {
          clock = this.sinon.useFakeTimers();
          subject.value = '1234567890123456789012345678901234567890'; // 40 char
          clock.tick(0);
          // Event is launched on keypress
          subject.dispatchEvent(new CustomEvent('keyup'));
        });

        teardown(function() {
          clock.restore();
        });

        test('should create a timeout', function() {
          assert.isFalse(!ThreadUI.timeouts.subjectLengthNotice);
        });

        test('banner should be hidden after an amount of secs.',
          function(done) {
          assert.isFalse(banner.classList.contains('hide'));
          clock.tick(3100);
          assert.isTrue(banner.classList.contains('hide'));
          done();
        });

        test('should be visible', function() {
          assert.isFalse(banner.classList.contains('hide'));
        });

        test('should be localized', function() {
          assert.ok(localize.calledWith(banner.querySelector('p'),
                    'messages-max-subject-length-text'));
        });

        test('should be hidden if focus is away', function() {
          subject.dispatchEvent(new CustomEvent('blur'));
          assert.isTrue(banner.classList.contains('hide'));
        });

        test('should not be visible if focus comes back.', function() {
          subject.dispatchEvent(new CustomEvent('blur'));
          subject.dispatchEvent(new CustomEvent('focus'));
          assert.isTrue(banner.classList.contains('hide'));
        });
      });
    });


    suite('Visibility', function() {
      var event, backspace;

      suiteSetup(function() {
        event = {
          keyCode: KeyEvent.DOM_VK_BACK_SPACE,
          DOM_VK_BACK_SPACE: KeyEvent.DOM_VK_BACK_SPACE
        };

        backspace = function(id) {
          ThreadUI.onSubjectKeydown(event);
          ThreadUI.onSubjectKeyup(event);
        };
      });

      test('<delete> in empty subject hides field', function() {

        // 1. This "tricks" Compose.updateType() into thinking we've
        // entered some text into the subject. This ensures that
        // Compose.type is correctly updated as it would be if
        // the user had actually typed into the field.
        subject.value = 'Howdy!';

        Compose.toggleSubject();

        // 2. Assert the correct state condition updates have occurred,
        // as described in step 1
        assert.isTrue(Compose.isSubjectVisible);
        // Per discussion, this is being deferred to another bug
        // https://bugzilla.mozilla.org/show_bug.cgi?id=959360
        //
        // assert.isTrue(sendButton.classList.contains('has-counter'));
        assert.equal(Compose.type, 'mms');

        // 3. To simulate the user "deleting" the subject,
        // set the value to an empty string.
        subject.value = '';

        // 4. Simulate backspace on the subject field
        backspace();

        // 5. Confirm that the state of the compose
        // area has updated properly.
        assert.isFalse(Compose.isSubjectVisible);
        // Per discussion, this is being deferred to another bug
        // https://bugzilla.mozilla.org/show_bug.cgi?id=959360
        //
        // assert.isFalse(sendButton.classList.contains('has-counter'));
        assert.equal(Compose.type, 'sms');
      });

      test('<delete> in non-empty subject does not hide field', function() {

        // 1. This "tricks" Compose.updateType() into thinking we've
        // entered some text into the subject. This ensures that
        // Compose.type is correctly updated as it would be if
        // the user had actually typed into the field.
        subject.value = 'Howdy!';

        Compose.toggleSubject();

        // 2. Assert the correct state condition updates have occurred,
        // as described in step 1
        assert.isTrue(Compose.isSubjectVisible);

        // 3. Simulate backspace on the subject field
        backspace();

        // 4. Confirm that the state of the compose area not changed.
        assert.isTrue(Compose.isSubjectVisible);
      });

      test('<delete> holding subject does not hide field', function() {

        // 1. This "tricks" Compose.updateType() into thinking we've
        // entered some text into the subject. This ensures that
        // Compose.type is correctly updated as it would be if
        // the user had actually typed into the field.
        subject.value = 'Howdy!';

        Compose.toggleSubject();

        // 2. Assert the correct state condition updates have occurred,
        // as described in step 1
        assert.isTrue(Compose.isSubjectVisible);

        // 3. Simulate holding backspace on the subject field
        for (var i = 0; i < 5; i++) {
          ThreadUI.onSubjectKeydown(event);
        }

        // 4. This is the "release" from a holding state
        ThreadUI.onSubjectKeyup(event);

        // 5. Confirm that the state of the compose area not changed.
        assert.isTrue(Compose.isSubjectVisible);
      });

      test('<delete> holding subject, release and tap hides field', function() {

        // 1. This "tricks" Compose.updateType() into thinking we've
        // entered some text into the subject. This ensures that
        // Compose.type is correctly updated as it would be if
        // the user had actually typed into the field.
        subject.value = 'Howdy!';

        Compose.toggleSubject();

        // 2. Assert the correct state condition updates have occurred,
        // as described in step 1
        assert.isTrue(Compose.isSubjectVisible);

        // 3. Simulate holding backspace on the subject field
        for (var i = 0; i < 5; i++) {
          ThreadUI.onSubjectKeydown(event);
        }

        // 4. This is the "release" from a holding state
        ThreadUI.onSubjectKeyup(event);

        // 5. To simulate the user "deleting" the subject,
        // set the value to an empty string.
        subject.value = '';

        // 6. Simulate backspace on the subject field.
        backspace();

        // 7. Confirm that the state of the compose area not changed.
        assert.isFalse(Compose.isSubjectVisible);
      });
    });
  });

  suite('message type conversion >', function() {
    var convertBanner, convertBannerText, form, localize;
    setup(function() {
      convertBanner = document.getElementById('messages-convert-notice');
      convertBannerText = convertBanner.querySelector('p');
      form = document.getElementById('messages-compose-form');
      localize = this.sinon.spy(navigator.mozL10n, 'localize');
    });
    test('sms to mms and back displays banner', function() {
      // cause a type switch event to happen
      Compose.type = 'mms';
      assert.isTrue(sendButton.classList.contains('has-counter'));
      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is shown for mms');
      assert.equal(composeForm.dataset.messageType, 'mms',
        'the composer has type mms');

      assert.ok(
        localize.calledWith(convertBannerText, 'converted-to-mms'),
        'conversion banner has mms message'
      );
      localize.reset();

      this.sinon.clock.tick(2999);
      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is shown for just shy of 3 seconds');

      this.sinon.clock.tick(1);
      assert.isTrue(convertBanner.classList.contains('hide'),
        'conversion banner is hidden at 3 seconds');

      Compose.type = 'sms';
      this.sinon.clock.tick(ThreadUI.UPDATE_DELAY);
      MockNavigatormozMobileMessage.mTriggerSegmentInfoSuccess();

      assert.isFalse(sendButton.classList.contains('has-counter'));
      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is shown for sms');
      assert.equal(composeForm.dataset.messageType, 'sms',
        'the composer has type sms');
      assert.ok(
        localize.calledWith(convertBannerText, 'converted-to-sms'),
        'conversion banner has sms message'
      );

      this.sinon.clock.tick(2999);
      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is shown for just shy of 3 seconds');

      this.sinon.clock.tick(1);
      assert.isTrue(convertBanner.classList.contains('hide'),
        'conversion banner is hidden at 3 seconds');

    });

    test('character limit from sms to mms and back displays banner',
      function() {
      ThreadUI.updateCounter();
      this.sinon.clock.tick(ThreadUI.UPDATE_DELAY);

      // go over the limit
      var segmentInfo = {
        segments: 11,
        charsAvailableInLastSegment: 0
      };

      MockNavigatormozMobileMessage.mTriggerSegmentInfoSuccess(segmentInfo);

      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is shown for mms');
      assert.equal(composeForm.dataset.messageType, 'mms',
        'the composer has type mms');
      assert.ok(
        localize.calledWith(convertBannerText, 'converted-to-mms'),
        'conversion banner has mms message'
      );
      localize.reset();

      this.sinon.clock.tick(2999);
      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is shown for just shy of 3 seconds');

      this.sinon.clock.tick(1);
      assert.isTrue(convertBanner.classList.contains('hide'),
        'conversion banner is hidden at 3 seconds');

      Compose.clear();
      this.sinon.clock.tick(ThreadUI.UPDATE_DELAY);
      segmentInfo.segments = 0;
      // we have 2 requests, so we trigger twice
      MockNavigatormozMobileMessage.mTriggerSegmentInfoSuccess(segmentInfo);
      MockNavigatormozMobileMessage.mTriggerSegmentInfoSuccess(segmentInfo);

      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is shown for sms');
      assert.equal(composeForm.dataset.messageType, 'sms',
        'the composer has type sms');
      assert.ok(
        localize.calledWith(convertBannerText, 'converted-to-sms'),
        'conversion banner has sms message'
      );
      localize.reset();

      this.sinon.clock.tick(2999);
      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is shown for just shy of 3 seconds');

      this.sinon.clock.tick(1);
      assert.isTrue(convertBanner.classList.contains('hide'),
        'conversion banner is hidden at 3 seconds');

    });

    test('converting from sms to mms and back quickly', function() {
      ThreadUI.updateCounter();
      this.sinon.clock.tick(ThreadUI.UPDATE_DELAY);

      // go over the limit
      var segmentInfo = {
        segments: 11,
        charsAvailableInLastSegment: 0
      };
      MockNavigatormozMobileMessage.mTriggerSegmentInfoSuccess(segmentInfo);

      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is shown for mms');
      assert.ok(
        localize.calledWith(convertBannerText, 'converted-to-mms'),
        'conversion banner has mms message'
      );
      localize.reset();

      this.sinon.clock.tick(1500);
      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is still shown');

      Compose.clear();
      this.sinon.clock.tick(ThreadUI.UPDATE_DELAY);
      segmentInfo.segments = 0;
      // we have 2 requests, so we trigger twice
      MockNavigatormozMobileMessage.mTriggerSegmentInfoSuccess(segmentInfo);
      MockNavigatormozMobileMessage.mTriggerSegmentInfoSuccess(segmentInfo);

      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is shown for sms');
      assert.ok(
        localize.calledWith(convertBannerText, 'converted-to-sms'),
        'conversion banner has sms message'
      );
      localize.reset();

      // long enough to go past the previous timeout 1500 + 2000 > 3000
      this.sinon.clock.tick(2000);
      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is still shown');

      this.sinon.clock.tick(1000);
      assert.isTrue(convertBanner.classList.contains('hide'),
        'conversion banner is hidden at 3 seconds');

    });

    test('we dont display the banner when cleaning fields', function() {

      // let's move to MMS type
      Compose.type = 'mms';

      // and ignore this banner which should be there
      this.sinon.clock.tick(ThreadUI.CONVERTED_MESSAGE_DURATION);

      this.sinon.spy(Compose, 'clear');

      ThreadUI.cleanFields();
      MockNavigatormozMobileMessage.mTriggerSegmentInfoSuccess({
        segments: 0,
        charsAvailableInLastSegment: 0
      });

      assert.isTrue(Compose.clear.called);
      assert.isTrue(convertBanner.classList.contains('hide'));
    });
  });

  suite('Recipient Assimiliation', function() {
    setup(function() {
      this.sinon.spy(ThreadUI, 'validateContact');
      this.sinon.spy(ThreadUI.recipients, 'add');
      this.sinon.spy(ThreadUI.recipients, 'remove');
      this.sinon.spy(ThreadUI.recipients, 'update');
      this.sinon.spy(ThreadUI.recipients, 'visible');
      this.sinon.spy(Utils, 'basicContact');

      Threads.set(1, {
        participants: ['999']
      });
    });

    teardown(function() {
      Threads.delete(1);
      window.location.hash = '';
    });

    suite('Recipients.View.isFocusable', function() {

      setup(function() {
        window.location.hash = '#new';
        Recipients.View.isFocusable = true;
      });

      test('Assimilation revokes Recipients focusability ', function() {
        ThreadUI.assimilateRecipients();
        assert.isFalse(Recipients.View.isFocusable);
      });
    });

    suite('Existing Conversation', function() {

      setup(function() {
        window.location.hash = '#thread=1';
      });

      test('Will not assimilate recipients ', function() {
        ThreadUI.assimilateRecipients();

        sinon.assert.notCalled(ThreadUI.recipients.visible);
        sinon.assert.notCalled(ThreadUI.recipients.add);
      });
    });

    suite('New Conversation', function() {
      var node;

      setup(function() {
        window.location.hash = '#new';

        node = document.createElement('span');
        node.isPlaceholder = true;
        node.textContent = '999';

        ThreadUI.recipientsList.appendChild(node);
      });

      teardown(function() {
        if (ThreadUI.recipientsList.children.length) {
          ThreadUI.recipientsList.removeChild(node);
        }
      });

      suite('Typed number', function() {
        test('Triggers assimilation ', function() {
          var visible;

          ThreadUI.assimilateRecipients();

          visible = ThreadUI.recipients.visible;

          assert.isTrue(visible.called);
          assert.isTrue(visible.firstCall.calledWith('singleline'));
          assert.isTrue(ThreadUI.recipients.add.called);
          assert.isTrue(
            ThreadUI.recipients.add.calledWithMatch({
              name: '999',
              number: '999',
              source: 'manual'
            })
          );
        });
      });

      suite('Typed non-number', function() {
        var realContacts;

        suiteSetup(function() {
          realContacts = window.Contacts;
          window.Contacts = MockContacts;
        });

        suiteTeardown(function() {
          window.Contacts = realContacts;
        });

        setup(function() {
          this.sinon.spy(ThreadUI, 'searchContact');
          this.sinon.spy(ThreadUI, 'exactContact');
        });

        test('Triggers assimilation & silent search ', function() {
          node.textContent = 'foo';
          ThreadUI.assimilateRecipients();

          assert.isTrue(ThreadUI.recipients.add.called);
          assert.isTrue(
            ThreadUI.recipients.add.calledWithMatch({
              name: 'foo',
              number: 'foo',
              source: 'manual'
            })
          );
        });

        test('Matches contact ', function() {
          var record = {
            isQuestionable: true,
            name: 'Jane Doozer',
            number: 'Jane Doozer',
            source: 'manual'
          };

          this.sinon.stub(Contacts, 'findByString').yields(
            MockContact.list([
              { givenName: ['Jane'], familyName: ['Doozer'] }
            ])
          );

          ThreadUI.searchContact(
            record.number, ThreadUI.validateContact.bind(ThreadUI, record)
          );

          assert.isTrue(ThreadUI.recipients.remove.called);
          assert.isTrue(ThreadUI.recipients.add.called);
          assert.isTrue(
            ThreadUI.recipients.add.calledWithMatch({
              name: 'Jane Doozer',
              number: '+346578888888',
              type: 'Mobile',
              carrier: 'TEF, ',
              separator: ' | ',
              source: 'contacts',
              nameHTML: '',
              numberHTML: ''
            })
          );
        });

        test('Does not match contact ', function() {
          // Clear out the existing recipient field fixtures
          ThreadUI.recipients.length = 0;
          ThreadUI.recipientsList.textContent = '';

          var record = {
            isQuestionable: true,
            name: 'Jane Doozer',
            number: 'Jane Doozer',
            source: 'manual'
          };

          this.sinon.stub(Contacts, 'findByString', function(term, callback) {
            callback([]);
          });

          ThreadUI.searchContact(
            record.number, ThreadUI.validateContact.bind(ThreadUI, record)
          );

          sinon.assert.called(ThreadUI.recipients.update);

          record.isInvalid = true;

          sinon.assert.calledWithMatch(ThreadUI.recipients.update, 0, record);
        });

        test('Exact contact ', function() {
          var record = {
            isQuestionable: true,
            name: 'Jane Doozer',
            number: 'Jane Doozer',
            source: 'manual'
          };

          this.sinon.stub(Contacts, 'findExact').yields(
            MockContact.list([
              { givenName: ['Jane'], familyName: ['Doozer'] }
            ])
          );

          ThreadUI.exactContact(
            record.number, ThreadUI.validateContact.bind(ThreadUI, record)
          );

          assert.isTrue(ThreadUI.recipients.remove.called);
          assert.isTrue(ThreadUI.recipients.add.called);
          assert.isTrue(
            ThreadUI.recipients.add.calledWithMatch({
              name: 'Jane Doozer',
              number: '+346578888888',
              type: 'Mobile',
              carrier: 'TEF, ',
              separator: ' | ',
              source: 'contacts',
              nameHTML: '',
              numberHTML: ''
            })
          );
        });

        test('No exact contact ', function() {
          // Clear out the existing recipient field fixtures
          ThreadUI.recipients.length = 0;
          ThreadUI.recipientsList.textContent = '';

          var record = {
            isQuestionable: true,
            name: 'Jane Doozer',
            number: 'Jane Doozer',
            source: 'manual'
          };

          this.sinon.stub(Contacts, 'findExact').yields([], {});

          ThreadUI.exactContact(
            record.number, ThreadUI.validateContact.bind(ThreadUI, record)
          );

          sinon.assert.called(ThreadUI.recipients.update);

          record.isInvalid = true;

          sinon.assert.calledWithMatch(ThreadUI.recipients.update, 0, record);
        });

        test('No exact contact, editting recipient ', function() {
          var record = {
            isQuestionable: true,
            name: 'Jane Doozer',
            number: 'Jane Doozer',
            source: 'manual'
          };

          this.sinon.stub(Contacts, 'findExact', function(term, callback) {
            callback([], {});
          });

          ThreadUI.exactContact(
            record.number, ThreadUI.validateContact.bind(ThreadUI, record)
          );

          assert.isFalse(ThreadUI.recipients.update.called);
        });

        test('Determines correct strategy ', function() {
          var record = {
            isQuestionable: true,
            isLookupable: true,
            name: 'Jane Doozer',
            number: 'Jane Doozer',
            source: 'manual'
          };

          ThreadUI.recipients.add(record);

          record.isLookupable = false;

          ThreadUI.recipients.add(record);

          sinon.assert.calledOnce(ThreadUI.searchContact);
          sinon.assert.calledOnce(ThreadUI.exactContact);
        });
      });
    });

    suite('validateContact', function() {
      var fixture, contacts;

      setup(function() {
        fixture = {
          name: 'Janet Jones',
          number: '+346578888888',
          source: 'manual',
          isInvalid: false
        };

        contacts = MockContact.list([
          { givenName: ['Janet'], familyName: ['Jones'] }
        ]);
      });

      suite('No Recipients', function() {
        test('input value has matching record ', function() {

          ThreadUI.validateContact(fixture, '', contacts);

          sinon.assert.calledOnce(ThreadUI.recipients.remove);
          sinon.assert.calledWith(ThreadUI.recipients.remove, 0);

          assert.equal(
            ThreadUI.recipients.add.firstCall.args[0].source, 'contacts'
          );
          assert.equal(
            ThreadUI.recipients.add.firstCall.args[0].number, '+346578888888'
          );
        });

        test('input value is invalid ', function() {
          // An actual accepted recipient from contacts
          fixture.number = 'foo';
          fixture.isQuestionable = true;

          ThreadUI.recipients.add(fixture);
          assert.isFalse(fixture.isInvalid);

          ThreadUI.recipientsList.lastElementChild.textContent = '';

          ThreadUI.validateContact(fixture, '', []);

          sinon.assert.calledOnce(ThreadUI.recipients.update);
          sinon.assert.calledWithMatch(ThreadUI.recipients.update, 1, fixture);

          assert.isTrue(fixture.isInvalid);
        });
      });

      suite('Has Recipients', function() {


        test('input value has matching duplicate record w/ ' +
              'multiple, different tel records (accept) ', function() {

          // An actual accepted recipient from contacts
          ThreadUI.recipients.add(fixture);

          // The last accepted recipient, manually entered.
          ThreadUI.recipients.add({
            name: 'Janet Jones',
            number: 'Janet Jones',
            source: 'manual'
          });

          ThreadUI.validateContact(fixture, '', contacts);

          sinon.assert.calledOnce(ThreadUI.recipients.remove);
          sinon.assert.calledWith(ThreadUI.recipients.remove, 1);

          assert.equal(
            ThreadUI.recipients.add.lastCall.args[0].source, 'contacts'
          );
          assert.equal(
            ThreadUI.recipients.add.lastCall.args[0].number, '+12125559999'
          );
          assert.equal(
            Utils.basicContact.returnValues[0].number, '+12125559999'
          );
        });

        test('input value has multiple matching records, the ' +
              'first is a duplicate, use next (accept) ', function() {

          contacts = MockContact.list([
            { givenName: ['Janet'], familyName: ['Jones'] },
            { givenName: ['Jane'], familyName: ['Johnson'] }
          ]);

          contacts[0].tel = [{value: '777'}];
          contacts[1].tel = [{value: '888'}];

          // An actual accepted recipient from contacts
          ThreadUI.recipients.add({
            name: 'Janet Jones',
            number: '777',
            source: 'contacts'
          });

          // The last accepted recipient, manually entered.a
          ThreadUI.recipients.add({
            name: 'Jane',
            number: 'Jane',
            source: 'manual'
          });

          ThreadUI.validateContact(fixture, '', contacts);

          // Called from here, then called again for the
          // second contact record.
          sinon.assert.calledTwice(ThreadUI.validateContact);

          sinon.assert.called(ThreadUI.recipients.remove);
          sinon.assert.called(ThreadUI.recipients.add);

          assert.equal(
            ThreadUI.recipients.add.lastCall.args[0].source, 'contacts'
          );
          assert.equal(
            ThreadUI.recipients.add.lastCall.args[0].number, '888'
          );
          assert.equal(
            Utils.basicContact.returnValues[0].number, '888'
          );
        });

        test('input value has matching duplicate record w/ ' +
              'single, same tel record (invalid) ', function() {

          // Get rid of the second tel record to create a "duplicate"
          contacts[0].tel.length = 1;

          // An actual accepted recipient from contacts
          fixture.source = 'contacts';
          ThreadUI.recipients.add(fixture);

          fixture.source = 'manual';
          // The last accepted recipient, manually entered.
          ThreadUI.recipients.add(fixture);

          assert.isFalse(fixture.isInvalid);

          ThreadUI.recipientsList.lastElementChild.textContent = '';
          ThreadUI.validateContact(fixture, '', contacts);

          // ThreadUI.recipients.update is called with the updated
          // source recipient object. This object's isValid property
          // has been set to true.
          sinon.assert.calledOnce(
            ThreadUI.recipients.update
          );
          sinon.assert.calledWithMatch(
            ThreadUI.recipients.update, 1, fixture
          );
          assert.isTrue(fixture.isInvalid);
        });
      });
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

    suite('onDeliverySuccess >', function() {
      teardown(function() {
        this.fakeMessage.type = null;
        this.fakeMessage.delivery = '';
        this.fakeMessage.deliveryStatus = null;
        this.fakeMessage.deliveryInfo = null;
      });
      test('sms delivery success', function() {
        this.fakeMessage.type = 'sms';
        this.fakeMessage.delivery = 'sent';
        this.fakeMessage.deliveryStatus = 'success';
        ThreadUI.onDeliverySuccess(this.fakeMessage);
        assert.isTrue(this.container.classList.contains('delivered'));
      });
      test('mms delivery success', function() {
        this.fakeMessage.type = 'mms';
        this.fakeMessage.delivery = 'sent';
        this.fakeMessage.deliveryInfo = [{
          receiver: null, deliveryStatus: 'success'}];
        ThreadUI.onDeliverySuccess(this.fakeMessage);
        assert.isTrue(this.container.classList.contains('delivered'));
      });
      test('multiple recipients mms delivery success', function() {
        this.fakeMessage.type = 'mms';
        this.fakeMessage.delivery = 'sent';
        this.fakeMessage.deliveryInfo = [
          {receiver: null, deliveryStatus: 'success'},
          {receiver: null, deliveryStatus: 'success'}];
        ThreadUI.onDeliverySuccess(this.fakeMessage);
        assert.isTrue(this.container.classList.contains('delivered'));
      });
      test('not all recipients return mms delivery success', function() {
        this.fakeMessage.type = 'mms';
        this.fakeMessage.delivery = 'sent';
        this.fakeMessage.deliveryInfo = [
          {receiver: null, deliveryStatus: 'success'},
          {receiver: null, deliveryStatus: 'pending'}];
        ThreadUI.onDeliverySuccess(this.fakeMessage);
        assert.isFalse(this.container.classList.contains('delivered'));
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

  suite('getMessageContainer >', function() {
    var lastYear, yesterday, today;
    var fiveMinAgo, elevenMinAgo, oneHourAgo, oneHourFiveMinAgo;

    setup(function() {
      today = new Date(2013, 11, 31, 23, 59);
      this.sinon.clock.restore();
      this.sinon.useFakeTimers(+today);

      lastYear = new Date(2012, 11, 31);
      yesterday = new Date(2013, 11, 30, 12, 0);
      fiveMinAgo = new Date(2013, 11, 31, 23, 54);
      elevenMinAgo = new Date(2013, 11, 31, 23, 48);
      oneHourAgo = new Date(2013, 11, 31, 22, 59);
      oneHourFiveMinAgo = new Date(2013, 11, 31, 22, 54);
    });

    suite('last message block alone today >', function() {
      var subject;

      setup(function() {
        subject = ThreadUI.getMessageContainer(+fiveMinAgo);
      });

      test('has both the date and the time', function() {
        var header = subject.previousElementSibling;
        assert.notEqual(header.dataset.timeOnly, 'true');
      });
    });

    suite('last message block with another block today >', function() {
      var subject;
      setup(function() {
        ThreadUI.getMessageContainer(+elevenMinAgo);
        subject = ThreadUI.getMessageContainer(+fiveMinAgo);
      });

      test('has only the time', function() {
        assert.equal(subject.previousElementSibling.dataset.timeOnly, 'true');
      });
    });

    suite('2 recent messages, different days >', function() {
      var firstContainer, secondContainer;
      setup(function() {
        firstContainer = ThreadUI.getMessageContainer(Date.now());
        // 5 minutes to be next day, would be the same container if same day
        this.sinon.clock.tick(5 * 60 * 1000);

        secondContainer = ThreadUI.getMessageContainer(Date.now());
      });

      test('different containers', function() {
        assert.notEqual(secondContainer, firstContainer);
      });

      test('second container has both the date and the time', function() {
        var secondHeader = secondContainer.previousElementSibling;
        assert.notEqual(secondHeader.dataset.timeOnly, 'true');
      });
    });

    suite('2 recent messages, same day, 15 minutes interval >', function() {
      var firstContainer, secondContainer, firstTimestamp;

      setup(function() {
        this.sinon.clock.tick(15 * 60 * 1000); // 15 minutes to be the next day
        firstContainer = ThreadUI.getMessageContainer(Date.now());
        firstTimestamp = firstContainer.dataset.timestamp;
        this.sinon.clock.tick(15 * 60 * 1000);

        secondContainer = ThreadUI.getMessageContainer(Date.now());
      });

      test('different containers', function() {
        assert.notEqual(secondContainer, firstContainer);
      });

      test('has only the time', function() {
        var secondHeader = secondContainer.previousElementSibling;
        assert.equal(secondHeader.dataset.timeOnly, 'true');
      });

      test('first container has now a start-of-the-day timestamp', function() {
        assert.notEqual(firstContainer.dataset.timestamp, firstTimestamp);
      });
    });

    suite('insert one non-last-message block at the end >', function() {
      var lastYearContainer, yesterdayContainer;

      setup(function() {
        lastYearContainer = ThreadUI.getMessageContainer(+lastYear);
        yesterdayContainer = ThreadUI.getMessageContainer(+yesterday);
      });

      test('should have 2 blocks', function() {
        assert.equal(ThreadUI.container.querySelectorAll('header').length, 2);
        assert.equal(ThreadUI.container.querySelectorAll('ul').length, 2);
      });

      test('should be in the correct order', function() {
        var containers = ThreadUI.container.querySelectorAll('ul');
        var expectedContainers = [
          lastYearContainer,
          yesterdayContainer
        ];

        expectedContainers.forEach(function(container, index) {
          assert.equal(container, containers[index]);
        });
      });
    });

    suite('insert one non-last-message block at the end of a 2-item list >',
      function() {

      var lastYearContainer, yesterdayContainer, twoDaysAgoContainer;

      setup(function() {
        lastYearContainer = ThreadUI.getMessageContainer(+lastYear);
        var twoDaysAgo = new Date(2013, 11, 29);
        twoDaysAgoContainer = ThreadUI.getMessageContainer(+twoDaysAgo);
        yesterdayContainer = ThreadUI.getMessageContainer(+yesterday);
      });

      test('should have 3 blocks', function() {
        assert.equal(ThreadUI.container.querySelectorAll('header').length, 3);
        assert.equal(ThreadUI.container.querySelectorAll('ul').length, 3);
      });

      test('should be in the correct order', function() {
        var containers = ThreadUI.container.querySelectorAll('ul');
        var expectedContainers = [
          lastYearContainer,
          twoDaysAgoContainer,
          yesterdayContainer
        ];

        expectedContainers.forEach(function(container, index) {
          assert.equal(container, containers[index]);
        });
      });
    });

    suite('4 blocks suite >', function() {
      var lastYearContainer, yesterdayContainer;
      var elevenMinContainer, fiveMinContainer;
      var oneHourContainer, oneHourFiveContainer;

      setup(function() {
        yesterdayContainer = ThreadUI.getMessageContainer(+yesterday);
        fiveMinContainer = ThreadUI.getMessageContainer(+fiveMinAgo);
        // this one is asked after the last message block to see if the
        // header are updated
        elevenMinContainer = ThreadUI.getMessageContainer(+elevenMinAgo);
        oneHourContainer = ThreadUI.getMessageContainer(+oneHourAgo);
        oneHourFiveContainer = ThreadUI.getMessageContainer(+oneHourFiveMinAgo);
        // this one requested at the end to check that we correctly put it at
        // the start
        lastYearContainer = ThreadUI.getMessageContainer(+lastYear);
      });

      test('should have 4 blocks', function() {
        assert.equal(ThreadUI.container.querySelectorAll('header').length, 4);
        assert.equal(ThreadUI.container.querySelectorAll('ul').length, 4);
      });

      test('should be in the correct order', function() {
        var containers = ThreadUI.container.querySelectorAll('ul');
        var expectedContainers = [
          lastYearContainer,
          yesterdayContainer,
          elevenMinContainer,
          fiveMinContainer
        ];

        expectedContainers.forEach(function(container, index) {
          assert.equal(container, containers[index]);
        });
      });

      test('some containers are the same', function() {
        assert.equal(oneHourContainer, elevenMinContainer);
        assert.equal(oneHourFiveContainer, elevenMinContainer);
      });

      test('last message block should not show the date', function() {
        // because there is another earlier block the same day
        var header = fiveMinContainer.previousElementSibling;
        assert.equal(header.dataset.timeOnly, 'true');
      });

      test('adding a new message in the last message block', function() {
        var twoMinAgo = new Date(2013, 11, 31, 23, 57);
        var twoMinContainer = ThreadUI.getMessageContainer(+twoMinAgo);
        assert.equal(twoMinContainer, fiveMinContainer);
      });

      suite('adding a new message for yesterday >', function() {
        var container;
        var oldHeaderTimestamp;

        setup(function() {
          var header = yesterdayContainer.previousElementSibling;
          oldHeaderTimestamp = header.dataset.time;

          var yesterdayEarlier = new Date(+yesterday);
          yesterdayEarlier.setHours(5, 5);
          container = ThreadUI.getMessageContainer(+yesterdayEarlier);
        });

        test('still 4 blocks', function() {
          assert.equal(ThreadUI.container.querySelectorAll('header').length, 4);
        });

        test('same container as the existing yesterday container', function() {
          assert.equal(container, yesterdayContainer);
        });

        test('the time header was updated', function() {
          var header = container.previousElementSibling;
          var headerTimestamp = header.dataset.time;
          assert.notEqual(headerTimestamp, oldHeaderTimestamp);
        });
      });
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
        timestamp: Date.now()
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
      this.sinon.spy(Template, 'escape');
      this.sinon.stub(MockSMIL, 'parse');
      this.sinon.spy(ThreadUI.tmpl.message, 'interpolate');
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
      assert.ok(Template.escape.calledWith(payload));
    });

    test('escapes all text for MMS', function() {
      var payload = 'hello <a href="world">world</a>';
      MockSMIL.parse.yields([{ text: payload }]);
      ThreadUI.buildMessageDOM(buildMMS(payload));
      assert.ok(Template.escape.calledWith(payload));
    });

    test('calls template with subject for MMS', function() {
      ThreadUI.buildMessageDOM({
        id: '1',
        subject: 'subject',
        type: 'mms',
        deliveryInfo: [],
        attachments: []
      });
      assert.ok(ThreadUI.tmpl.message.interpolate.calledWith({
        id: '1',
        bodyHTML: '',
        subject: 'subject'
      }));
    });
  });

  suite('renderMessages()', function() {
    setup(function() {
      // todo: use the MessageManager mock instead
      this.sinon.stub(MessageManager, 'getMessages');
      this.sinon.stub(MessageManager, 'markThreadRead');
      ThreadUI.renderMessages(1);
    });

    test('we mark messages as read', function() {
      MessageManager.getMessages.yieldTo('done');
      this.sinon.clock.tick();
      assert.ok(MessageManager.markThreadRead.calledWith(1));
    });
  });

  suite('not-downloaded', function() {
    var localize;
    var ONE_DAY_TIME = 24 * 60 * 60 * 1000;

    function getTestMessage(index) {
      var testMessages = [{
        id: 1,
        threadId: 8,
        sender: '123456',
        type: 'mms',
        delivery: 'not-downloaded',
        deliveryInfo: [{receiver: null, deliveryStatus: 'pending'}],
        subject: 'Pending download',
        timestamp: +new Date(Date.now() - 150000),
        expiryDate: +new Date(Date.now() + ONE_DAY_TIME)
      },
      {
        id: 2,
        threadId: 8,
        sender: '123456',
        type: 'mms',
        delivery: 'not-downloaded',
        deliveryInfo: [{receiver: null, deliveryStatus: 'manual'}],
        subject: 'manual download',
        timestamp: +new Date(Date.now() - 150000),
        expiryDate: +new Date(Date.now() + ONE_DAY_TIME * 2)
      },
      {
        id: 3,
        threadId: 8,
        sender: '123456',
        type: 'mms',
        delivery: 'not-downloaded',
        deliveryInfo: [{receiver: null, deliveryStatus: 'error'}],
        subject: 'error download',
        timestamp: +new Date(Date.now() - 150000),
        expiryDate: +new Date(Date.now() + ONE_DAY_TIME * 2)
      },
      {
        id: 4,
        threadId: 8,
        sender: '123456',
        type: 'mms',
        delivery: 'not-downloaded',
        deliveryInfo: [{receiver: null, deliveryStatus: 'error'}],
        subject: 'Error download',
        timestamp: +new Date(Date.now() - 150000),
        expiryDate: +new Date(Date.now() - ONE_DAY_TIME)
      }];

      return testMessages[index];
    }

    setup(function() {
      // we do this here because of sinon fake timers
      this.sinon.stub(Utils.date.format, 'localeFormat', function() {
        return 'date_stub';
      });
      this.sinon.stub(MessageManager, 'retrieveMMS', function() {
        return {};
      });
      localize = this.sinon.spy(navigator.mozL10n, 'localize');
    });
    suite('pending message', function() {
      var message;
      var element;
      var notDownloadedMessage;
      var button;
      setup(function() {
        message = getTestMessage(0);
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
        assert.equal(notDownloadedMessage.dataset.l10nId,
          'not-downloaded-mms',
          'localization id set correctly');
        assert.equal(notDownloadedMessage.dataset.l10nArgs,
          '{"date":"date_stub"}',
          'localization arguments set correctly');
      });
      test('date is correctly determined', function() {
        assert.equal(+Utils.date.format.localeFormat.args[0][0],
          message.expiryDate);
        assert.equal(Utils.date.format.localeFormat.args[0][1],
          'dateTimeFormat_%x');
      });
      test('button text is correct', function() {
        assert.equal(button.dataset.l10nId, 'downloading');
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
      var message;
      var element;
      var notDownloadedMessage;
      var button;
      setup(function() {
        message = getTestMessage(1);
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
        assert.equal(notDownloadedMessage.dataset.l10nId,
          'not-downloaded-mms',
          'localization id set correctly');
        assert.equal(notDownloadedMessage.dataset.l10nArgs,
          '{"date":"date_stub"}',
          'localization arguments set correctly');
      });
      test('date is correctly determined', function() {
        assert.equal(+Utils.date.format.localeFormat.args[0][0],
          message.expiryDate);
        assert.equal(Utils.date.format.localeFormat.args[0][1],
          'dateTimeFormat_%x');
      });
      test('button text is correct', function() {
        assert.equal(button.dataset.l10nId, 'download');
      });
      suite('clicking', function() {
        var showMessageErrorSpy;

        setup(function() {
          localize.reset();
          if (!('mozSettings' in navigator)) {
           navigator.mozSettings = null;
          }

          this.sinon.stub(navigator, 'mozSettings', MockNavigatorSettings);
          showMessageErrorSpy = this.sinon.spy(ThreadUI, 'showMessageError');
          ThreadUI.handleMessageClick({
            target: button
          });
        });
        test('changes download text', function() {
          assert.ok(localize.calledWith(button, 'downloading'));
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
            localize.reset();
            MessageManager.retrieveMMS.returnValues[0].onerror();
          });
          test('error class present', function() {
            assert.isTrue(element.classList.contains('error'));
          });
          test('pending class absent', function() {
            assert.isFalse(element.classList.contains('pending'));
          });
          test('changes download text', function() {
            assert.ok(localize.calledWith(button, 'download'));
          });
          test('Message error dialog should not exist', function() {
            assert.equal(showMessageErrorSpy.called, false);
          });
        });
        suite('response non-active sim card error', function() {

          setup(function() {
            MessageManager.retrieveMMS.returnValues[0].error =
            {
              name: 'NonActiveSimCardError'
            };
            MessageManager.retrieveMMS.returnValues[0].onerror();
          });
          test('Message ID code/option for dialog', function() {
            sinon.assert.calledWithMatch(showMessageErrorSpy,
              'NonActiveSimCardError', { messageId: message.id });
          });
          test('Error dialog params and show', function() {
            var code = MockErrorDialog.calls[0][0];
            var opts = MockErrorDialog.calls[0][1];
            assert.equal(code, 'NonActiveSimCardError');
            assert.equal(opts.messageId, message.id);
            assert.isTrue(!!opts.confirmHandler);
            assert.equal(MockErrorDialog.prototype.show.called, true);
          });

          test('confirmHandler called with correct state', function() {
            this.sinon.spy(Settings, 'switchSimHandler');
            MockErrorDialog.calls[0][1].confirmHandler();
            assert.isTrue(element.classList.contains('pending'));
            assert.isFalse(element.classList.contains('error'));
            sinon.assert.calledWith(localize, button, 'downloading');
            sinon.assert.called(Settings.switchSimHandler);
          });
        });
        suite('response error with other errorCode', function() {
          setup(function() {
            MessageManager.retrieveMMS.returnValues[0].error =
            {
              name: 'OtherError'
            };
            MessageManager.retrieveMMS.returnValues[0].onerror();
          });
          test('Other error code/option for dialog', function() {
            sinon.assert.calledWithMatch(showMessageErrorSpy,
              'OtherError', { messageId: message.id });
          });
          test('Error dialog params and show', function() {
            var code = MockErrorDialog.calls[0][0];
            var opts = MockErrorDialog.calls[0][1];
            assert.equal(code, 'OtherError');
            assert.equal(opts.messageId, message.id);
            assert.equal(MockErrorDialog.prototype.show.called, true);
          });
        });
        suite('response error with no errorCode', function() {
          setup(function() {
            MessageManager.retrieveMMS.returnValues[0].code =
            {
              name: null
            };
            MessageManager.retrieveMMS.returnValues[0].onerror();
          });
          test('No error dialog for no error code case', function() {
            assert.isFalse(showMessageErrorSpy.called);
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
      var message;
      var element;
      var notDownloadedMessage;
      var button;
      setup(function() {
        message = getTestMessage(2);
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
        assert.equal(notDownloadedMessage.dataset.l10nId,
          'not-downloaded-mms',
          'localization id set correctly');
        assert.equal(notDownloadedMessage.dataset.l10nArgs,
          '{"date":"date_stub"}',
          'localization arguments set correctly');
      });
      test('date is correctly determined', function() {
        assert.equal(+Utils.date.format.localeFormat.args[0][0],
          message.expiryDate);
        assert.equal(Utils.date.format.localeFormat.args[0][1],
          'dateTimeFormat_%x');
      });
      test('button text is correct', function() {
        assert.equal(button.dataset.l10nId, 'download');
      });
      suite('clicking', function() {
        setup(function() {
          localize.reset();
          ThreadUI.handleMessageClick({
            target: button
          });
        });
        test('changes download text', function() {
          assert.ok(localize.calledWith(button, 'downloading'));
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
            localize.reset();
            MessageManager.retrieveMMS.returnValues[0].onerror();
          });
          test('error class present', function() {
            assert.isTrue(element.classList.contains('error'));
          });
          test('pending class absent', function() {
            assert.isFalse(element.classList.contains('pending'));
          });
          test('changes download text', function() {
            assert.ok(localize.calledWith(button, 'download'));
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
      var message;
      var element;
      var notDownloadedMessage;
      var button;
      setup(function() {
        message = getTestMessage(3);
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
        assert.equal(notDownloadedMessage.dataset.l10nId,
          'expired-mms',
          'localization id set correctly');
        assert.equal(notDownloadedMessage.dataset.l10nArgs,
          '{"date":"date_stub"}',
          'localization arguments set correctly');
      });
      test('date is correctly determined', function() {
        assert.equal(+Utils.date.format.localeFormat.args[0][0],
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

  suite('No attachment error handling', function() {
    function getTestMessage(index) {
      var testMessages = [{
        id: 1,
        threadId: 8,
        sender: '123456',
        type: 'mms',
        delivery: 'received',
        deliveryInfo: [{receiver: null, deliveryStatus: 'success'}],
        subject: 'No attachment testing',
        smil: '<smil><body><par><text src="cid:1"/>' +
              '</par></body></smil>',
        attachments: null,
        timestamp: +new Date(Date.now() - 150000),
        expiryDate: +new Date(Date.now())
      },
      {
        id: 2,
        threadId: 8,
        sender: '123456',
        type: 'mms',
        delivery: 'received',
        deliveryInfo: [{receiver: null, deliveryStatus: 'success'}],
        subject: 'Empty attachment testing',
        smil: '<smil><body><par><text src="cid:1"/>' +
              '</par></body></smil>',
        attachments: [],
        timestamp: +new Date(Date.now() - 100000),
        expiryDate: +new Date(Date.now())
      }];

      return testMessages[index];
    }

    var localize;
    setup(function() {
      this.sinon.stub(Utils.date.format, 'localeFormat', function() {
        return 'date_stub';
      });
      this.sinon.stub(MessageManager, 'retrieveMMS', function() {
        return {};
      });
      localize = this.sinon.spy(navigator.mozL10n, 'localize');
    });

    suite('no attachment message', function() {
      var message;
      var element;
      var noAttachmentMessage;
      setup(function() {
        message = getTestMessage(0);
        ThreadUI.appendMessage(message);
        element = document.getElementById('message-' + message.id);
        noAttachmentMessage = element.querySelector('p');
      });
      test('element has correct data-message-id', function() {
        assert.equal(element.dataset.messageId, message.id);
      });
      test('no-attachment class present', function() {
        assert.isTrue(element.classList.contains('no-attachment'));
      });
      test('error class present', function() {
        assert.isTrue(element.classList.contains('error'));
      });
      test('pending class absent', function() {
        assert.isFalse(element.classList.contains('pending'));
      });
      test('message is correct', function() {
        assert.ok(
          localize.calledWith(noAttachmentMessage, 'no-attachment-text')
        );
      });
      suite('clicking', function() {
        setup(function() {
          ThreadUI.handleMessageClick({
            target: element
          });
        });
        test('Should not call retrieveMMS', function() {
          assert.isFalse(MessageManager.retrieveMMS.called);
        });
      });
    });

    suite('Empty attachment message', function() {
      var message;
      var element;
      var noAttachmentMessage;
      setup(function() {
        message = getTestMessage(1);
        ThreadUI.appendMessage(message);
        element = document.getElementById('message-' + message.id);
        noAttachmentMessage = element.querySelector('p');
      });
      test('element has correct data-message-id', function() {
        assert.equal(element.dataset.messageId, message.id);
      });
      test('no-attachment class present', function() {
        assert.isTrue(element.classList.contains('no-attachment'));
      });
      test('error class present', function() {
        assert.isTrue(element.classList.contains('error'));
      });
      test('pending class absent', function() {
        assert.isFalse(element.classList.contains('pending'));
      });
      test('message is correct', function() {
        assert.ok(
          localize.calledWith(noAttachmentMessage, 'no-attachment-text')
        );
      });
      suite('clicking', function() {
        setup(function() {
          ThreadUI.handleMessageClick({
            target: element
          });
        });
        test('Should not call retrieveMMS', function() {
          assert.isFalse(MessageManager.retrieveMMS.called);
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
        timestamp: Date.now()
      };
      this.otherMsg = {
        id: 45,
        type: 'sms',
        receivers: this.receivers,
        body: 'this test',
        delivery: 'error',
        timestamp: Date.now()
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
      this.sinon.stub(MessageManager, 'getMessage')
        .returns(this.getMessageReq);
      this.sinon.stub(MessageManager, 'deleteMessage').callsArgWith(1, true);
      this.sinon.stub(MessageManager, 'resendMessage');
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

      var args = MessageManager.resendMessage.args[0];
      assert.deepEqual(args[0], this.targetMsg);
    });
  });

  // Bug 890206 - Resending a message with delivery status
  // error on a thread with just that message, should leave
  // the thread with just one message.
  suite('Message error resent in thread with 1 message', function() {
    var message, request;
    setup(function() {
      message = {
        id: 23,
        type: 'sms',
        body: 'This is a error sms',
        delivery: 'error',
        timestamp: Date.now()
      };
      ThreadUI.appendMessage(message);

      this.sinon.stub(window, 'confirm');
      // TODO use MockMessageManager instead
      request = {};
      this.sinon.stub(MessageManager, 'getMessage').returns(request);
      this.sinon.stub(MessageManager, 'resendMessage');
      this.errorMsg = ThreadUI.container.querySelector('.error');
    });

    test('clicking on an error message bubble in a thread with 1 message ' +
      'should try to resend and remove the errored message',
      function() {
      window.confirm.returns(true);
      this.errorMsg.querySelector('.pack-end').click();

      request.result = message;
      request.onsuccess && request.onsuccess.call(request);
      assert.isNull(ThreadUI.container.querySelector('li'));
      assert.ok(MessageManager.resendMessage.calledWith(message));
    });
  });

  // TODO: Move these tests to an integration test suite.
  // Bug 868056 - Clean up SMS test suite

  suite('Actions on the links >', function() {
    var messageId = 23, link, phone = '123123123';
    setup(function() {
      this.sinon.spy(LinkActionHandler, 'onClick');

      this.sinon.stub(LinkHelper, 'searchAndLinkClickableData', function() {
        return '<a data-dial="' + phone +
        '" data-action="dial-link">' + phone + '</a>';
      });

      ThreadUI.appendMessage({
        id: messageId,
        type: 'sms',
        body: 'This is a test with 123123123',
        delivery: 'error',
        timestamp: Date.now()
      });
      // Retrieve DOM element for executing the event
      var messageDOM = document.getElementById('message-' + messageId);
      link = messageDOM.querySelector('a');
    });

    teardown(function() {
      ThreadUI.container.innerHTML = '';
      link = null;
    });

    test(' "click"', function() {
      // In this case we are checking the 'click' action on a link
      link.click();
      // This 'click' was handled properly?
      assert.ok(LinkActionHandler.onClick.called);
    });

    test(' "contextmenu"', function() {
      var contextMenuEvent = new CustomEvent('contextmenu', {
        'bubbles': true,
        'cancelable': true
      });
      // Dispatch custom event for testing long press
      link.dispatchEvent(contextMenuEvent);
      // The assertions that were removed from this
      // test were relocated to link_action_handler_test.js
      // This 'context-menu' was handled properly?
      assert.isFalse(LinkActionHandler.onClick.called);
    });
  });

  suite('updateCarrier', function() {
    var contacts = [], details, number;
    var threadMessages, carrierTag;

    suiteSetup(function() {
      contacts.push(new MockContact());
      number = contacts[0].tel[0].value;
      details = Utils.getContactDetails(number, contacts);
    });

    setup(function() {
      loadBodyHTML('/index.html');
      threadMessages = document.getElementById('thread-messages');
      carrierTag = document.getElementById('contact-carrier');
      this.sinon.spy(ThreadUI, 'updateElementsHeight');
    });

    teardown(function() {
      document.body.innerHTML = '';
    });

    test(' If there is >1 participant, hide carrier info', function() {
      var thread = {
        participants: [number, '123123']
      };

      ThreadUI.updateCarrier(thread, contacts, details);
      assert.isFalse(threadMessages.classList.contains('has-carrier'));
    });

    test(' If there is one participant & contacts', function() {
      var thread = {
        participants: [number]
      };

      ThreadUI.updateCarrier(thread, contacts, details);
      assert.isTrue(threadMessages.classList.contains('has-carrier'));
    });

    test(' If there is one participant & no contacts', function() {
      var thread = {
        participants: [number]
      };

      ThreadUI.updateCarrier(thread, [], details);
      assert.isFalse(threadMessages.classList.contains('has-carrier'));
    });

    test(' input height are updated properly', function() {
      var thread = {
        participants: [number]
      };

      ThreadUI.updateCarrier(thread, contacts, details);
      assert.ok(ThreadUI.updateElementsHeight.calledOnce);

      // Change number of recipients,so now there should be no carrier
      thread.participants.push('123123');

      ThreadUI.updateCarrier(thread, contacts, details);
      assert.ok(ThreadUI.updateElementsHeight.calledTwice);
    });

    test(' input height are not updated if its not needed', function() {
      var thread = {
        participants: [number]
      };

      ThreadUI.updateCarrier(thread, contacts, details);
      ThreadUI.updateCarrier(thread, contacts, details);
      assert.isFalse(ThreadUI.updateElementsHeight.calledTwice);
    });
  });

  suite('Long press on the bubble >', function() {
    var messageId = 23;
    var link, messageDOM, contextMenuEvent;
    setup(function() {
      contextMenuEvent = new CustomEvent('contextmenu', {
        'bubbles': true,
        'cancelable': true
      });

      this.sinon.spy(LinkActionHandler, 'onClick');
      this.sinon.spy(ThreadUI, 'promptContact');
      MockOptionMenu.mSetup();


      this.sinon.stub(LinkHelper, 'searchAndLinkClickableData', function() {
        return '<a data-dial="123123123" data-action="dial-link">123123123</a>';
      });

      ThreadUI.appendMessage({
        id: messageId,
        type: 'sms',
        body: 'This is a test with 123123123',
        delivery: 'error',
        timestamp: Date.now()
      });
      // Retrieve DOM element for executing the event
      messageDOM = document.getElementById('message-' + messageId);
      link = messageDOM.querySelector('a');
    });

    teardown(function() {
      ThreadUI.container.innerHTML = '';
      link = null;
      MockOptionMenu.mTeardown();
    });
    test(' "click" on bubble (not in link-action) has no effect', function() {
      messageDOM.click();
      assert.ok(LinkActionHandler.onClick.calledOnce);
      // As there is no action, we are not going to show any menu
      assert.isFalse(ThreadUI.promptContact.calledOnce);
    });
    test(' "long-press" on link-action is not redirected to "onClick"',
      function() {
      // Dispatch custom event for testing long press
      link.dispatchEvent(contextMenuEvent);
      assert.isFalse(LinkActionHandler.onClick.calledOnce);
    });
    test(' "long-press" on link-action shows the option menu from the bubble',
      function() {
      // Dispatch custom event for testing long press
      link.dispatchEvent(contextMenuEvent);
      // It should show the list of options of the bubble (forward, delete...)
      assert.ok(MockOptionMenu.calls.length, 1);
    });
    test(' "long-press" on bubble shows a menu with delete as first option',
      function() {
      // Dispatch custom event for testing long press
      link.dispatchEvent(contextMenuEvent);
      assert.ok(MockOptionMenu.calls.length, 1);
      // Is first element of the menu 'forward'?
      assert.equal(MockOptionMenu.calls[0].items[0].l10nId, 'forward');
    });
    test(' "long-press" on bubble shows a menu with delete option',
      function() {
      // Dispatch custom event for testing long press
      link.dispatchEvent(contextMenuEvent);
      assert.ok(MockOptionMenu.calls.length, 1);
      // Show menu with 'delete' option
      assert.equal(MockOptionMenu.calls[0].items[2].l10nId, 'delete');
    });
  });

  suite('Message resending UI', function() {
    setup(function() {
      ThreadUI.appendMessage({
        id: 23,
        type: 'sms',
        body: 'This is a test',
        delivery: 'error',
        timestamp: Date.now()
      });
      ThreadUI.appendMessage({
        id: 45,
        type: 'sms',
        body: 'This is another test',
        delivery: 'sent',
        timestamp: Date.now()
      });
      this.sinon.stub(window, 'confirm');
      this.sinon.stub(ThreadUI, 'resendMessage');
      this.elems = {
        errorMsg: ThreadUI.container.querySelector('.error'),
        sentMsg: ThreadUI.container.querySelector('.sent')
      };
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

  suite('Header Actions/Display', function() {
    setup(function() {
      Threads.delete(1);
      window.location.hash = '';
      MockActivityPicker.dial.mSetup();
      MockOptionMenu.mSetup();
    });

    teardown(function() {
      Threads.delete(1);
      window.location.hash = '';
      MockActivityPicker.dial.mTeardown();
      MockOptionMenu.mTeardown();
    });

    suite('OptionMenu', function() {

      suite('prompt', function() {
        test('Single known', function() {

          var contact = new MockContact();

          Threads.set(1, {
            participants: ['999']
          });

          window.location.hash = '#thread=1';

          var header = document.createElement('div');

          ThreadUI.prompt({
            number: '999',
            contactId: contact.id,
            isContact: true,
            header: header
          });

          assert.equal(MockOptionMenu.calls.length, 1);

          var call = MockOptionMenu.calls[0];
          var items = call.items;

          // we use the passed header as the dialog's header
          assert.equal(call.header, header);

          // no section is passed for contact
          assert.isUndefined(call.section);

          assert.equal(items.length, 3);

          // The first item is a "call" option
          assert.equal(items[0].l10nId, 'call');

          // The second item is a "viewContact" option
          assert.equal(items[1].l10nId, 'viewContact');

          // The fourth and last item is a "cancel" option
          assert.equal(items[2].l10nId, 'cancel');
        });

        test('Single unknown (phone)', function() {

          Threads.set(1, {
            participants: ['999']
          });

          window.location.hash = '#thread=1';

          ThreadUI.prompt({
            number: '999',
            isContact: false
          });

          assert.equal(MockOptionMenu.calls.length, 1);

          var call = MockOptionMenu.calls[0];
          var items = call.items;

          // Ensures that the OptionMenu was given
          // the phone number to diplay
          assert.equal(call.header, '999');

          // Only known Contact details should appear in the "section"
          assert.isUndefined(call.section);

          assert.equal(items.length, 4);

          // The first item is a "call" option
          assert.equal(items[0].l10nId, 'call');

          // The second item is a "createNewContact" option
          assert.equal(items[1].l10nId, 'createNewContact');

          // The third item is a "addToExistingContact" option
          assert.equal(items[2].l10nId, 'addToExistingContact');

          // The fourth and last item is a "cancel" option
          assert.equal(items[3].l10nId, 'cancel');
        });

        test('Single unknown (email)', function() {

          this.sinon.spy(ActivityPicker, 'email');

          Threads.set(1, {
            participants: ['999']
          });

          window.location.hash = '#thread=1';

          ThreadUI.prompt({
            email: 'a@b.com',
            isContact: false
          });

          assert.equal(MockOptionMenu.calls.length, 1);

          var call = MockOptionMenu.calls[0];
          var items = call.items;

          // Ensures that the OptionMenu was given
          // the email address to diplay
          assert.equal(call.header, 'a@b.com');

          // Only known Contact details should appear in the "section"
          assert.isUndefined(call.section);

          assert.equal(items.length, 4);

          // The first item is a "sendEmail" option
          assert.equal(items[0].l10nId, 'sendEmail');

          // Trigger the option to ensure that correct Activity is used.
          items[0].method();

          sinon.assert.called(ActivityPicker.email);

          // The second item is a "createNewContact" option
          assert.equal(items[1].l10nId, 'createNewContact');

          // The third item is a "addToExistingContact" option
          assert.equal(items[2].l10nId, 'addToExistingContact');

          // The fourth and last item is a "cancel" option
          assert.equal(items[3].l10nId, 'cancel');
        });
        test('Multiple known', function() {

          Threads.set(1, {
            participants: ['999', '888']
          });

          window.location.hash = '#thread=1';

          var header = document.createElement('div');
          ThreadUI.prompt({
            number: '999',
            header: header,
            isContact: true
          });

          assert.equal(MockOptionMenu.calls.length, 1);

          var call = MockOptionMenu.calls[0];
          var items = call.items;

          // ensure that we display no body
          assert.isUndefined(call.section);

          // ensures we'll show a contact header
          assert.equal(call.header, header);

          assert.equal(items.length, 3);

          // The first item is a "call" option
          assert.equal(items[0].l10nId, 'call');

          // The second item is a "send message" option
          assert.equal(items[1].l10nId, 'sendMessage');

          // The third and last item is a "cancel" option
          assert.equal(items[2].l10nId, 'cancel');
        });

        test('Multiple unknown', function() {

          Threads.set(1, {
            participants: ['999', '888']
          });

          window.location.hash = '#thread=1';

          ThreadUI.prompt({
            number: '999',
            isContact: false
          });

          assert.equal(MockOptionMenu.calls.length, 1);

          var call = MockOptionMenu.calls[0];
          var items = call.items;

          // Ensures that the OptionMenu was given
          // the phone number to diplay
          assert.equal(call.header, '999');

          assert.equal(items.length, 5);

          // The first item is a "call" option
          assert.equal(items[0].l10nId, 'call');

          // The second item is a "sendMessage" option
          assert.equal(items[1].l10nId, 'sendMessage');

          // The third item is a "createNewContact" option
          assert.equal(items[2].l10nId, 'createNewContact');

          // The fourth item is a "addToExistingContact" option
          assert.equal(items[3].l10nId, 'addToExistingContact');

          // The fifth and last item is a "cancel" option
          assert.equal(items[4].l10nId, 'cancel');
        });
      });

      suite('onHeaderActivation', function() {
        test('Single known', function() {
          this.sinon.spy(ContactRenderer.prototype, 'render');

          Threads.set(1, {
            participants: ['+12125559999']
          });

          window.location.hash = '#thread=1';


          ThreadUI.headerText.dataset.isContact = true;
          ThreadUI.headerText.dataset.number = '+12125559999';

          ThreadUI.onHeaderActivation();

          var calls = MockOptionMenu.calls;

          assert.equal(calls.length, 1);

          // contacts do not show up in the body
          assert.isUndefined(calls[0].section);

          // contacts show up in the header
          sinon.assert.calledWithMatch(ContactRenderer.prototype.render, {
            target: calls[0].header
          });

          assert.equal(calls[0].items.length, 3);
          assert.equal(typeof calls[0].complete, 'function');
        });

        test('Single unknown', function() {

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
          assert.equal(calls[0].items.length, 4);
          assert.equal(typeof calls[0].complete, 'function');
        });
      });
    });

    suite('updateHeaderData', function() {

      test('callback does not exist', function() {
        ThreadUI.updateHeaderData({});
      });

      test('callback exists', function(done) {
        ThreadUI.updateHeaderData(function() {
          done();
        });
      });

    });

    // See: utils_test.js
    // Utils.getCarrierTag
    //
    suite('Single participant', function() {

      suite('Carrier Tag', function() {
        test('Carrier Tag (non empty string)', function(done) {

          Threads.set(1, {
            participants: ['+12125559999']
          });

          window.location.hash = '#thread=1';

          this.sinon.stub(MockUtils, 'getCarrierTag', function() {
            return 'non empty string';
          });

          this.sinon.stub(
            MockContacts, 'findByPhoneNumber', function(phone, fn) {

            fn([new MockContact()]);

            var threadMessages = document.getElementById('thread-messages');

            assert.isTrue(threadMessages.classList.contains('has-carrier'));
            done();
          });

          ThreadUI.updateHeaderData();
        });

        test('Carrier Tag (empty string)', function(done) {

          Threads.set(1, {
            participants: ['+12125559999']
          });

          window.location.hash = '#thread=1';

          this.sinon.stub(MockUtils, 'getCarrierTag', function() {
            return '';
          });

          this.sinon.stub(
            MockContacts, 'findByPhoneNumber', function(phone, fn) {

            fn([new MockContact()]);

            var threadMessages = document.getElementById('thread-messages');

            assert.isFalse(threadMessages.classList.contains('has-carrier'));

            done();
          });

          ThreadUI.updateHeaderData();
        });
      });
    });

    suite('Multi participant', function() {
      var localize;
      setup(function() {
        window.location.hash = '';
        MockActivityPicker.dial.mSetup();
        MockOptionMenu.mSetup();
        localize = this.sinon.spy(navigator.mozL10n, 'localize');
      });

      teardown(function() {
        Threads.delete(1);
        window.location.hash = '';
        MockActivityPicker.dial.mTeardown();
        MockOptionMenu.mTeardown();
      });

      suite('Options', function() {

        test('DOES NOT Invoke Activities', function() {

          Threads.set(1, {
            participants: ['999', '888']
          });

          window.location.hash = '#thread=1';

          ThreadUI.headerText.dataset.isContact = true;
          ThreadUI.headerText.dataset.number = '999';

          ThreadUI.onHeaderActivation();

          assert.equal(MockActivityPicker.dial.called, false);
          assert.equal(MockActivityPicker.dial.calledWith, null);
        });

        test('DOES NOT Invoke Options', function() {

          Threads.set(1, {
            participants: ['999', '888']
          });

          window.location.hash = '#thread=1';

          ThreadUI.headerText.dataset.isContact = true;
          ThreadUI.headerText.dataset.number = '999';

          ThreadUI.onHeaderActivation();

          assert.equal(MockOptionMenu.calls.length, 0);
        });

        test('Moves to Group information View', function(done) {
          Threads.set(1, {
            participants: ['999', '888']
          });

          // Change to #thread=n
          window.onhashchange = function() {
            // Change to #group-view (per ThreadUI.onHeaderActivation())
            window.onhashchange = function() {
              window.onhashchange = null;
              assert.equal(window.location.hash, '#group-view');
              // View should not go back to thread view when header is
              // activated in group-view
              ThreadUI.onHeaderActivation();
              assert.equal(window.location.hash, '#group-view');
              done();
            };

            ThreadUI.onHeaderActivation();
          };

          window.location.hash = '#thread=1';
        });
      });

      suite('Carrier Tag', function() {
        test('Carrier Tag (empty string)', function() {

          Threads.set(1, {
            participants: ['999', '888']
          });

          window.location.hash = '#thread=1';
          ThreadUI.updateHeaderData();

          var threadMessages = document.getElementById('thread-messages');

          assert.isFalse(threadMessages.classList.contains('has-carrier'));
        });

      });
    });
  });

  suite('Sending Behavior (onSendClick)', function() {
    var realComposeisEmpty;
    var realMessageManager;
    var realEnableSend;
    var spy;

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

      var MockMessageManager = {
        activity: {
          recipients: []
        }
      };

      ['sendMMS', 'sendSMS'].forEach(function(prop) {
        MockMessageManager[prop] = function() {
          MockMessageManager[prop].called = true;
          MockMessageManager[prop].calledWith = [].slice.call(arguments);
        };

        MockMessageManager[prop].mSetup = function() {
          MockMessageManager[prop].called = false;
          MockMessageManager[prop].calledWith = null;
        };

        MockMessageManager[prop].mTeardown = function() {
          delete MockMessageManager[prop].called;
          delete MockMessageManager[prop].calledWith;
        };
      });

      window.MessageManager = MockMessageManager;
    });

    suiteTeardown(function() {
      ThreadUI.enableSend = realEnableSend;
      Compose.isEmpty = realComposeisEmpty;
      window.MessageManager = realMessageManager;
      realMessageManager = null;
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

      var calledWith = MessageManager.sendSMS.calledWith;
      assert.ok(MessageManager.sendSMS.called);
      assert.deepEqual(calledWith[0], ['999']);
      assert.deepEqual(calledWith[1], 'foo');
      assert.equal(window.location.hash, '#new');
    });

    test('MMS, 1 Recipient, stays in view', function() {
      ThreadUI.recipients.add({
        number: '999'
      });

      Compose.append(mockAttachment(512));

      ThreadUI.onSendClick();

      assert.ok(MessageManager.sendMMS.called);
      assert.deepEqual(MessageManager.sendMMS.calledWith[0].recipients,
                       ['999']);
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

      var calledWith = MessageManager.sendSMS.calledWith;
      assert.ok(MessageManager.sendSMS.called);
      assert.deepEqual(calledWith[0], ['999', '888']);
      assert.deepEqual(calledWith[1], 'foo');
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
      assert.deepEqual(MessageManager.sendMMS.calledWith[0].recipients,
                       ['999', '888']);
      assert.equal(window.location.hash, '#new');
    });

    test('Deletes draft if there was a draft', function() {
      spy = this.sinon.spy(Drafts, 'delete');

      ThreadUI.draft = {id: 3};
      ThreadUI.recipients.add({
        number: '888'
      });
      Compose.append('foo');

      ThreadUI.onSendClick();

      assert.isTrue(spy.calledOnce);
      assert.isNull(ThreadUI.draft);
    });

    test('Removes draft thread if there was a draft thread', function() {
      spy = this.sinon.spy(ThreadListUI, 'removeThread');

      ThreadUI.draft = {id: 3};
      ThreadUI.recipients.add({
        number: '888'
      });
      Compose.append('foo');

      ThreadUI.onSendClick();

      assert.isTrue(spy.calledOnce);
    });

    suite('sendMMS errors', function() {
      setup(function() {
        this.sinon.spy(MessageManager, 'sendMMS');
        this.sinon.spy(MockErrorDialog.prototype, 'show');

        ThreadUI.recipients.add({
          number: '999'
        });

        Compose.append(mockAttachment(512));

        sendButton.click();
      });

      test('NotFoundError', function() {
        MessageManager.sendMMS.callArg(2, { name: 'NotFoundError' });
        sinon.assert.notCalled(MockErrorDialog.prototype.show);
      });

      test('Generic error', function() {
        MessageManager.sendMMS.callArg(2, { name: 'GenericError' });
        sinon.assert.called(MockErrorDialog.prototype.show);
      });
    });
  });

  suite('Contact Picker Behavior(contactPickButton)', function() {
    setup(function() {
      this.sinon.spy(ThreadUI, 'assimilateRecipients');
    });
    teardown(function() {
      Recipients.View.isFocusable = true;
    });

    test('assimilate called after mousedown on picker button', function() {
      ThreadUI.contactPickButton.dispatchEvent(new CustomEvent('mousedown'));
      assert.ok(ThreadUI.assimilateRecipients.called);
    });

    suite('Recipients.View.isFocusable', function() {
      test('false during activity', function() {
        ThreadUI.requestContact();
        assert.isFalse(Recipients.View.isFocusable);
      });

      test('true after activity', function() {
        this.sinon.stub(Utils, 'basicContact').returns({});

        ThreadUI.requestContact();

        var activity = MockMozActivity.instances[0];

        activity.result = {
          tel: [{ value: true }]
        };

        MockMozActivity.instances[0].onsuccess();

        assert.isTrue(Recipients.View.isFocusable);
      });
    });
  });

  suite('recipient handling >', function() {
    var localize;
    setup(function() {
      location.hash = '#new';
      localize = this.sinon.spy(navigator.mozL10n, 'localize');
    });

    teardown(function() {
      location.hash = '';
    });

    function testPickButtonEnabled() {
      test('pick button is enabled', function() {
        var pickButton = ThreadUI.contactPickButton;
        assert.isFalse(pickButton.classList.contains('disabled'));
      });
    }

    suite('no recipients', function() {
      setup(function() {
        ThreadUI.updateComposerHeader();
      });

      test('header is correct', function() {
        assert.deepEqual(localize.args[0], [
          ThreadUI.headerText, 'newMessage'
        ]);
      });

      testPickButtonEnabled();
    });

    suite('add one recipient', function() {
      setup(function() {
        ThreadUI.recipients.add({
          number: '999'
        });
      });

      test('header is correct', function() {
        assert.deepEqual(localize.args[0], [
          ThreadUI.headerText, 'recipient', {n: 1}
        ]);
      });

      testPickButtonEnabled();
    });

    suite('add two recipients', function() {
      setup(function() {
        ThreadUI.recipients.add({
          number: '999'
        });
        ThreadUI.recipients.add({
          number: '888'
        });
      });

      test('header is correct', function() {
        assert.ok(localize.calledTwice);
        assert.deepEqual(localize.args[1], [
          ThreadUI.headerText, 'recipient', {n: 2}
        ]);
      });

      testPickButtonEnabled();
    });
  });

  suite('initSentAudio', function() {
    test('calling function does not throw uncaught exception ', function() {
      assert.doesNotThrow(ThreadUI.initSentAudio);
    });
  });

  suite('enableActivityRequestMode', function() {
    test('calling function change the back button icon', function() {
      var backButtonSpan = ThreadUI.backButton.querySelector('span');

      ThreadUI.enableActivityRequestMode();
      assert.isTrue(backButtonSpan.classList.contains('icon-close'));
      assert.isFalse(backButtonSpan.classList.contains('icon-back'));
    });
  });

  suite('saveDraft() > ', function() {
    var addSpy, updateSpy, bannerSpy, arg;

    setup(function() {
      window.location.hash = '#new';
      addSpy = this.sinon.spy(Drafts, 'add');
      updateSpy = this.sinon.spy(ThreadListUI, 'updateThread');
      bannerSpy = this.sinon.spy(ThreadListUI, 'onDraftSaved');

      ThreadUI.recipients.add({
        number: '999'
      });

      Compose.append('foo');
    });

    test('do not preserve draft for replacement', function() {
      ThreadUI.saveDraft();

      assert.isNull(ThreadUI.draft);
    });

    test('preserve pre-existing draft for replacement', function() {
      var draft = {id: 55};
      ThreadUI.draft = draft;
      ThreadUI.saveDraft({preserve: true});

      assert.isNotNull(ThreadUI.draft);
      assert.equal(ThreadUI.draft, draft);
    });

    test('preserve new draft for replacement', function() {
      ThreadUI.draft = null;
      ThreadUI.saveDraft({preserve: true});

      assert.isNotNull(ThreadUI.draft);
      assert.deepEqual(ThreadUI.draft.recipients, ['999']);
      assert.equal(ThreadUI.draft.content, 'foo');
      assert.equal(ThreadUI.draft.threadId, null);
    });

    test('has entered content and recipients', function() {
      ThreadUI.saveDraft();
      arg = addSpy.firstCall.args[0];

      assert.deepEqual(arg.recipients, ['999']);
      assert.deepEqual(arg.content, ['foo']);
    });

    test('has entered recipients but not content', function() {
      Compose.clear();
      ThreadUI.saveDraft();
      arg = addSpy.firstCall.args[0];

      assert.deepEqual(arg.recipients, ['999']);
      assert.deepEqual(arg.content, []);
    });

    test('has entered content but not recipients', function() {
      ThreadUI.recipients.remove('999');
      ThreadUI.saveDraft();
      arg = addSpy.firstCall.args[0];

      assert.deepEqual(arg.recipients, []);
      assert.deepEqual(arg.content, ['foo']);
    });

    test('thread is updated in thread list, threadbound', function() {
      Threads.set(1, {
        participants: ['999']
      });
      window.location.hash = '#thread=1';

      ThreadUI.saveDraft();

      sinon.assert.calledOnce(updateSpy);
    });

    test('thread is updated in thread list, threadless', function() {
      ThreadUI.saveDraft();

      sinon.assert.calledOnce(updateSpy);
    });

    test('saves brand new threadless draft if not within thread', function() {
      Drafts.clear();

      ThreadUI.draft = {id: 1};
      ThreadUI.saveDraft();
      assert.equal(Drafts.byThreadId(null).length, 1);

      ThreadUI.draft = {id: 2};
      ThreadUI.saveDraft();
      assert.equal(Drafts.byThreadId(null).length, 2);

      ThreadUI.draft = {id: 3};
      ThreadUI.saveDraft();
      assert.equal(Drafts.byThreadId(null).length, 3);
    });

    test('saves draft to existing thread if within thread', function() {
      Threads.set(1, {
        participants: ['999']
      });
      window.location.hash = '#thread=1';

      ThreadUI.saveDraft();
      assert.equal(Drafts.byThreadId(1).length, 1);

      Compose.append('baz');
      ThreadUI.saveDraft();
      assert.equal(Drafts.byThreadId(1).length, 1);

      Compose.append('foo');
      ThreadUI.saveDraft();
      assert.equal(Drafts.byThreadId(1).length, 1);
    });

    test('Update thread timestamp if within thread', function() {

      this.sinon.stub(window, 'Draft').returns({
        timestamp: 2
      });

      Threads.set(1, {
        participants: ['999'],
        timestamp: 1
      });

      window.location.hash = '#thread=1';

      ThreadUI.saveDraft();

      assert.equal(Threads.get(1).timestamp, 2);
    });

    test('Update thread unreadCount if within thread', function() {

      this.sinon.stub(window, 'Draft').returns({
        unreadCount: 2
      });

      Threads.set(1, {
        participants: ['999'],
        unreadCount: 0
      });

      window.location.hash = '#thread=1';

      ThreadUI.saveDraft();

      assert.equal(Threads.get(1).unreadCount, 0);
    });

    test('shows draft saved banner if not autosaved', function() {
      Threads.set(1, {
        participants: ['999']
      });
      window.location.hash = '#thread=1';

      ThreadUI.saveDraft();

      sinon.assert.calledOnce(bannerSpy);
    });

    test('does not show draft saved banner if autosaved', function() {
      Threads.set(1, {
        participants: ['999']
      });
      window.location.hash = '#thread=1';

      ThreadUI.saveDraft({autoSave: true});

      sinon.assert.notCalled(bannerSpy);
    });
  });

  suite('onVisibilityChange() >', function() {
    var isDocumentHidden;

    suiteSetup(function() {
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: function() {
          return isDocumentHidden;
        }
      });
    });

    suiteTeardown(function() {
      delete document.hidden;
      MessageManager.draft = null;
    });

    setup(function() {
      this.sinon.spy(ThreadUI, 'saveDraft');
    });

    teardown(function() {
      isDocumentHidden = false;
    });

    suite('Draft saved: content AND recipients exist', function() {
      setup(function() {
        this.sinon.stub(Compose, 'isEmpty').returns(false);
      });

      test('new: has message', function() {
        window.location.hash = '#new';

        isDocumentHidden = true;

        ThreadUI.onVisibilityChange();

        sinon.assert.calledOnce(ThreadUI.saveDraft);
        sinon.assert.calledWithMatch(
          ThreadUI.saveDraft,
          {preserve: true, autoSave: true}
        );
      });

      test('new: has message, has recipients', function() {
        window.location.hash = '#new';

        ThreadUI.recipients.length = 1;
        isDocumentHidden = true;

        ThreadUI.onVisibilityChange();

        sinon.assert.calledOnce(ThreadUI.saveDraft);
        sinon.assert.calledWithMatch(
          ThreadUI.saveDraft,
          {preserve: true, autoSave: true}
        );
      });

      test('thread: has message', function() {
        window.location.hash = '#thread=1';

        isDocumentHidden = true;

        ThreadUI.onVisibilityChange();

        sinon.assert.calledOnce(ThreadUI.saveDraft);
        sinon.assert.calledWithMatch(
          ThreadUI.saveDraft,
          {preserve: true, autoSave: true}
        );
      });
    });

    suite('Draft saved: content OR recipients exist', function() {
      test('new: has message, no recipients', function() {
        window.location.hash = '#new';

        this.sinon.stub(Compose, 'isEmpty').returns(false);
        ThreadUI.recipients.length = 0;
        isDocumentHidden = true;

        ThreadUI.onVisibilityChange();

        sinon.assert.calledOnce(ThreadUI.saveDraft);
        sinon.assert.calledWithMatch(
          ThreadUI.saveDraft,
          {preserve: true, autoSave: true}
        );
      });

      test('new: no message, has recipients', function() {
        window.location.hash = '#new';

        this.sinon.stub(Compose, 'isEmpty').returns(true);
        ThreadUI.recipients.length = 1;
        isDocumentHidden = true;

        ThreadUI.onVisibilityChange();

        sinon.assert.calledOnce(ThreadUI.saveDraft);
        sinon.assert.calledWithMatch(
          ThreadUI.saveDraft,
          {preserve: true, autoSave: true}
        );
      });
    });

    suite('Draft not saved: content or recipients do not exist', function() {
      setup(function() {
        this.sinon.stub(Compose, 'isEmpty').returns(true);
        ThreadUI.recipients.length = 0;
      });

      test('new: no message', function() {
        window.location.hash = '#new';

        isDocumentHidden = true;

        ThreadUI.onVisibilityChange();

        sinon.assert.notCalled(ThreadUI.saveDraft);
      });

      test('new: no message, no recipients', function() {
        window.location.hash = '#new';

        ThreadUI.recipients.length = 0;
        isDocumentHidden = true;

        ThreadUI.onVisibilityChange();

        sinon.assert.notCalled(ThreadUI.saveDraft);
      });

      test('thread: no message', function() {
        window.location.hash = '#thread=1';

        isDocumentHidden = true;

        ThreadUI.onVisibilityChange();

        sinon.assert.notCalled(ThreadUI.saveDraft);
      });
    });
  });

  suite('Back button behaviour', function() {

    suite('During activity', function() {
      setup(function() {
        this.sinon.stub(ThreadUI, 'isKeyboardDisplayed').returns(false);
        this.sinon.stub(ThreadUI, 'stopRendering');
      });

      test('Call postResult when there is an activity', function() {
        var mockActivity = {
          postResult: sinon.stub()
        };

        ActivityHandler.currentActivity.new = mockActivity;

        ThreadUI.back();
        assert.isTrue(mockActivity.postResult.called);
      });
    });

    suite('From new message', function() {
      var showCalled = false;
      var spy;

      suiteSetup(function() {
        spy = sinon.spy(ThreadUI, 'saveDraft');
      });

      setup(function() {
        showCalled = false;
        this.sinon.stub(window, 'OptionMenu').returns({
          show: function() {
            showCalled = true;
          },
          hide: function() {}
        });

        this.sinon.stub(ThreadUI, 'isKeyboardDisplayed').returns(false);
        this.sinon.stub(ThreadUI, 'stopRendering');

        window.location.hash = '#new';

        ThreadUI.recipients.add({
          number: '999'
        });

        ThreadUI.draft = null;
      });

      test('Displays OptionMenu prompt if recipients', function() {
        ThreadUI.back();

        assert.isTrue(OptionMenu.calledOnce);
        assert.isTrue(showCalled);

        var items = OptionMenu.args[0][0].items;

        // Assert the correct menu items were displayed
        assert.equal(items[0].l10nId, 'save-as-draft');
        assert.equal(items[1].l10nId, 'discard-message');
        assert.equal(items[2].l10nId, 'cancel');
      });

      test('Displays OptionMenu prompt if recipients & content', function() {
        Compose.append('foo');
        ThreadUI.back();

        assert.isTrue(OptionMenu.calledOnce);
        assert.isTrue(showCalled);

        var items = OptionMenu.args[0][0].items;

        // Assert the correct menu items were displayed
        assert.equal(items[0].l10nId, 'save-as-draft');
        assert.equal(items[1].l10nId, 'discard-message');
        assert.equal(items[2].l10nId, 'cancel');
      });

      test('Displays OptionMenu prompt if content', function() {
        ThreadUI.recipients.remove('999');
        Compose.append('foo');
        ThreadUI.back();

        assert.isTrue(OptionMenu.calledOnce);
        assert.isTrue(showCalled);

        var items = OptionMenu.args[0][0].items;

        // Assert the correct menu items were displayed
        assert.equal(items[0].l10nId, 'save-as-draft');
        assert.equal(items[1].l10nId, 'discard-message');
        assert.equal(items[2].l10nId, 'cancel');
      });

      suite('OptionMenu operations', function() {
        test('Save as Draft', function() {
          ThreadUI.back();

          OptionMenu.args[0][0].items[0].method();

          // These things will be true
          assert.isTrue(spy.calledOnce);
          assert.equal(window.location.hash, '#thread-list');
          assert.equal(ThreadUI.recipients.length, 0);
          assert.equal(Compose.getContent(), '');
        });

        test('Discard', function() {
          ThreadUI.draft = new Draft({id: 3});
          ThreadUI.draft.isEdited = true;
          var spy = this.sinon.spy(ThreadListUI, 'removeThread');
          ThreadUI.back();

          OptionMenu.args[0][0].items[1].method();

          assert.equal(window.location.hash, '#thread-list');
          assert.equal(ThreadUI.recipients.length, 0);
          assert.equal(Compose.getContent(), '');
          assert.isTrue(spy.calledOnce);
          assert.isNull(ThreadUI.draft);
        });
      });

      suite('If existing draft', function() {

        suite('If draft edited', function() {

          setup(function() {
            ThreadUI.recipients.add({
              number: '999'
            });

            ThreadUI.draft = new Draft({
              id: 55
            });

            ThreadUI.draft.isEdited = true; // can't set this via options
          });

          test('Prompts for replacement if recipients', function() {
            ThreadUI.back();

            assert.isTrue(OptionMenu.calledOnce);
            assert.isTrue(showCalled);

            var items = OptionMenu.args[0][0].items;

            // Assert the correct menu items were displayed
            assert.equal(items[0].l10nId, 'replace-draft');
            assert.equal(items[1].l10nId, 'discard-message');
            assert.equal(items[2].l10nId, 'cancel');
          });

          test('Prompts for replacement if recipients & content', function() {
            Compose.append('foo');
            ThreadUI.back();

            assert.isTrue(OptionMenu.calledOnce);
            assert.isTrue(showCalled);

            var items = OptionMenu.args[0][0].items;

            // Assert the correct menu items were displayed
            assert.equal(items[0].l10nId, 'replace-draft');
            assert.equal(items[1].l10nId, 'discard-message');
            assert.equal(items[2].l10nId, 'cancel');
          });

          test('Prompts for replacement if content', function() {
            ThreadUI.recipients.remove('999');
            Compose.append('foo');
            ThreadUI.back();

            assert.isTrue(OptionMenu.calledOnce);
            assert.isTrue(showCalled);

            var items = OptionMenu.args[0][0].items;

            // Assert the correct menu items were displayed
            assert.equal(items[0].l10nId, 'replace-draft');
            assert.equal(items[1].l10nId, 'discard-message');
            assert.equal(items[2].l10nId, 'cancel');
          });
        });

        suite('If draft not edited', function() {

          setup(function() {
            ThreadUI.draft = {id: 55};
          });

          test('No prompt for replacement if recipients', function() {
            ThreadUI.draft.isEdited = false;
            ThreadUI.back();

            assert.isFalse(OptionMenu.calledOnce);
            assert.isFalse(showCalled);
          });

          test('No prompt for replacement if recipients & content', function() {
            Compose.append('foo');
            ThreadUI.draft.isEdited = false;
            ThreadUI.back();

            assert.isFalse(OptionMenu.calledOnce);
            assert.isFalse(showCalled);
          });

          test('No prompt for replacement if content', function() {
            ThreadUI.recipients.remove('999');
            Compose.append('foo');
            ThreadUI.draft.isEdited = false;
            ThreadUI.back();

            assert.isFalse(OptionMenu.calledOnce);
            assert.isFalse(showCalled);
          });
        });
      });
    });
  });

  suite('New Message banner', function() {
    var notice;

    function addMessages() {
      for (var i = 0; i < 15; i++) {
        var message = MockMessages.sms({
          id: i
        });
        ThreadUI.appendMessage(message);
      }
    }

    setup(function() {
      container.style.overflow = 'scroll';
      container.style.height = '50px';
      notice = document.getElementById('messages-new-message-notice');
      var testMessage = MockMessages.sms({
        id: 20
      });

      addMessages();

      //Put the scroll on top
      container.scrollTop = 0;
      dispatchScrollEvent(container);

      ThreadUI.onMessageReceived(testMessage);
    });

    suite('should be shown', function() {
      test('when new message is recieved', function() {
        assert.isFalse(notice.classList.contains('hide'));
      });
    });

    suite('should be closed', function() {
      test('when the notice is clicked', function() {
        notice.click();
        assert.isFalse(ThreadUI.isScrolledManually);
        assert.isTrue(notice.classList.contains('hide'));
      });

      test('when the scroll reach the bottom', function() {
        container.scrollTop = container.scrollHeight;

        dispatchScrollEvent(container);

        assert.isTrue(notice.classList.contains('hide'));
      });
    });
  });

  /* The options menu depends on the situation:
   * - 'Add Subject' if there's none, 'Delete subject' if previously added
   * - 'Delete messages' for existing conversations
   * - 'Settings' for all cases
   */
  suite('Options menu', function() {
    setup(function() {
      window.location.hash = '';
      MockOptionMenu.mSetup();
    });

    teardown(function() {
      window.location.hash = '';
      MockOptionMenu.mTeardown();
    });

    suite('opens from new message', function() {
      var options;
      setup(function() {
        window.location.hash = '#new';
      });
      teardown(function() {
        window.location.hash = '';
      });
      test('should show proper options', function() {
        ThreadUI.showOptions();
        options = MockOptionMenu.calls[0].items;
        assert.equal(MockOptionMenu.calls.length, 1);
        assert.equal(options.length, 3);
        assert.equal(options[0].l10nId, 'add-subject');
        assert.equal(options[1].l10nId, 'settings');
      });
    });

    suite('opens from existing message', function() {
      var options;
      setup(function() {
        window.location.hash = '#thread=1';
        ThreadUI.showOptions();
        options = MockOptionMenu.calls[0].items;
      });
      teardown(function() {
        window.location.hash = '';
      });
      test('should show options overlay', function() {
        assert.equal(MockOptionMenu.calls.length, 1);
      });
      test('should show option for adding subject', function() {
        assert.equal(options[0].l10nId, 'add-subject');
      });
      test('should show option for deleting messages', function() {
        assert.equal(options[1].l10nId, 'deleteMessages-label');
      });
      test('should show settings options last', function() {
        assert.equal(options[options.length - 2].l10nId, 'settings');
      });
    });
  });

  suite('getMessageBubble(element) > ', function() {
    var tree, li, section, span;

    setup(function() {
      tree = document.createElement('div');

      tree.innerHTML = [
        '<div id="thread-messages">',
          '<ul>',
            '<li data-message-id="1">',
              '<section class="bubble">',
                '<span>.</span>',
              '</section>',
            '</li>',
          '</ul>',
        '</div>'
      ].join();

      span = tree.querySelector('span');
      section = tree.querySelector('section');
      li = tree.querySelector('li');
    });

    test('Finds the bubble (event target is lower)', function() {
      var data = ThreadUI.getMessageBubble(span);

      assert.equal(data.node, section);
      assert.equal(data.id, 1);
    });

    test('Finds the bubble (event target is bubble)', function() {
      var data = ThreadUI.getMessageBubble(section);

      assert.equal(data.node, section);
      assert.equal(data.id, 1);
    });

    test('Does not find the bubble (event target is higher)', function() {
      var data = ThreadUI.getMessageBubble(li);

      assert.equal(data, null);
    });
  });
});
