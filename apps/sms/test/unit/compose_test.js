/* global MocksHelper, MockAttachment, MockL10n, loadBodyHTML,
         Compose, Attachment, MockMozActivity, Settings, Utils,
         AttachmentMenu, Draft, XMLHttpRequest, Blob,
         ThreadUI, SMIL,
         InputEvent,
         MessageManager,
         Navigation,
         Promise
*/

/*jshint strict:false */
/*jslint node: true */

'use strict';

requireApp('sms/js/compose.js');
requireApp('sms/js/utils.js');
requireApp('sms/js/drafts.js');

requireApp('sms/test/unit/mock_attachment.js');
requireApp('sms/test/unit/mock_attachment_menu.js');
require('/test/unit/mock_message_manager.js');
require('/test/unit/mock_navigation.js');
requireApp('sms/test/unit/mock_recipients.js');
requireApp('sms/test/unit/mock_settings.js');
requireApp('sms/test/unit/mock_utils.js');
requireApp('sms/test/unit/mock_moz_activity.js');
requireApp('sms/test/unit/mock_thread_ui.js');
require('/test/unit/mock_smil.js');
require('/shared/test/unit/mocks/mock_async_storage.js');
require('/shared/test/unit/mocks/mock_l10n.js');

var mocksHelperForCompose = new MocksHelper([
  'asyncStorage',
  'AttachmentMenu',
  'MessageManager',
  'Navigation',
  'Settings',
  'Recipients',
  'Utils',
  'MozActivity',
  'Attachment',
  'ThreadUI',
  'SMIL'
]).init();

