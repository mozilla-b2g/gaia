/* global MocksHelper, MockAttachment, MockL10n, loadBodyHTML,
         Compose, Attachment, MockMozActivity, Settings, Utils,
         Draft, Blob,
         Threads,
         ThreadUI, SMIL,
         InputEvent,
         MessageManager,
         Navigation,
         Promise,
         AssetsHelper,
         FocusEvent,
         SubjectComposer,
         MockOptionMenu
*/

/*jshint strict:false */
/*jslint node: true */

'use strict';

require('/shared/js/event_dispatcher.js');
require('/shared/test/unit/mocks/mock_async_storage.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_option_menu.js');

require('/js/compose.js');
require('/js/utils.js');
require('/js/drafts.js');

require('/test/unit/mock_attachment.js');
require('/test/unit/mock_message_manager.js');
require('/test/unit/mock_threads.js');
require('/test/unit/mock_navigation.js');
require('/test/unit/mock_recipients.js');
require('/test/unit/mock_settings.js');
require('/test/unit/mock_utils.js');
require('/test/unit/mock_moz_activity.js');
require('/test/unit/mock_thread_ui.js');
require('/test/unit/mock_smil.js');
require('/test/unit/mock_subject_composer.js');

var mocksHelperForCompose = new MocksHelper([
  'asyncStorage',
  'MessageManager',
  'Threads',
  'Navigation',
  'Settings',
  'Recipients',
  'Utils',
  'MozActivity',
  'Attachment',
  'ThreadUI',
  'SMIL',
  'SubjectComposer',
  'OptionMenu'
]).init();