suite('compose_test.js', function() {
  mocksHelperForCompose.attachTestHelpers();
  var realMozL10n;
  var oversizedImageBlob,
      smallImageBlob;
  var clock;
  var UPDATE_DELAY = 500;

  function mockAttachment(size) {
    var attachment = new MockAttachment({
      type: 'audio/ogg',
      size: size || 12345
    }, { name: 'audio.oga' });
    return attachment;
  }

  function mockImgAttachment(isOversized) {
    var attachment = isOversized ?
      new MockAttachment(oversizedImageBlob, { name: 'oversized.jpg' }) :
      new MockAttachment(smallImageBlob, { name: 'small.jpg' });
    return attachment;
  }

  suiteSetup(function(done) {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    // Create test blob for image attachment resize testing
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
    getAsset('/test/unit/media/IMG_0554.jpg', function(blob) {
      oversizedImageBlob = blob;
    });
    getAsset('/test/unit/media/kitten-450.jpg', function(blob) {
      smallImageBlob = blob;
    });
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
  });

  setup(function() {
    clock = this.sinon.useFakeTimers();
  });

  teardown(function() {
    this.sinon.clock.tick(UPDATE_DELAY);
  });

  suite('Message Composition', function() {
    var message, subject, sendButton, attachButton, form;

    setup(function() {
      this.sinon.stub(ThreadUI, 'on');

      loadBodyHTML('/index.html');
      Compose.init('messages-compose-form');
      message = document.getElementById('messages-input');
      subject = document.getElementById('messages-subject-input');
      sendButton = document.getElementById('messages-send-button');
      attachButton = document.getElementById('messages-attach-button');
      form = document.getElementById('messages-compose-form');
    });

    suite('Subject', function() {
      setup(function() {
        Compose.clear();
      });

      test('Toggle field', function() {
        assert.isFalse(form.classList.contains('subject-input-visible'));
        // Show
        Compose.toggleSubject();
        assert.isTrue(form.classList.contains('subject-input-visible'));
        // Hide
        Compose.toggleSubject();
        assert.isFalse(form.classList.contains('subject-input-visible'));
      });

      test('Get content from subject field', function() {
        var content = 'Title';
        subject.textContent = content;
        // We need to show the subject to get content
        Compose.toggleSubject();
        assert.equal(Compose.getSubject(), content);
      });

      // Per discussion, this is being deferred to another bug
      // https://bugzilla.mozilla.org/show_bug.cgi?id=959360
      //
      // test('Toggle type display visibility', function() {
      //   assert.isFalse(sendButton.classList.contains('has-counter'));

      //   subject.value = 'hi';
      //   Compose.toggleSubject();
      //   assert.isTrue(sendButton.classList.contains('has-counter'));

      //   Compose.toggleSubject();
      //   assert.isFalse(sendButton.classList.contains('has-counter'));
      // });

      test('Sent subject doesnt have line breaks (spaces instead)', function() {
        // Set the value
        subject.innerHTML = 'Line 1<br>Line 2<br><br><br><br>Line 3<br>';
        // We need to show the subject to get content
        Compose.toggleSubject();
        var text = Compose.getSubject();
        assert.equal(text, 'Line 1 Line 2 Line 3');
      });

      suite('Subject methods in Compose object', function() {
        setup(function() {
          Compose.clear();
        });

        test('> isSubjectMaxLength:false', function() {
          subject.textContent = 'foo text';
          Compose.toggleSubject();
          assert.isFalse(Compose.isSubjectMaxLength());
        });

        test('> isSubjectMaxLength:true', function() {
          subject.textContent = '1234567890123456789012345678901234567890' +
          '123456789012345678901234567890123456789012345678901234567890' +
          '123456789012345678901234567890123456789012345678901234567890' +
          '123456789012345678901234567890123456789012345678901234567890' +
          '123456789012345678901234567890123456789012345678901234567890';
          Compose.toggleSubject();
          assert.isTrue(Compose.isSubjectMaxLength());
        });

        test('> isSubjectEmpty:true', function() {
          subject.innerHTML = '<br><br><br>';
          Compose.toggleSubject();
          assert.isTrue(Compose.isSubjectEmpty());
        });

        test('> isSubjectEmpty:false', function() {
          subject.innerHTML = '<br><br><br>foo';
          Compose.toggleSubject();
          assert.isFalse(Compose.isSubjectEmpty());
        });

        test('> isMultilineSubject:true', function() {
          subject.innerHTML = '<br>';
          Compose.toggleSubject();

          assert.isFalse(Compose.isMultilineSubject());

          subject.innerHTML = 'Foo<br>Bar';

          assert.isTrue(Compose.isMultilineSubject());
        });

        test('> isMultilineSubject:false', function() {
          subject.textContent = '123456789';
          Compose.toggleSubject();
          assert.isFalse(Compose.isMultilineSubject());
        });

        test('> isMultilineSubject depends on line height', function() {
          subject.textContent = '123456789';
          Compose.toggleSubject();

          var subjectLineHeight = Number.parseInt(
            window.getComputedStyle(subject).lineHeight
          );

          subject.style.height = (subjectLineHeight * 2) + 'px';

          assert.isTrue(Compose.isMultilineSubject());

          subject.style.height = (subjectLineHeight * 1.5) + 'px';
          assert.isFalse(Compose.isMultilineSubject());

          subject.style.height = (subjectLineHeight * 3) + 'px';
          assert.isTrue(Compose.isMultilineSubject());
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
        var txt = Compose.getContent();
        assert.equal(txt.length, 1, 'One line in txt');
        Compose.clear();
        txt = Compose.getContent();
        assert.equal(txt.length, 0, 'No lines in the txt');
      });
      test('Clear removes subject', function() {
        subject.textContent = 'Title';
        Compose.toggleSubject();
        var txt = Compose.getSubject();
        assert.equal(txt, 'Title', 'Something in the txt');
        Compose.clear();
        txt = Compose.getSubject();
        assert.equal(txt, '', 'Nothing in the txt');
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
        Compose.clearListeners();
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
      });
      teardown(function() {

        Compose.clear();
      });

      test('Draft with text', function() {
        Compose.fromDraft(d1);
        assert.equal(Compose.getContent(), d1.content.join(''));
      });

      test('Place cursor at the end of the compose field', function() {
        var mockSelection = {
          selectAllChildren: function() {},
          collapseToEnd: function() {}
        };

        this.sinon.stub(window, 'getSelection').returns(mockSelection);
        this.sinon.spy(mockSelection, 'selectAllChildren');
        this.sinon.spy(mockSelection, 'collapseToEnd');
        Compose.fromDraft(d1);

        sinon.assert.calledOnce(mockSelection.selectAllChildren);
        sinon.assert.calledWith(mockSelection.selectAllChildren, message);
        sinon.assert.calledOnce(mockSelection.collapseToEnd);
      });

      test('Draft with subject', function() {
        assert.isFalse(Compose.isSubjectVisible);
        Compose.fromDraft(d1);
        assert.equal(Compose.getSubject(), d1.subject);
        assert.isTrue(Compose.isSubjectVisible);
      });

      test('Draft without subject', function() {
        Compose.fromDraft(d2);
        assert.isFalse(Compose.isSubjectVisible);
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
        Compose.toggleSubject();
        assert.isTrue(ThreadUI.draft.isEdited);
      });

      test('Changing attachments', function() {
        Compose.append(mockAttachment(12345));
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
        var req = Compose.requestAttachment();
        req.onsuccess = function(attachment) {
          assert.instanceOf(attachment, Attachment);

          // TODO: Move these assertions to a higher-level test suite that
          // concerns interactions between disparate units.
          // See: Bug 868056
          assert.equal(attachment.name, activity.result.name);
          assert.equal(attachment.blob, activity.result.blob);

          done();
        };

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
        var req = Compose.requestAttachment();
        req.onerror = function() {
          assert.ok(true);
          done();
        };

        // Simulate an unsuccessful 'pick' MozActivity
        var activity = MockMozActivity.instances[0];
        activity.onerror();
      });
      test('Triggers a "file too large" error when the returned file ' +
        'exceeds the maxmium MMS size limit', function(done) {
        var req = Compose.requestAttachment();
        var activity = MockMozActivity.instances[0];
        var origLimit = Settings.mmsSizeLimitation;
        var largeBlob;

        Settings.mmsSizeLimitation = 45;
        largeBlob = new Blob([
          new Array(Settings.mmsSizeLimitation + 3).join('a')
        ]);

        req.onerror = function(err) {
          assert.equal(err, 'file too large');
          Settings.mmsSizeLimitation = origLimit;
          done();
        };

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
        Compose.append(mockAttachment(12345));
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

      test('Attaching one image', function(done) {
        var actualSize;
        function onInput() {
          if (!Compose.isResizing) {
            done(function() {
              Compose.off('input', onInput);
              var img = Compose.getContent();
              assert.equal(img.length, 1, 'One image');
              assert.notEqual(actualSize, Compose.size,
                'the size was recalculated after resizing');
            });
          }
        }
        Compose.on('input', onInput);
        Compose.append(mockImgAttachment());
        // we store this so we can make sure it gets resized
        actualSize = Compose.size;
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
      var form;
      var expectType;

      function typeChange(event) {
        assert.equal(Compose.type, expectType);
        typeChange.called++;
      }

      setup(function() {
        expectType = 'sms';
        Compose.clear();
        typeChange.called = 0;
        form = document.getElementById('messages-compose-form');

        Compose.on('type', typeChange);
      });

      teardown(function() {
        Compose.off('type', typeChange);
      });

      test('Message switches type when adding/removing attachment',
        function() {
        expectType = 'mms';
        Compose.append(mockAttachment());
        assert.equal(typeChange.called, 1);

        expectType = 'sms';
        Compose.clear();
        assert.equal(typeChange.called, 2);
      });

      test('Message switches type when adding/removing subject',
        function() {
        expectType = 'mms';
        Compose.toggleSubject();
        subject.textContent = 'foo';
        subject.dispatchEvent(new CustomEvent('input'));
        assert.equal(typeChange.called, 1);

        expectType = 'sms';
        Compose.clear();
        assert.equal(typeChange.called, 2);
      });
    });

    suite('changing inputmode', function() {
      test('initial inputmode is sms', function() {
        assert.equal(message.getAttribute('x-inputmode'), '-moz-sms');
      });

      test('changing type to mms', function() {
        var subjectNode = document.getElementById('messages-subject-input');
        subjectNode.textContent = 'some subject';
        Compose.toggleSubject();

        assert.isFalse(message.hasAttribute('x-inputmode'));
      });

      test('changing type to mms then sms', function() {
        var subjectNode = document.getElementById('messages-subject-input');
        subjectNode.textContent = 'some subject';
        Compose.toggleSubject();
        Compose.toggleSubject();

        assert.equal(message.getAttribute('x-inputmode'), '-moz-sms');
      });
    });

    suite('Compose fromMessage', function() {
      setup(function() {
        this.sinon.spy(Compose, 'append');
        this.sinon.spy(HTMLElement.prototype, 'focus');
        this.sinon.stub(SMIL, 'parse');
      });
      test('from sms', function() {
        Compose.fromMessage({type: 'sms', body: 'test'});
        sinon.assert.called(Compose.append);
        sinon.assert.called(message.focus);
      });

      test('from mms', function() {
        var testString = ['test\nstring 1\nin slide 1',
                          'test\nstring 2\nin slide 2'];
        Compose.fromMessage({type: 'mms'});

        // Should not be focused before parse complete.
        sinon.assert.notCalled(message.focus);
        assert.isTrue(message.classList.contains('ignoreEvents'));
        SMIL.parse.yield([{text: testString[0]}, {text: testString[1]}]);

        sinon.assert.called(Compose.append);
        sinon.assert.called(message.focus);
        assert.isFalse(message.classList.contains('ignoreEvents'));
      });

      test('empty body', function() {
        Compose.fromMessage({type: 'sms', body: null});
        sinon.assert.calledWith(Compose.append, null);
        sinon.assert.called(message.focus);
      });
    });

    suite('attach button', function() {
      var request;
      setup(function() {
        request = {};
        this.sinon.stub(Compose, 'requestAttachment').returns(request);
        this.sinon.stub(window, 'alert');
        this.sinon.stub(Compose, 'append');
        this.sinon.stub(console, 'warn');

        attachButton.click();
      });

      test('request an attachment', function() {
        sinon.assert.called(Compose.requestAttachment);
      });

      test('onsuccess', function() {
        var attachment = mockAttachment();
        request.onsuccess(attachment);
        sinon.assert.calledWith(Compose.append, attachment);
      });

      suite('onerror,', function() {
        test('file too large', function() {
          request.onerror('file too large');

          sinon.assert.calledWith(window.alert, 'files-too-large{"n":1}');
        });

        test('other errors are logged', function() {
          var err = 'other error';
          request.onerror(err);
          sinon.assert.notCalled(window.alert);
          sinon.assert.calledWith(console.warn, sinon.match.string, err);
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
          subject.textContent = 'Title';
          Compose.toggleSubject(); // show the subject
          subject.dispatchEvent(new CustomEvent('input'));
          assert.isFalse(sendButton.disabled);
        });

        test('disabled when there is subject input, but is hidden', function() {
          sendButton.disabled = false;

          subject.textContent = 'Title';
          subject.dispatchEvent(new CustomEvent('input'));
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
          Compose.append(mockAttachment(512));
          Compose.append('sigh');
          Compose.append(mockAttachment(512));
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

            Compose.append(mockAttachment(1024));

            assert.isFalse(sendButton.disabled);
          });

          suite('when there is visible subject with input...', function() {
            setup(function() {
              subject.textContent = 'Title';
              Compose.toggleSubject();
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
              Compose.toggleSubject();
              subject.textContent = 'Title';
              subject.dispatchEvent(new CustomEvent('input'));
              assert.isFalse(sendButton.disabled);
            });

            test('when message input size is at the maximum', function() {
              Settings.mmsSizeLimitation = 1024;

              Compose.append(mockAttachment(1024));

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

            Compose.append(mockAttachment(295 * 1024));

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
              subject.textContent = 'Title';
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
            Compose.append(mockAttachment(512));
            Compose.append('sigh');
            Compose.append(mockAttachment(512));
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

  suite('Attachment pre-send menu', function() {
    setup(function() {
      this.attachment = mockImgAttachment();
      Compose.clear();
      Compose.append(this.attachment);
      this.attachmentSize = Compose.size;
      this.sinon.stub(AttachmentMenu, 'open');
      this.sinon.stub(AttachmentMenu, 'close');

      // trigger a click on attachment
      this.attachment.mNextRender.click();
    });

    test('click opens menu', function() {
      assert.isTrue(AttachmentMenu.open.called);
    });
    test('open called with correct attachment', function() {
      assert.ok(AttachmentMenu.open.calledWith(this.attachment));
    });
    suite('clicking on buttons', function() {
      suite('view', function() {
        setup(function() {
          this.sinon.stub(this.attachment, 'view');

          // trigger click on view
          document.getElementById('attachment-options-view').click();
        });
        test('clicking on view calls attachment.view', function() {
          assert.isTrue(this.attachment.view.called);
        });
      });

      suite('remove', function() {
        setup(function() {
          // trigger click on remove
          document.getElementById('attachment-options-remove').click();
        });
        test('removes the original attachment', function() {
          assert.ok(!this.attachment.mNextRender.parentNode);
        });
        test('closes the menu', function() {
          assert.isTrue(AttachmentMenu.close.called);
        });
        test('recalculates size', function() {
          assert.equal(Compose.size, 0, 'size should be 0 after remove');
          assert.notEqual(Compose.size, this.attachmentSize,
            'size is changed after removing attachment');
        });
      });

      suite('cancel', function() {
        setup(function() {
          // trigger click on close
          document.getElementById('attachment-options-cancel').click();
        });
        test('closes the menu', function() {
          assert.isTrue(AttachmentMenu.close.called);
        });
      });

      suite('replace', function() {
        var request;

        setup(function() {
          this.replacement = mockImgAttachment(true);
          request = {};
          this.sinon.stub(Compose, 'requestAttachment').returns(request);
          this.sinon.stub(Utils, 'getResizedImgBlob');

          // trigger click on replace
          document.getElementById('attachment-options-replace').click();
        });

        suite('onsuccess', function() {
          setup(function() {
            request.onsuccess(this.replacement);
          });

          test('clicking on replace requests an attachment', function() {
            assert.isTrue(Compose.requestAttachment.called);
          });
          test('removes the original attachment', function() {
            assert.ok(!this.attachment.mNextRender.parentNode);
          });
          test('inserts the new attachment', function() {
            assert.ok(this.replacement.mNextRender.parentNode);
          });
          test('closes the menu', function() {
            assert.isTrue(AttachmentMenu.close.called);
          });
          test('recalculates size', function() {
            assert.notEqual(Compose.size, this.attachmentSize,
              'Size was recalculated to be the new size');
          });
          test('resizes image', function() {
            assert.ok(Utils.getResizedImgBlob.called);
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
            this.sinon.stub(window, 'alert');
            this.sinon.stub(console, 'warn');
          });

          test('file too large', function() {
            request.onerror('file too large');
            sinon.assert.calledWith(
              window.alert,
              'files-too-large{"n":1}'
            );
          });

          test('other errors are logged', function() {
            var err = 'other error';
            request.onerror(err);
            sinon.assert.notCalled(window.alert);
            sinon.assert.calledWith(console.warn, sinon.match.string, err);
          });
        });
      });
    });
  });

  suite('Image attachment pre-send menu', function() {
    setup(function() {
      this.sinon.stub(AttachmentMenu, 'open');
      this.sinon.stub(AttachmentMenu, 'close');
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
            sinon.assert.called(AttachmentMenu.open, 'Menu should popup');
          });
        }
      }
      Compose.on('input', onInput);
      Compose.append(imageAttachment);
      imageAttachment.mNextRender.click();
      sinon.assert.notCalled(
        AttachmentMenu.open,
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

    function toggleSubject() {
      var subjectNode = document.getElementById('messages-subject-input');
      subjectNode.textContent = 'some subject';
      Compose.toggleSubject();
    }

    function setInput(string) {
      var message = document.getElementById('messages-input');
      message.textContent = string;

      var event = new InputEvent('input', { bubbles: true, cancelable: true });
      message.dispatchEvent(event);

      clock.tick(UPDATE_DELAY);

      return waitForSegmentinfo();
    }

    // Wait "count" segmentinfochange events. (default: 1)
    function waitForSegmentinfo(count) {
      count = count || 1;

      var resolveFunction;
      return new Promise(function(resolve, reject) {
        Compose.on('segmentinfochange', resolve);
        resolveFunction = resolve;
      }).then(function() {
        if (--count === 0) {
          Compose.off('segmentinfochange', resolveFunction);
        }
      });
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
        Compose.clearListeners();
      }).then(done, done);
    });

    test('updates when input is entered', function(done) {
      setInput('some text').then(function() {
        assert.deepEqual(Compose.segmentInfo, expected);
        assert.equal(Compose.type, 'sms');
      }).then(done, done);
    });

    test('updates when subject is removed', function(done) {
      toggleSubject();
      setInput('some text').then(function() {
        assert.equal(Compose.type, 'mms');
        toggleSubject();
        assert.deepEqual(Compose.segmentInfo, expected);
        assert.equal(Compose.type, 'sms');
      }).then(done, done);
    });

    test('has the default value if there is an error', function(done) {
      segmentInfoPromise = Promise.reject(new Error('error'));
      MessageManager.getSegmentInfo.returns(segmentInfoPromise);

      setInput('some text').then(function() {
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

      setInput('some text').then(function() {
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

      setInput('some text').then(function() {
        segmentInfoPromise = Promise.resolve(result2);
        MessageManager.getSegmentInfo.returns(segmentInfoPromise);
        return setInput('some text');
      }).then(function() {
        assert.deepEqual(Compose.segmentInfo, result2);
        assert.equal(Compose.type, 'sms');
      }).then(done, done);
    });

    test('returns the empty segmentInfo when text is empty', function(done) {
      setInput('some text').then(function() {
        MessageManager.getSegmentInfo.reset();
        return setInput('');
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
          assert.deepEqual(results, [ segmentInfo1, segmentInfo2 ]);
        }).then(done, done);
      });

      test('2 segment info requests return unordered', function(done) {
        deferred2.resolve(segmentInfo2);
        deferred1.resolve(segmentInfo1);

        waitForSegmentinfo(2).then(function() {
          // note: this is wrong, but this won't happen in real life
          assert.deepEqual(results, [ segmentInfo2, segmentInfo1 ]);
        }).then(done, done);
      });
    });
  });
});