suite('compose_test.js', function() {
  mocksHelperForCompose.attachTestHelpers();
  var realMozL10n;
  var oversizedImageBlob,
      smallImageBlob;
  var clock;
  var UPDATE_DELAY = 500;
  var TYPE_DATA = {
    'image': {
      mimeType: 'image/jpeg',
      name: 'image.jpg'
    },
    'video': {
      mimeType: 'video/mp4',
      name: 'video.mp4'
    },
    'audio': {
      mimeType: 'audio/ogg',
      name: 'audio.oga'
    },
    'other': {
      mimeType: 'text/other',
      name: 'other'
    }
  };

  function mockAttachment(opts) {
    var size = (opts && opts.size) || 12345;
    var type = (opts && opts.type) || 'audio';
    var data = TYPE_DATA[type];
    var mimeType = data.mimeType;
    var name = data.name;

    var attachment = new MockAttachment({
      type: mimeType,
      size: size
    }, { name: name });
    return attachment;
  }

  function mockImgAttachment(isOversized) {
    var attachment = isOversized ?
      new MockAttachment(oversizedImageBlob, { name: 'oversized.jpg' }) :
      new MockAttachment(smallImageBlob, { name: 'small.jpg' });
    attachment.mNextRender.dataset.thumbnail = 'blob:fake' + Math.random();
    return attachment;
  }

  /**
   * Waits for "count" "eventName" events.
   * @param {string} eventName Compose event name to wait for.
   * @param {number?} count Optional number of fired events to wait for. If not
   * specified - 1 is used.
   * @returns {Promise} Promise that is resolved once event fired "count" times.
   */
  function waitForComposeEvent(eventName, count) {
    count = count || 1;
    return new Promise((resolve) => {
      Compose.on(eventName, function onEvent() {
        if (--count === 0) {
          Compose.off(eventName, onEvent);
          resolve();
        }
      });
    });
  }

  suiteSetup(function(done) {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    var blobPromises = [
      AssetsHelper.generateImageBlob(1400, 1400, 'image/jpeg', 1).then(
        (blob) => oversizedImageBlob = blob
      ),
      AssetsHelper.generateImageBlob(300, 300, 'image/jpeg', 0.5).then(
        (blob) => smallImageBlob = blob
      )
    ];

    Promise.all(blobPromises).then(() => {
      done(function() {
        var mmsSizeLimit = 300 * 1024;

        assert.isTrue(
          smallImageBlob.size < mmsSizeLimit,
          'Image blob should be greater than MMS size limit'
        );

        assert.isTrue(
          oversizedImageBlob.size > mmsSizeLimit,
          'Image blob should be greater than MMS size limit'
        );
      });
    }, done);
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
  });

  setup(function() {
    Threads.active = undefined;

    clock = this.sinon.useFakeTimers();

    this.sinon.stub(SubjectComposer.prototype, 'on');
    this.sinon.stub(SubjectComposer.prototype, 'isVisible').returns(false);
    this.sinon.stub(SubjectComposer.prototype, 'getValue').returns('');
    MockOptionMenu.mSetup();
  });

  teardown(function() {
    this.sinon.clock.tick(UPDATE_DELAY);
    MockOptionMenu.mTeardown();
  });

  suite('Compose init without recipients', function() {
    var mockRecipients;

    setup(function() {
      this.sinon.stub(ThreadUI, 'on');
      loadBodyHTML('/index.html');
      mockRecipients = ThreadUI.recipients;
      Settings.supportEmailRecipient = true;
      ThreadUI.recipients = null;
    });

    teardown(function() {
      ThreadUI.recipients = mockRecipients;
    });

    test('Should be initializable without recipients', function() {
      assert.ok(Compose.init('messages-compose-form'));
    });
  });

  suite('Message Composition', function() {
    var message, sendButton, attachButton, form;

    setup(function() {
      this.sinon.stub(ThreadUI, 'on');

      loadBodyHTML('/index.html');
      // this needs a proper DOM
      ThreadUI.initRecipients();
      Settings.supportEmailRecipient = true;
      Compose.init('messages-compose-form');
      message = document.getElementById('messages-input');
      sendButton = document.getElementById('messages-send-button');
      attachButton = document.getElementById('messages-attach-button');
      form = document.getElementById('messages-compose-form');
    });

    suite('Subject', function() {
      setup(function() {
        this.sinon.stub(SubjectComposer.prototype, 'show');
        this.sinon.stub(SubjectComposer.prototype, 'hide');
        this.sinon.stub(SubjectComposer.prototype, 'setValue');
        this.sinon.stub(SubjectComposer.prototype, 'getMaxLength');
      });

      test('Visibility', function() {
        SubjectComposer.prototype.isVisible.returns(true);
        assert.isTrue(Compose.isSubjectVisible);

        SubjectComposer.prototype.isVisible.returns(false);
        assert.isFalse(Compose.isSubjectVisible);
      });

      test('Toggle field', function() {
        Compose.showSubject();
        sinon.assert.called(SubjectComposer.prototype.show);

        Compose.hideSubject();
        sinon.assert.called(SubjectComposer.prototype.hide);
      });

      test('Get content from subject field', function() {
        var content = 'Title';
        SubjectComposer.prototype.getValue.returns(content);

        assert.equal(Compose.getSubject(), content);
      });

      test('Set content to subject field', function() {
        var content = 'Title';
        Compose.setSubject(content);

        sinon.assert.calledWith(SubjectComposer.prototype.setValue, content);
      });

      suite('Subject methods in Compose object', function() {
        setup(function() {
          SubjectComposer.prototype.getMaxLength.returns(5);
        });

        test('> isSubjectMaxLength:false', function() {
          SubjectComposer.prototype.getValue.returns('abcd');

          assert.isFalse(Compose.isSubjectMaxLength());
        });

        test('> isSubjectMaxLength:true', function() {
          SubjectComposer.prototype.getValue.returns('abcde');

          assert.isTrue(Compose.isSubjectMaxLength());
        });
      });
    });

    suite('Placeholder', function() {
      setup(function() {
        Compose.clear();
      });
      test('Placeholder present by default', function() {
        assert.isTrue(Compose.isEmpty(), 'added');
      });

      test('Placeholder removed on input resulting in content', function() {
        Compose.append('text');
        assert.isFalse(Compose.isEmpty(), 'removed');
      });
      test('Placeholder present on input resulting in empty', function() {
        Compose.clear();
        assert.isTrue(Compose.isEmpty(), 'readded');
      });
      test('Placeholder removed on input of attachment', function() {
        Compose.append(mockAttachment());
        var contains = message.classList.contains('placeholder');
        // clearing to remove the iframe so that mocha doesn't
        // get alarmed at window[0] pointing to the iframe
        Compose.clear();
        assert.isFalse(contains, 'removed');
      });
      teardown(function() {
        Compose.clear();
      });
    });

    suite('Clearing Message', function() {
      setup(function() {
        Compose.clear();

        this.sinon.stub(SubjectComposer.prototype, 'reset');
        this.sinon.stub(window.URL, 'revokeObjectURL');
      });

      test('Clear removes text', function() {
        Compose.append('start');
        var txt = Compose.getContent();
        assert.equal(txt.length, 1, 'One line in the txt');
        Compose.clear();
        txt = Compose.getContent();
        assert.equal(txt.length, 0, 'No lines in the txt');
      });
      test('Clear removes attachment', function() {
        Compose.append(mockAttachment());

        assert.equal(Compose.getContent().length, 1, 'One line in text');

        Compose.clear();

        assert.equal(Compose.getContent().length, 0, 'No lines in the text');
        sinon.assert.notCalled(
          window.URL.revokeObjectURL,
          'Should not revoke anything for non-image attachment'
        );
      });
      test('Clear properly revokes thumbnail URLs', function() {
        var attachments = [
          mockAttachment(), mockImgAttachment(), mockImgAttachment()
        ];

        attachments.forEach((attachment) => Compose.append(attachment));
        assert.equal(Compose.getContent().length, 3, 'Three lines in text');

        // Remove one attachment manually
        attachments[2].mNextRender.remove();

        Compose.clear();

        assert.equal(Compose.getContent().length, 0, 'No lines in the text');
        sinon.assert.calledTwice(
          window.URL.revokeObjectURL,
          'Should revoke object URL for all image attachments'
        );
        attachments.slice(1).forEach((attachment) => {
          sinon.assert.calledWith(
            window.URL.revokeObjectURL,
            attachment.mNextRender.dataset.thumbnail
          );
        });
      });
      test('Resets subject', function() {
        Compose.clear();

        sinon.assert.called(SubjectComposer.prototype.reset);
      });
    });

    suite('Message insert, append, prepend', function() {
      test('Message appended', function() {
        Compose.append('start');
        var txt = Compose.getContent();
        assert.equal(txt[0], 'start', 'text is appended');
      });

      test('Message appended with html', function() {
        var message = document.getElementById('messages-input');

        Compose.append('<b>hi!</b>\ntest');
        var txt = Compose.getContent();

        assert.equal(message.innerHTML, '&lt;b&gt;hi!&lt;/b&gt;<br>test<br>');
        assert.equal(txt[0], '<b>hi!</b>\ntest');
      });

      test('Compose.append(array)', function() {
        this.sinon.spy(Compose, 'append');

        // The initial call and the subsequent calls for the two array items
        // will result in 3 calls to Compose.append
        Compose.append([1, 2]);

        sinon.assert.calledThrice(Compose.append);
      });

      test('Compose.append(item, { ignoreChange: true })', function() {
        var count = 0;
        Compose.on('input', function() {
          count++;
        });

        // Providing ignoreChange: true for a single item
        // append will skip the call to onContentChanged
        Compose.append(1, {ignoreChange: true});

        assert.equal(count, 0);
      });

      test('Compose.append(array), implied ignoreChange', function() {
        var count = 0;
        Compose.on('input', function() {
          count++;
        });

        // An array of items will trigger only 1 call to onContentChanged
        Compose.append([1, 2]);

        assert.equal(count, 1);
      });

      test('Compose.append("")', function() {
        var stub = sinon.stub();
        Compose.on('input', stub);

        var original = Compose.getContent();
        Compose.append('');
        var final = Compose.getContent();

        sinon.assert.notCalled(stub);
        assert.deepEqual(final, original);
      });

      test('Message prepend', function() {
        Compose.append('end');
        Compose.prepend('start');
        var txt = Compose.getContent();
        assert.equal(txt[0], 'startend', 'text is inserted at beginning');
      });

      test('Compose.prepend("")', function() {
        var stub = sinon.stub();
        Compose.on('input', stub);

        var original = Compose.getContent();
        Compose.prepend('');
        var final = Compose.getContent();

        sinon.assert.notCalled(stub);
        assert.deepEqual(final, original);
      });

      teardown(function() {
        Compose.clear();
      });
    });

    suite('Sending events in correct order', function() {
      var onInput, onType, typeWhenEvent;

      function captureType() {
        typeWhenEvent = Compose.type;
      }

      setup(function() {
        onInput = sinon.stub();
        onType = sinon.spy(captureType);
        Compose.clear();
        Compose.on('input', onInput);
        Compose.on('type', onType);
      });

      teardown(function() {
        Compose.offAll();
        typeWhenEvent = null;
      });

      test('appending text', function() {
        Compose.append('start');
        assert.ok(onInput.called);
        assert.isFalse(onType.called);
      });

      test('appending attachment', function() {
        Compose.append(mockAttachment());
        assert.ok(onInput.called);
        assert.ok(onType.called);
        assert.ok(onInput.calledAfter(onType));
        assert.equal(typeWhenEvent, 'mms');
      });
    });

    suite('Getting Message via getContent()', function() {
      setup(function() {
        Compose.clear();
      });
      test('Just text - simple', function() {
        Compose.append('start');
        Compose.append('end');
        var txt = Compose.getContent();
        assert.equal(txt.length, 1, 'One line in the txt');
        assert.equal(txt[0], 'startend', 'resulting txt ok');
      });
      test('Just text - line breaks', function() {
        Compose.append('start');
        Compose.append('\n');
        Compose.append('end');
        var txt = Compose.getContent();
        assert.equal(txt.length, 1, 'Single text content');
        assert.equal(txt[0], 'start\nend', 'output includes a line break');
      });
      test('Trailing line breaks not stripped', function() {
        Compose.append('start');
        Compose.append('\n');
        Compose.append('end');
        Compose.append(new Array(5).join('\n'));
        var expected = 'start\nend\n\n\n\n';
        var txt = Compose.getContent();
        assert.equal(txt.length, 1, 'Single text content');
        assert.equal(txt[0], expected, 'correct content');
      });
      test('Text with several spaces', function() {
        Compose.append('start');
        Compose.append('    ');
        Compose.append('end');
        var expected = 'start    end';
        var txt = Compose.getContent();
        assert.equal(txt.length, 1, 'Single text content');
        assert.equal(txt[0], expected, 'correct content');

        // the CSS we use is pre-wrap so we can use plain spaces
        var html = message.innerHTML;
        var expectedHTML = 'start    end<br>';
        assert.equal(html, expectedHTML, 'correct markup');
      });
      test('Text with non-break spaces', function() {
        Compose.append('start');
        Compose.append('\u00A0\u00A0\u00A0');
        Compose.append(' ');
        Compose.append('end');
        var expected = 'start    end';
        var txt = Compose.getContent();
        assert.equal(txt.length, 1, 'Single text content');
        assert.equal(txt[0], expected, 'correct content');
      });
      test('Just attachment', function() {
        Compose.append(mockAttachment());
        var txt = Compose.getContent();
        // clearing to remove the iframe so that mocha doesn't
        // get alarmed at window[0] pointing to the iframe
        Compose.clear();
        assert.equal(txt.length, 1, 'One line in txt');
        assert.ok(txt[0] instanceof MockAttachment, 'Sub 0 is an attachment');
      });
      test('Attachment in middle of text', function() {
        Compose.append('start');
        Compose.append(mockAttachment());
        Compose.append('end');
        var txt = Compose.getContent();
        // clearing to remove the iframe so that mocha doesn't
        // get alarmed at window[0] pointing to the iframe
        Compose.clear();
        assert.equal(txt.length, 3, 'Three lines in txt');
        assert.equal(txt[0], 'start', 'First line is start text');
        assert.ok(txt[1] instanceof MockAttachment, 'Sub 1 is an attachment');
        assert.equal(txt[2], 'end', 'Last line is end text');
      });
      test('attachment with excess breaks', function() {
        Compose.append('start');
        Compose.append('\n\n\n\n');
        Compose.append(mockAttachment());
        Compose.append('end');
        var txt = Compose.getContent();
        assert.equal(txt.length, 3, 'Three lines in txt');
        assert.equal(txt[0], 'start\n\n\n\n', 'First line is start text');
        assert.ok(txt[1] instanceof MockAttachment, 'Sub 1 is an attachment');
        assert.equal(txt[2], 'end', 'Last line is end text');
      });

      test('text split in several text nodes', function() {
        var lastChild = message.lastChild;
        message.insertBefore(document.createTextNode('hello'), lastChild);
        message.insertBefore(document.createTextNode(''), lastChild);
        message.insertBefore(document.createTextNode('world'), lastChild);

        var content = Compose.getContent();
        assert.equal(content.length, 1);
        assert.equal(content[0], 'helloworld');
      });

      teardown(function() {
        Compose.clear();
      });
    });

    suite('Preload composer fromDraft', function() {
      var d1, d2, attachment;

      setup(function() {
        Compose.clear();
        d1 = new Draft({
          subject: '...',
          content: ['I am a draft'],
          threadId: 1
        });
        attachment = mockAttachment();
        d2 = new Draft({
          content: ['I have an attachment!', attachment],
          threadId: 1
        });

        this.sinon.stub(SubjectComposer.prototype, 'show');
        this.sinon.stub(SubjectComposer.prototype, 'setValue');
      });
      teardown(function() {

        Compose.clear();
      });

      test('Draft with text', function() {
        Compose.fromDraft(d1);
        assert.equal(Compose.getContent(), d1.content.join(''));
      });

      test('Place cursor at the end of the compose field', function() {
        Compose.fromDraft(d1);

        var range = window.getSelection().getRangeAt(0);
        assert.equal(message.lastChild.tagName, 'BR');
        assert.isTrue(range.collapsed);
        assert.equal(range.startOffset, message.childNodes.length - 1);
      });

      test('Draft with subject', function() {
        Compose.fromDraft(d1);

        sinon.assert.called(SubjectComposer.prototype.show);
        sinon.assert.calledWith(
          SubjectComposer.prototype.setValue,
          d1.subject
        );
      });

      test('Draft without subject', function() {
        Compose.fromDraft(d2);

        sinon.assert.notCalled(SubjectComposer.prototype.show);
        sinon.assert.notCalled(SubjectComposer.prototype.setValue);
      });

      test('Draft with attachment', function() {
        Compose.fromDraft(d2);
        var txt = Compose.getContent();
        assert.ok(txt, d2.content.join(''));
        assert.ok(txt[1] instanceof Attachment);
      });
    });

    suite('Changing content marks draft as edited', function() {

      setup(function() {
        ThreadUI.draft = new Draft({
          isEdited: false
        });
      });

      test('Changing message', function() {
        Compose.append('Message');
        assert.isTrue(ThreadUI.draft.isEdited);
      });

      test('Changing subject', function() {
        SubjectComposer.prototype.on.withArgs('change').yield();

        assert.isTrue(ThreadUI.draft.isEdited);
      });

      test('Hiding or showing subject', function() {
        SubjectComposer.prototype.on.withArgs('visibility-change').yield();

        assert.isTrue(ThreadUI.draft.isEdited);
      });

      test('Changing attachments', function() {
        Compose.append(mockAttachment({ size: 12345 }));
        assert.isTrue(ThreadUI.draft.isEdited);
      });
    });

    suite('requestAttachment', function() {
      test('correctly invokes the "pick" MozActivity', function() {
        Compose.requestAttachment();
        assert.equal(MockMozActivity.calls.length, 1);
        var call = MockMozActivity.calls[0];
        assert.equal(call.name, 'pick');
        assert.isDefined(call.data);
        assert.isArray(call.data.type);
        assert.include(call.data.type, 'image/*');
      });
      test('Invokes the provided "onsuccess" handler with an appropriate ' +
        'Attachment instance', function(done) {
        Compose.requestAttachment().then((attachment) => {
          assert.instanceOf(attachment, Attachment);

          // TODO: Move these assertions to a higher-level test suite that
          // concerns interactions between disparate units.
          // See: Bug 868056
          assert.equal(attachment.name, activity.result.name);
          assert.equal(attachment.blob, activity.result.blob);
        }).then(done, done);

        // Simulate a successful 'pick' MozActivity
        var activity = MockMozActivity.instances[0];
        activity.result = {
          name: 'test',
          blob: new Blob()
        };
        activity.onsuccess();
      });
      test('Invokes the provided "failure" handler when the MozActivity fails',
        function(done) {
        var mockError = new Error();
        Compose.requestAttachment().then(() => {
          throw new Error('Success callback should not be called!');
        }).catch((err) => {
          assert.equal(err, mockError);
        }).then(done, done);

        // Simulate an unsuccessful 'pick' MozActivity
        var activity = MockMozActivity.instances[0];
        activity.error = mockError;
        activity.onerror();
      });
      test('Triggers a "file too large" error when the returned file ' +
        'exceeds the maxmium MMS size limit', function(done) {
        Compose.requestAttachment().then(() => {
          throw new Error('Success callback should not be called!');
        }).catch((err) => {
          assert.instanceOf(err, Error);
          assert.equal(err.message, 'file too large');
          Settings.mmsSizeLimitation = origLimit;
        }).then(done, done);

        var activity = MockMozActivity.instances[0];
        var origLimit = Settings.mmsSizeLimitation;
        var largeBlob;

        Settings.mmsSizeLimitation = 45;
        largeBlob = new Blob([
          new Array(Settings.mmsSizeLimitation + 3).join('a')
        ]);

        // Simulate a successful 'pick' MozActivity
        activity.result = {
          name: 'test',
          blob: largeBlob
        };
        activity.onsuccess();
      });
    });

    suite('Getting size via size getter', function() {
      setup(function() {
        Compose.clear();
      });
      test('empty', function() {
        assert.equal(Compose.size, 0);
      });
      test('text only', function() {
        Compose.append('test');
        assert.equal(Compose.size, 4);
        Compose.append('test');
        assert.equal(Compose.size, 8);
      });
      test('text and attachment', function() {
        Compose.append('test');
        assert.equal(Compose.size, 4);
        Compose.append(mockAttachment({ size: 12345 }));
        assert.equal(Compose.size, 12349);
        Compose.append('test');
        assert.equal(Compose.size, 12353);
      });
    });

    suite('Message Attachment Iframe', function() {
      setup(function() {
        Compose.clear();
      });

      test('Attaching creates iframe.attachment-container', function() {
        var attachment = mockAttachment();
        Compose.append(attachment);
        var iframes = message.querySelectorAll('iframe');
        var txt = Compose.getContent();
        // clearing to remove the iframe so that mocha doesn't
        // get alarmed at window[0] pointing to the iframe
        Compose.clear();
        assert.equal(iframes.length, 1, 'One iframe');
        assert.ok(iframes[0].classList.contains('attachment-container'),
          '.attachment-container');
        assert.ok(txt[0] === attachment, 'iframe WeakMap\'d to attachment');
      });
    });

    suite('Image Attachment Handling', function() {
      setup(function() {
        this.sinon.stub(Utils, 'getResizedImgBlob');
        Compose.clear();
      });

      test('Attaching one small image', function(done) {
        var initialSize;
        var attachment = mockImgAttachment();

        function onInput() {
          done(function() {
            Compose.off('input', onInput);
            var img = Compose.getContent();
            assert.equal(img.length, 1, 'One image');
            assert.notEqual(Compose.size, initialSize,
              'the size was recalculated');
          });
        }
        // we store this so we can make sure it's recalculated
        initialSize = Compose.size;

        Compose.on('input', onInput);
        Compose.append(attachment);
      });

      test('Attaching one oversized image', function(done) {
        var actualSize;
        var attachment = mockImgAttachment(true);
        sinon.spy(attachment, 'updateFileSize');

        function onInput() {
          if (!Compose.isResizing) {
            done(function() {
              Compose.off('input', onInput);
              var img = Compose.getContent();
              assert.equal(img.length, 1, 'One image');
              assert.notEqual(Compose.size, actualSize,
                'the size was recalculated after resizing');
              assert.equal(attachment.blob, smallImageBlob);
              sinon.assert.called(attachment.updateFileSize);
            });
          }
        }
        Compose.on('input', onInput);
        Compose.append(attachment);
        // we store this so we can make sure it gets resized
        actualSize = Compose.size;
        Utils.getResizedImgBlob.lastCall.yield(smallImageBlob);
      });

      test('Attaching another oversized image', function(done) {
        function onInput() {
          if (!Compose.isResizing) {
            var images = message.querySelectorAll('iframe');

            if (images.length < 2) {
              Compose.append(mockImgAttachment(true));
              Utils.getResizedImgBlob.lastCall.yield(smallImageBlob);
            } else {
              done(function() {
                var content = Compose.getContent();

                Compose.off('input', onInput);
                assert.equal(images.length, 2, 'two images');
                assert.equal(content[1], 'append more image',
                  'Second attachment is text');
                assert.ok(
                  Utils.getResizedImgBlob.lastCall.calledWith(
                    sinon.match.any,
                    Settings.mmsSizeLimitation * 0.4
                  ),
                  'getResizedImgBlob should set to 2/5 MMS size'
                );

                assert.equal(content[2].blob, smallImageBlob);
              });
            }
          }
        }
        Compose.on('input', onInput);
        Compose.append(mockImgAttachment(true));
        Compose.append('append more image');
        Utils.getResizedImgBlob.lastCall.yield(smallImageBlob);
      });

      test('Third image attached, size limitation should changed',
      function(done) {
        function onInput() {
          if (!Compose.isResizing) {
            var images = Compose.getContent();
            if (images.length < 3) {
              Compose.append(mockImgAttachment(true));
              Utils.getResizedImgBlob.lastCall.yield(smallImageBlob);
            } else {
              done(function() {
                Compose.off('input', onInput);
                assert.equal(images.length, 3, 'three images');
                assert.ok(
                  Utils.getResizedImgBlob.lastCall.calledWith(
                    sinon.match.any,
                    Settings.mmsSizeLimitation * 0.2
                  ),
                  'getResizedImgBlob should set to 1/5 MMS size'
                );
              });
            }
          }
        }
        Compose.on('input', onInput);
        Compose.append(mockImgAttachment());
      });
    });

    suite('Message Type Events', function() {
      var typeChangeStub;

      setup(function() {
        Compose.clear();

        typeChangeStub = sinon.stub();

        Compose.on('type', typeChangeStub);
      });

      teardown(function() {
        Compose.off('type', typeChangeStub);
      });

      test('Message switches type when adding attachment but not when clearing',
        function() {
        Compose.append(mockAttachment());

        sinon.assert.calledOnce(typeChangeStub);
        assert.equal(Compose.type, 'mms');

        Compose.clear();

        sinon.assert.calledOnce(typeChangeStub);
        assert.equal(Compose.type, 'sms');
      });

      test('Message switches type when adding/removing subject',
        function() {
        SubjectComposer.prototype.getValue.returns('foo');

        SubjectComposer.prototype.isVisible.returns(true);
        SubjectComposer.prototype.on.withArgs('visibility-change').yield();

        sinon.assert.calledOnce(typeChangeStub);
        assert.equal(Compose.type, 'mms');

        SubjectComposer.prototype.isVisible.returns(false);
        SubjectComposer.prototype.on.withArgs('visibility-change').yield();

        sinon.assert.calledTwice(typeChangeStub);
        assert.equal(Compose.type, 'sms');
      });

      test('Message switches type when there is an e-mail among the recipients',
      function() {
        ThreadUI.recipients.add({
          number: 'foo@bar.com',
          isEmail: true
        });

        ThreadUI.on.withArgs('recipientschange').yield();

        sinon.assert.calledOnce(typeChangeStub);
        assert.equal(Compose.type, 'mms');
      });

      test('Message switches type when there is an e-mail among the ' +
      'participants of the active thread', function() {
        Threads.active = { participants: ['foo@bar.com'] };
        Compose.updateType();
        sinon.assert.calledOnce(typeChangeStub);
        assert.equal(Compose.type, 'mms');
      });
    });

    suite('changing inputmode and message type', function() {
      test('initial inputmode is sms', function() {
        assert.equal(message.getAttribute('x-inputmode'), '-moz-sms');
        assert.equal(form.dataset.messageType, 'sms');
      });

      test('changing type to mms, then clear', function() {
        SubjectComposer.prototype.getValue.returns('some subject');

        SubjectComposer.prototype.isVisible.returns(true);
        SubjectComposer.prototype.on.withArgs('visibility-change').yield();

        assert.isFalse(message.hasAttribute('x-inputmode'));
        assert.equal(form.dataset.messageType, 'mms');

        SubjectComposer.prototype.isVisible.returns(false);
        Compose.clear();
        assert.equal(message.getAttribute('x-inputmode'), '-moz-sms');
        assert.equal(form.dataset.messageType, 'sms');
      });

      test('changing type to mms then sms', function() {
        SubjectComposer.prototype.getValue.returns('some subject');

        SubjectComposer.prototype.isVisible.returns(true);
        SubjectComposer.prototype.on.withArgs('visibility-change').yield();
        SubjectComposer.prototype.isVisible.returns(false);
        SubjectComposer.prototype.on.withArgs('visibility-change').yield();

        assert.equal(message.getAttribute('x-inputmode'), '-moz-sms');
        assert.equal(form.dataset.messageType, 'sms');
      });
    });

    suite('Compose fromMessage', function() {
      var xssString = '<img src="/" onerror="delete window.Compose;" />';
      var escapedXssString =
        '&lt;img src="/" onerror="delete window.Compose;" /&gt;';

      setup(function() {
        this.sinon.spy(Compose, 'append');
        this.sinon.spy(HTMLElement.prototype, 'focus');
        this.sinon.stub(SMIL, 'parse');
      });

      test('from sms', function() {
        var body = 'It\'s http:\\mozilla.org' + xssString;

        Compose.fromMessage({type: 'sms', body: body });

        sinon.assert.called(Compose.append);
        sinon.assert.notCalled(message.focus);
        assert.isDefined(Compose, 'XSS should not be successful');
        assert.equal(message.textContent, body);
        assert.equal(
          message.innerHTML,
          'It\'s http:\\mozilla.org' + escapedXssString + '<br>'
        );
      });

      test('from mms', function() {
        var testString = [
          'test\nstring 1\nin slide 1' + xssString,
          'It\'s test\nstring 2\nin slide 2'
        ];
        Compose.fromMessage({type: 'mms'});

        // Should not be focused before parse complete.
        sinon.assert.notCalled(message.focus);
        assert.isTrue(message.classList.contains('ignoreEvents'));
        SMIL.parse.yield([{text: testString[0]}, {text: testString[1]}]);

        sinon.assert.called(Compose.append);
        sinon.assert.notCalled(message.focus);
        assert.isFalse(message.classList.contains('ignoreEvents'));
        assert.isDefined(Compose, 'XSS should not be successful');
        assert.equal(
          message.textContent,
          testString.join('').replace(/\n/g, '')
        );
        assert.equal(
          message.innerHTML,
          'test<br>string 1<br>in slide 1' + escapedXssString +
          'It\'s test<br>string 2<br>in slide 2<br>'
        );
      });

      test('empty body', function() {
        Compose.fromMessage({type: 'sms', body: null});
        sinon.assert.calledWith(Compose.append, null);
        sinon.assert.notCalled(message.focus);
      });
    });

    suite('attach button', function() {
      setup(function() {
        this.sinon.stub(Compose, 'requestAttachment');
        this.sinon.stub(Utils, 'alert').returns(Promise.resolve());
        this.sinon.stub(Compose, 'append');
        this.sinon.stub(console, 'warn');
      });

      test('request an attachment', function() {
        Compose.requestAttachment.returns(Promise.resolve());
        attachButton.click();

        sinon.assert.called(Compose.requestAttachment);
      });

      test('onsuccess', function(done) {
        var attachment = mockAttachment();
        var requestPromise = Promise.resolve(attachment);
        Compose.requestAttachment.returns(requestPromise);

        attachButton.click();
        requestPromise.then(function() {
          sinon.assert.calledWith(Compose.append, attachment);
        }).then(done, done);
      });

      suite('onerror,', function() {
        test('file too large', function(done) {
          var requestPromise = Promise.reject(new Error('file too large'));

          Compose.requestAttachment.returns(requestPromise);
          attachButton.click();

          requestPromise.catch(() => {
            sinon.assert.calledWith(
              Utils.alert, {
                id: 'attached-files-too-large',
                args: { n: 1, mmsSize: '295' }
              }
            );
          }).then(done, done);
        });

        test('other errors are logged', function(done) {
          var err = 'other error';
          var requestPromise = Promise.reject(new Error(err));

          Compose.requestAttachment.returns(requestPromise);
          attachButton.click();

          requestPromise.catch(() => {
            sinon.assert.notCalled(Utils.alert);
            sinon.assert.calledWith(
              console.warn,
              'Unhandled error: ',
              new Error(err)
            );
          }).then(done, done);
        });
      });
    });

    suite('send button management:', function() {
      setup(function() {
        Compose.clear();

        this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
      });

      teardown(function() {
        Compose.clear();
      });

      suite('In thread panel, button should be...', function() {
        setup(function() {
          Navigation.isCurrentPanel.withArgs('thread', { id: 1 }).returns(true);
          Compose.clear();
        });

        test('disabled at the beginning', function() {
          assert.isTrue(sendButton.disabled);
        });

        test('enabled when there is message input', function() {
          Compose.append('Hola');
          assert.isFalse(sendButton.disabled);
        });

        test('enabled when there is subject input and is visible', function() {
          SubjectComposer.prototype.isVisible.returns(true);
          SubjectComposer.prototype.getValue.returns('test');
          SubjectComposer.prototype.on.withArgs('visibility-change').yield();

          assert.isFalse(sendButton.disabled);
        });

        test('disabled when there is subject input, but is hidden', function() {
          sendButton.disabled = false;

          SubjectComposer.prototype.isVisible.returns(false);
          SubjectComposer.prototype.getValue.returns('test');
          SubjectComposer.prototype.on.withArgs('visibility-change').yield();

          assert.isTrue(sendButton.disabled);
        });

        test('enabled when there is message input, but too many segments',
        function(done) {
          var segmentInfo = {
            segments: 11,
            charsAvailableInLastSegment: 10
          };
          var promise = Promise.resolve(segmentInfo);
          this.sinon.stub(MessageManager, 'getSegmentInfo').returns(promise);

          Compose.append('Hola');

          promise.then(
            () => assert.isFalse(sendButton.disabled)
          ).then(done, done);
        });

        test('disabled when oversized', function() {
          Settings.mmsSizeLimitation = 1024;
          Compose.append(mockAttachment({ size: 512 }));
          Compose.append('sigh');
          Compose.append(mockAttachment({ size: 512 }));
          assert.isTrue(sendButton.disabled);
        });
      });

      suite('In composer panel, button should be...', function() {
        setup(function() {
          Navigation.isCurrentPanel.withArgs('composer').returns(true);

          Compose.clear();
          ThreadUI.recipients.length = 0;
          ThreadUI.recipients.inputValue = '';
        });

        teardown(function() {
          Compose.clear();
          ThreadUI.recipients.length = 0;
          ThreadUI.recipients.inputValue = '';
        });

        suite('enabled', function() {
          setup(function() {
            // force disabled state to see that this is correctly removed
            sendButton.disabled = true;
          });

          suite('when there is message input...', function() {
            setup(function() {
              Compose.append('Hola');
            });

            test('and recipient field value is valid ', function() {
              ThreadUI.recipients.inputValue = '999';

              ThreadUI.on.withArgs('recipientschange').yield();

              assert.isFalse(sendButton.disabled);
            });

            test('after adding a valid recipient ', function() {
              ThreadUI.recipients.add({
                number: '999'
              });

              ThreadUI.on.withArgs('recipientschange').yield();

              assert.isFalse(sendButton.disabled);
            });

            test('after adding valid & questionable recipients ', function() {
              ThreadUI.recipients.add({
                number: 'foo',
                isQuestionable: true
              });

              ThreadUI.on.withArgs('recipientschange').yield();

              ThreadUI.recipients.add({
                number: '999'
              });

              ThreadUI.on.withArgs('recipientschange').yield();

              assert.isFalse(sendButton.disabled);
            });
          });

          test('when message input size is at the maximum', function() {
            ThreadUI.recipients.add({ number: '999' });
            Settings.mmsSizeLimitation = 1024;

            Compose.append(mockAttachment({ size: 1024 }));

            assert.isFalse(sendButton.disabled);
          });

          suite('when there is visible subject with input...', function() {
            setup(function() {
              SubjectComposer.prototype.getValue.returns('Title');
              SubjectComposer.prototype.isVisible.returns(true);

              SubjectComposer.prototype.on.withArgs('visibility-change').
                yield();
            });

            test('and recipient field value is valid ', function() {
              ThreadUI.recipients.inputValue = '999';

              ThreadUI.on.withArgs('recipientschange').yield();

              assert.isFalse(sendButton.disabled);
            });

            test('after adding a valid recipient ', function() {
              ThreadUI.recipients.add({
                number: '999'
              });

              ThreadUI.on.withArgs('recipientschange').yield();

              assert.isFalse(sendButton.disabled);
            });

            test('after adding valid & questionable recipients ', function() {
              ThreadUI.recipients.add({
                number: 'foo',
                isQuestionable: true
              });

              ThreadUI.on.withArgs('recipientschange').yield();

              ThreadUI.recipients.add({
                number: '999'
              });

              ThreadUI.on.withArgs('recipientschange').yield();

              assert.isFalse(sendButton.disabled);
            });
          });

          suite('when a valid recipient exists...', function() {
            setup(function() {
              ThreadUI.recipients.add({
                number: '999'
              });

              ThreadUI.on.withArgs('recipientschange').yield();
            });

            test('after adding message input ', function() {
              Compose.append('Hola');
              assert.isFalse(sendButton.disabled);
            });

            test('after adding subject input', function() {
              SubjectComposer.prototype.getValue.returns('Title');
              SubjectComposer.prototype.isVisible.returns(true);

              SubjectComposer.prototype.on.withArgs('visibility-change').
                yield();

              assert.isFalse(sendButton.disabled);
            });

            test('when message input size is at the maximum', function() {
              Settings.mmsSizeLimitation = 1024;

              Compose.append(mockAttachment({ size: 1024 }));

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

            Compose.append(mockAttachment({ size: 295*1024 }));

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

              ThreadUI.on.withArgs('recipientschange').yield();

              assert.isTrue(sendButton.disabled);
            });

            test('after adding a questionable recipient ', function() {
              ThreadUI.recipients.add({
                number: 'foo',
                isQuestionable: true
              });

              ThreadUI.on.withArgs('recipientschange').yield();

              assert.isFalse(sendButton.disabled);
            });
          });

          suite('when there is subject input...', function() {
            setup(function() {
              sendButton.disabled = false;

              SubjectComposer.prototype.getValue.returns('Title');
              SubjectComposer.prototype.on.withArgs('change').yield();
            });

            teardown(function() {
              Compose.clear();
            });

            test('there is no recipient ', function() {
              assert.isTrue(sendButton.disabled);
            });

            test('recipient field value is questionable ', function() {
              ThreadUI.recipients.inputValue = 'a';

              ThreadUI.on.withArgs('recipientschange').yield();

              assert.isTrue(sendButton.disabled);
            });

            test('after adding a questionable recipient ', function() {
              ThreadUI.recipients.add({
                number: 'foo',
                isQuestionable: true
              });

              ThreadUI.on.withArgs('recipientschange').yield();

              assert.isTrue(sendButton.disabled);
            });

            test('there is recipient, but subject field is hidden', function() {
              ThreadUI.recipients.add({
                number: '999'
              });

              ThreadUI.on.withArgs('recipientschange').yield();

              assert.isTrue(sendButton.disabled);
            });
          });

          suite('when a valid recipient exists...', function() {
            test('there is no message input ', function() {

              ThreadUI.recipients.add({
                number: 'foo'
              });

              ThreadUI.on.withArgs('recipientschange').yield();

              assert.isTrue(sendButton.disabled);
            });
          });

          test('oversized message', function() {
            Settings.mmsSizeLimitation = 1024;
            Compose.append(mockAttachment({ size: 512 }));
            Compose.append('sigh');
            Compose.append(mockAttachment({ size: 512 }));
            assert.isTrue(sendButton.disabled);
          });
        });

        test('disabled while resizing oversized image and ' +
          'enabled when resize complete ',
          function(done) {

          this.sinon.stub(Utils, 'getResizedImgBlob');

          ThreadUI.recipients.add({
            number: '999'
          });

          ThreadUI.on.withArgs('recipientschange').yield();

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
          Utils.getResizedImgBlob.yield(smallImageBlob);
        });
      });
    });
  });

  // generate checks for image, video, audio, and unknown button texts
  ['image', 'video', 'audio', 'other'].forEach(function(type) {
    suite(type + ' attachment pre-send menu display', function() {
      setup(function() {
        this.attachment = mockAttachment({ type: type });
        Compose.clear();
        Compose.append(this.attachment);
        this.attachmentSize = Compose.size;
        this.sinon.stub(window.URL, 'revokeObjectURL');

        // trigger a click on attachment
        this.attachment.mNextRender.click();
      });
      test('show called with correct options', function() {
        assert.equal(MockOptionMenu.calls.length, 1);
        var call = MockOptionMenu.calls[0];
        assert.equal(call.header, TYPE_DATA[type].name);
        assert.equal(call.items[0].l10nId, 'view-attachment-' + type);
        assert.equal(call.items[1].l10nId, 'remove-attachment-' + type);
        assert.equal(call.items[2].l10nId, 'replace-attachment-' + type);
        assert.equal(call.items[3].l10nId, 'cancel');
      });
    });
  });

  suite('Attachment pre-send menu methods', function() {
    var call;

    setup(function() {
      this.attachment = mockImgAttachment();
      Compose.clear();
      Compose.append(this.attachment);
      this.attachmentSize = Compose.size;
      this.sinon.stub(window.URL, 'revokeObjectURL');

      // trigger a click on attachment
      this.attachment.mNextRender.click();
      call = MockOptionMenu.calls[0];
    });

    suite('view', function() {
      setup(function() {
        this.sinon.stub(this.attachment, 'view');
        call.items[0].method();
      });
      test('clicking on view calls attachment.view', function() {
        sinon.assert.called(this.attachment.view);
      });
    });

    suite('remove', function() {
      setup(function() {
        call.items[1].method();
      });
      test('removes the original attachment', function() {
        sinon.assert.calledWith(
          window.URL.revokeObjectURL,
          this.attachment.mNextRender.dataset.thumbnail
        );
        assert.isFalse(document.body.contains(this.attachment.mNextRender));
      });
      test('recalculates size', function() {
        assert.equal(Compose.size, 0, 'size should be 0 after remove');
        assert.notEqual(Compose.size, this.attachmentSize,
          'size is changed after removing attachment');
      });
    });

    suite('replace', function() {
      var requestPromise;

      setup(function() {
        this.replacement = mockImgAttachment(true);
        this.sinon.stub(Compose, 'requestAttachment');
        this.sinon.stub(Utils, 'getResizedImgBlob');
      });

      suite('onsuccess', function() {
        setup(function() {
          requestPromise = Promise.resolve(this.replacement);
          Compose.requestAttachment.returns(requestPromise);
          // trigger click on replace
          call.items[2].method();
        });

        test('clicking on replace requests an attachment', function() {
           sinon.assert.called(Compose.requestAttachment);
        });
        test('removes the original attachment', function(done) {
          requestPromise.then(() => {
            sinon.assert.calledWith(
              window.URL.revokeObjectURL,
              this.attachment.mNextRender.dataset.thumbnail
            );
            assert.isFalse(document.body.contains(this.attachment.mNextRender));
          }).then(done, done);
        });
        test('inserts the new attachment', function(done) {
          requestPromise.then(() => {
            assert.isTrue(document.body.contains(this.replacement.mNextRender));
          }).then(done, done);
        });
        test('recalculates size', function(done) {
          requestPromise.then(() => {
            assert.notEqual(Compose.size, this.attachmentSize,
              'Size was recalculated to be the new size');
          }).then(done, done);
        });
        test('resizes image', function(done) {
          requestPromise.then(() => {
            sinon.assert.called(Utils.getResizedImgBlob);
          }).then(done, done);
        });
        suite('after resize', function() {
          var replacementSize;
          setup(function() {
            replacementSize = Compose.size;
            Utils.getResizedImgBlob.yield(smallImageBlob);
          });

          test('recalculates size again', function() {
            assert.notEqual(Compose.size, replacementSize);
          });
        });
      });

      suite('onerror,', function() {
        setup(function() {
          this.sinon.stub(Utils, 'alert').returns(Promise.resolve());
          this.sinon.stub(console, 'warn');
        });

        test('file too large', function(done) {
          var requestPromise = Promise.reject(new Error('file too large'));

          Compose.requestAttachment.returns(requestPromise);
          // trigger click on replace
          call.items[2].method();

          requestPromise.catch(() => {
            sinon.assert.notCalled(window.URL.revokeObjectURL);
            assert.isTrue(document.body.contains(this.attachment.mNextRender));
            sinon.assert.calledWith(
              Utils.alert, {
                id: 'attached-files-too-large',
                args: { n: 1, mmsSize: '295' }
              }
            );
          }).then(done, done);
        });

        test('other errors are logged', function(done) {
          var err = new Error('other error');
          var requestPromise = Promise.reject(err);

          Compose.requestAttachment.returns(requestPromise);
          // trigger click on replace
          call.items[2].method();

          requestPromise.catch(() => {
            sinon.assert.notCalled(window.URL.revokeObjectURL);
            assert.isTrue(document.body.contains(this.attachment.mNextRender));
            sinon.assert.notCalled(Utils.alert);
            sinon.assert.calledWithExactly(
              console.warn,
              'Unhandled error: ',
              sinon.match.same(err)
            );
          }).then(done, done);
        });
      });
    });
  });

  suite('Image attachment pre-send menu', function() {
    setup(function() {
      this.sinon.stub(Utils, 'getResizedImgBlob');
    });
    test('click opens menu while resizing and resize complete', function(done) {
      Compose.clear();
      var imageAttachment = mockImgAttachment(true);
      function onInput() {
        if (!Compose.isResizing) {
          done(function() {
            Compose.off('input', onInput);
            imageAttachment.mNextRender.click();
            assert.equal(MockOptionMenu.calls.length, 1, 'Menu should popup');
          });
        }
      }
      Compose.on('input', onInput);
      Compose.append(imageAttachment);
      imageAttachment.mNextRender.click();
      assert.equal(
        MockOptionMenu.calls.length,
        0,
        'Menu could not be opened while ressizing'
      );

      Utils.getResizedImgBlob.yield(smallImageBlob);
    });
  });

  suite('segmentInfo', function() {
    var initialSegmentInfo = {
      segments: 0,
      charsAvailableInLastSegment: 0
    };

    var segmentInfoPromise, expected;
    var initialText = 'hello,';
    var followingText = ' world!';

    function setInput(string) {
      var message = document.getElementById('messages-input');
      message.textContent = string;

      var event = new InputEvent('input', { bubbles: true, cancelable: true });
      message.dispatchEvent(event);
    }

    function setInputAndWait(string) {
      setInput(string);

      clock.tick(UPDATE_DELAY);

      return waitForSegmentinfo();
    }

    function waitForSegmentinfo(count) {
      return waitForComposeEvent('segmentinfochange', count);
    }

    setup(function(done) {
      this.sinon.stub(MessageManager, 'getSegmentInfo');

      expected = {
        segments: 1,
        charsAvailableInLastSegment: 20
      };

      segmentInfoPromise = Promise.resolve(expected);
      MessageManager.getSegmentInfo.returns(segmentInfoPromise);

      loadBodyHTML('/index.html');
      Compose.init('messages-compose-form');
      // Compose.init does a Compose.clear which updates segmentInfo
      clock.tick(UPDATE_DELAY);
      waitForSegmentinfo().then(done);
    });

    teardown(function(done) {
      // some tests use a rejected promise
      segmentInfoPromise.catch(() => {}).then(function() {
        Compose.clear();
        Compose.offAll();
      }).then(done, done);
    });

    test('updates when input is entered', function(done) {
      setInputAndWait('some text').then(function() {
        assert.deepEqual(Compose.segmentInfo, expected);
        assert.equal(Compose.type, 'sms');
      }).then(done, done);
    });

    test('does not update when subject input changes', function() {
      SubjectComposer.prototype.getValue.returns('some subject');
      SubjectComposer.prototype.isVisible.returns(true);
      SubjectComposer.prototype.on.withArgs('visibility-change').yield();

      setInput('some body');
      this.sinon.clock.tick(UPDATE_DELAY);
      sinon.assert.called(MessageManager.getSegmentInfo);

      MessageManager.getSegmentInfo.reset();

      SubjectComposer.prototype.on.withArgs('change').yield();

      this.sinon.clock.tick(UPDATE_DELAY);

      sinon.assert.notCalled(MessageManager.getSegmentInfo);
    });

    test('updates when subject is removed', function(done) {
      SubjectComposer.prototype.getValue.returns('some subject');
      SubjectComposer.prototype.isVisible.returns(true);
      SubjectComposer.prototype.on.withArgs('visibility-change').yield();

      setInputAndWait('some text').then(function() {
        assert.equal(Compose.type, 'mms');

        SubjectComposer.prototype.isVisible.returns(false);
        SubjectComposer.prototype.on.withArgs('visibility-change').yield();

        assert.deepEqual(Compose.segmentInfo, expected);
        assert.equal(Compose.type, 'sms');
      }).then(done, done);
    });

    test('has the default value if there is an error', function(done) {
      segmentInfoPromise = Promise.reject(new Error('error'));
      MessageManager.getSegmentInfo.returns(segmentInfoPromise);

      setInputAndWait('some text').then(function() {
        assert.deepEqual(Compose.segmentInfo, initialSegmentInfo);
        assert.equal(Compose.type, 'sms');
      }).then(done, done);
    });

    test('set type to mms if the text is very long', function(done) {
      Settings.maxConcatenatedMessages = 10;

      var expected = {
        segments: 11,
        charsAvailableInLastSegment: 20
      };
      segmentInfoPromise = Promise.resolve(expected);
      MessageManager.getSegmentInfo.returns(segmentInfoPromise);

      setInputAndWait('some text').then(function() {
        assert.deepEqual(Compose.segmentInfo, expected);
        assert.equal(Compose.type, 'mms');
      }).then(done, done);
    });

    test('set type back to sms if the text is shortened', function(done) {
      Settings.maxConcatenatedMessages = 10;

      var result1 = {
        segments: 11,
        charsAvailableInLastSegment: 20
      };
      var result2 = {
        segments: 10,
        charsAvailableInLastSegment: 20
      };
      segmentInfoPromise = Promise.resolve(result1);
      MessageManager.getSegmentInfo.returns(segmentInfoPromise);

      setInputAndWait('some text').then(function() {
        segmentInfoPromise = Promise.resolve(result2);
        MessageManager.getSegmentInfo.returns(segmentInfoPromise);
        return setInputAndWait('some text');
      }).then(function() {
        assert.deepEqual(Compose.segmentInfo, result2);
        assert.equal(Compose.type, 'sms');
      }).then(done, done);
    });

    test('returns the empty segmentInfo when text is empty', function(done) {
      setInputAndWait('some text').then(function() {
        MessageManager.getSegmentInfo.reset();
        return setInputAndWait('');
      }).then(function() {
        sinon.assert.notCalled(MessageManager.getSegmentInfo);
        assert.deepEqual(Compose.segmentInfo, initialSegmentInfo);
      }).then(done, done);
    });

    test('do not call getSegmentInfo twice in a row', function(done) {
      Compose.append(initialText);
      this.sinon.clock.tick(UPDATE_DELAY / 2);
      Compose.append(followingText);

      var waitingPromise = waitForSegmentinfo();

      this.sinon.clock.tick(UPDATE_DELAY);

      waitingPromise.then(function() {
        sinon.assert.calledOnce(MessageManager.getSegmentInfo);
        sinon.assert.calledWith(
          MessageManager.getSegmentInfo, initialText + followingText
        );
      }).then(done, done);
    });

    suite('asynchronous tricky tests >', function() {
      var deferred1, deferred2;

      var segmentInfo1 = {
        segments: 1,
        charsAvailableInLastSegment: 50
      };

      var segmentInfo2 = {
        segments: 1,
        charsAvailableInLastSegment: 40
      };

      function defer() {
        var deferred = {};

        deferred.promise = new Promise(function(resolve, reject) {
          deferred.resolve = resolve;
          deferred.reject = reject;
        });

        return deferred;
      }

      var results;
      function captureSegmentInfo() {
        results.push(Compose.segmentInfo);
      }

      setup(function() {
        results = [];
        Compose.on('segmentinfochange', captureSegmentInfo);

        deferred1 = defer();
        deferred2 = defer();

        MessageManager.getSegmentInfo.reset();
        MessageManager.getSegmentInfo.onFirstCall().returns(deferred1.promise);
        MessageManager.getSegmentInfo.onSecondCall().returns(deferred2.promise);

        Compose.append(initialText);
        this.sinon.clock.tick(UPDATE_DELAY);

        // the user appends more text before the segment info request returns
        Compose.append(followingText);

        // wait for the next update delay => should fire
        this.sinon.clock.tick(UPDATE_DELAY);
      });

      teardown(function() {
        Compose.off('segmentinfochange', captureSegmentInfo);
      });

      test('getSegmentInfoForText got called twice', function() {
        sinon.assert.calledTwice(MessageManager.getSegmentInfo);

        // sinon.assert.calledWith does not work with individual calls
        assert.ok(
          MessageManager.getSegmentInfo.firstCall.calledWith(initialText)
        );
        assert.ok(
          MessageManager.getSegmentInfo.secondCall.calledWith(
            initialText + followingText
          )
        );
      });

      test('segment info requests return ordered', function(done) {
        deferred1.resolve(segmentInfo1);
        deferred2.resolve(segmentInfo2);

        waitForSegmentinfo(2).then(function() {
          assert.equal(results[1], segmentInfo2);
        }).then(done, done);
      });

      test('2 segment info requests return unordered', function(done) {
        deferred2.resolve(segmentInfo2);
        deferred1.resolve(segmentInfo1);

        waitForSegmentinfo(2).then(function() {
          // note: this is wrong, but this won't happen in real life
          assert.equal(results[1], segmentInfo1);
        }).then(done, done);
      });
    });
  });

  suite('Message char counter', function() {
    var messageCounter,
        segmentInfoResponse;

    setup(function(done) {
      this.sinon.stub(
        MessageManager,
        'getSegmentInfo',
        () => Promise.resolve(segmentInfoResponse)
      );

      loadBodyHTML('/index.html');
      messageCounter = document.querySelector('.js-message-counter');

      Compose.init('messages-compose-form');
      waitForComposeEvent('segmentinfochange').then(done);
      clock.tick(UPDATE_DELAY);

      // Initiate next update
      Compose.append('Some text');
    });

    test('there are no segments', function(done) {
      Compose.clear();

      waitForComposeEvent('segmentinfochange').then(function() {
        assert.equal(Compose.type, 'sms');
        assert.equal(messageCounter.textContent, '');
      }).then(done, done);

      clock.tick(UPDATE_DELAY);
    });

    test('in first segment, enough characters', function(done) {
      segmentInfoResponse = {
        segments: 1,
        charsAvailableInLastSegment: 25
      };

      waitForComposeEvent('segmentinfochange').then(function() {
        assert.equal(Compose.type, 'sms');
        assert.equal(messageCounter.textContent, '');
      }).then(done, done);

      clock.tick(UPDATE_DELAY);
    });

    test('in first segment, less or equal then 20 chars left', function(done) {
      segmentInfoResponse = {
        segments: 1,
        charsAvailableInLastSegment: 20
      };

      waitForComposeEvent('segmentinfochange').then(function() {
        assert.equal(Compose.type, 'sms');
        assert.equal(messageCounter.textContent, '20/1');
      }).then(done, done);

      clock.tick(UPDATE_DELAY);
    });

    test('in second segment', function(done) {
      segmentInfoResponse = {
        segments: 2,
        charsAvailableInLastSegment: 40
      };

      waitForComposeEvent('segmentinfochange').then(function() {
        assert.equal(Compose.type, 'sms');
        assert.equal(messageCounter.textContent, '40/2');
      }).then(done, done);

      clock.tick(UPDATE_DELAY);
    });

    test('in last segment', function(done) {
      segmentInfoResponse = {
        segments: 10,
        charsAvailableInLastSegment: 20
      };

      waitForComposeEvent('segmentinfochange').then(function() {
        assert.equal(Compose.type, 'sms');
        assert.equal(messageCounter.textContent, '20/10');
      }).then(done, done);

      clock.tick(UPDATE_DELAY);
    });

    test('clears counter if type changed to MMS', function(done) {
      segmentInfoResponse = {
        segments: 11,
        charsAvailableInLastSegment: 40
      };

      waitForComposeEvent('segmentinfochange').then(function() {
        assert.equal(Compose.type, 'mms');
        assert.equal(messageCounter.textContent, '');

        // Go back to sms
        segmentInfoResponse = {
          segments: 10,
          charsAvailableInLastSegment: 40
        };
        Compose.append('Some other text');
        clock.tick(UPDATE_DELAY);

        return waitForComposeEvent('segmentinfochange').then(function () {
          assert.equal(Compose.type, 'sms');
          assert.equal(messageCounter.textContent, '40/10');
        });
      }).then(done, done);

      clock.tick(UPDATE_DELAY);
    });
  });

  suite('Message "interact" event', function() {
    setup(function() {
      loadBodyHTML('/index.html');
      Compose.init('messages-compose-form');
    });

    test('correctly calls "interact" event', function() {
      var onInteractStub = sinon.stub();

      Compose.on('interact', onInteractStub);

      document.getElementById('messages-input').click();
      sinon.assert.calledOnce(onInteractStub);

      document.getElementById('messages-input').dispatchEvent(
        new FocusEvent('focus')
      );
      sinon.assert.calledTwice(onInteractStub);

      document.getElementById('messages-attach-button').click();
      sinon.assert.calledThrice(onInteractStub);

      document.querySelector('.messages-attach-container').click();
      assert.equal(onInteractStub.callCount, 4);

      document.querySelector('.composer-button-container').click();
      assert.equal(onInteractStub.callCount, 5);

      SubjectComposer.prototype.on.withArgs('focus').yield();
      assert.equal(onInteractStub.callCount, 6);
    });
  });

  suite('lock() and unlock()',function() {
    test('correctly manages state of attachment button', function() {
      var attachButton = document.getElementById('messages-attach-button');

      // Should be enabled at the beginning
      assert.isFalse(attachButton.disabled);

      Compose.lock();

      // Lock should disable attachment button
      assert.isTrue(attachButton.disabled);

      Compose.unlock();

      // Unlock should enable attachment button again
      assert.isFalse(attachButton.disabled);
    });
  });
});
