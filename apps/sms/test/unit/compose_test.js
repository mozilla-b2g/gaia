/*
  Compose Tests
*/

/*global mocha, MocksHelper, MockAttachment, MockL10n, loadBodyHTML, ThreadUI,
         Compose, Attachment, MockMozActivity, Settings, Utils,
         AttachmentMenu */

'use strict';

mocha.globals(['0', '6']);

requireApp('sms/js/compose.js');
requireApp('sms/js/thread_ui.js');
requireApp('sms/js/utils.js');

requireApp('sms/test/unit/mock_l10n.js');
requireApp('sms/test/unit/mock_attachment.js');
requireApp('sms/test/unit/mock_attachment_menu.js');
requireApp('sms/test/unit/mock_recipients.js');
requireApp('sms/test/unit/mock_settings.js');
requireApp('sms/test/unit/mock_utils.js');
requireApp('sms/test/unit/mock_moz_activity.js');

var mocksHelperForCompose = new MocksHelper([
  'AttachmentMenu',
  'Settings',
  'Recipients',
  'Utils',
  'MozActivity',
  'Attachment'
]).init();

suite('compose_test.js', function() {
  mocksHelperForCompose.attachTestHelpers();
  var realMozL10n;
  var oversizedImageBlob,
      smallImageBlob;

  function mockAttachment(size) {
    var attachment = new MockAttachment({
      type: 'audio/ogg',
      size: size || 12345
    }, 'audio.oga');
    return attachment;
  }

  function mockImgAttachment(isOversized) {
    var attachment = isOversized ?
      new MockAttachment(oversizedImageBlob, 'oversized.jpg') :
      new MockAttachment(smallImageBlob, 'small.jpg');
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

  suite('Message Composition', function() {
    var message;

    setup(function() {
      loadBodyHTML('/index.html');
      // if we don't do the ThreadUI.init - it breaks when run in a full suite
      ThreadUI.init();
      // Compose.init('messages-compose-form');
      message = document.querySelector('[contenteditable]');
    });

    suite('Placeholder', function() {
      setup(function(done) {
        Compose.clear();
        done();
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
    });

    suite('Message insert, append, prepend', function() {
      test('Message appended', function() {
        Compose.append('start');
        var txt = Compose.getContent();
        assert.equal(txt[0], 'start', 'text is appended');
      });
      test('Message prepend', function() {
        Compose.append('end');
        Compose.prepend('start');
        var txt = Compose.getContent();
        assert.equal(txt[0], 'startend', 'text is inserted at beginning');
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
        Compose.type = 'sms';
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

      test('changing type', function() {
        Compose.type = 'mms';
        assert.isFalse(onInput.called);
        assert.ok(onType.called);
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
        Compose.append('<br>');
        Compose.append('end');
        var txt = Compose.getContent();
        assert.equal(txt.length, 1, 'Single text content');
        assert.equal(txt[0], 'start\nend', 'output includes a line break');
      });
      test('Trailing line breaks not stripped', function() {
        Compose.append('start');
        Compose.append('<br>');
        Compose.append('end');
        Compose.append(new Array(5).join('<br>'));
        var expected = 'start\nend\n\n\n\n';
        var txt = Compose.getContent();
        assert.equal(txt.length, 1, 'Single text content');
        assert.equal(txt[0], expected, 'correct content');
      });
      test('Text with non-break spaces', function() {
        Compose.append('start');
        Compose.append('&nbsp;');
        Compose.append('&nbsp;');
        Compose.append('&nbsp;');
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
        Compose.append('<br><br><br><br>');
        Compose.append(mockAttachment());
        Compose.append('end');
        var txt = Compose.getContent();
        assert.equal(txt.length, 3, 'Three lines in txt');
        assert.equal(txt[0], 'start\n\n\n\n', 'First line is start text');
        assert.ok(txt[1] instanceof MockAttachment, 'Sub 1 is an attachment');
        assert.equal(txt[2], 'end', 'Last line is end text');
      });
      teardown(function() {
        Compose.clear();
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
      var realgetResizedImgBlob;
      setup(function() {
        Compose.clear();
      });
      suiteSetup(function() {
        realgetResizedImgBlob = Utils.getResizedImgBlob;
        Utils.getResizedImgBlob = function mockResize() {
          Utils.getResizedImgBlob.args = arguments;
          realgetResizedImgBlob.apply(null, arguments);
        };
      });
      suiteTeardown(function() {
        Utils.getResizedImgBlob = realgetResizedImgBlob;
      });
      test('Attaching one image', function(done) {
        var actualSize;
        function onInput() {
          if (!Compose.isResizing) {
            Compose.off('input', onInput);
            var img = Compose.getContent();
            assert.equal(img.length, 1, 'One image');
            assert.notEqual(actualSize, Compose.size,
              'the size was recalculated after resizing');
            done();
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
            } else {
              Compose.off('input', onInput);
              assert.equal(images.length, 2, 'two images');
              assert.equal(Compose.getContent()[1], 'append more image',
                'Second attachment is text');
              assert.isTrue(Utils.getResizedImgBlob.args[1] ===
                            Settings.mmsSizeLimitation * 0.4,
                'getResizedImgBlob should set to 2/5 MMS size');
              assert.isTrue(Compose.getContent()[2].size <
                            Settings.mmsSizeLimitation * 0.4,
                'Image attachment is resized');
              done();
            }
          }
        }
        Compose.on('input', onInput);
        Compose.append(mockImgAttachment(true));
        Compose.append('append more image');
      });
      test('Third image attached, size limitation should changed',
        function(done) {
        function onInput() {
          if (!Compose.isResizing) {
            var images = Compose.getContent();
            if (images.length < 3) {
              Compose.append(mockImgAttachment(true));
            } else {
              Compose.off('input', onInput);
              assert.equal(images.length, 3, 'three images');
              assert.isTrue(Utils.getResizedImgBlob.args[1] ===
                            Settings.mmsSizeLimitation * 0.2,
                'getResizedImgBlob should set to 1/5 MMS size');
              images.forEach(function(img) {
                assert.isTrue(img.size < Settings.mmsSizeLimitation * 0.2,
                  'Image attachment is resized');
              });
              done();
            }
          }
        }
        Compose.on('input', onInput);
        Compose.append(mockImgAttachment());
      });
    });

    suite('Message Type Events', function() {
      var form;
      var expectType = 'sms';

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
    });

    suite('changing inputmode', function() {
      test('initial inputmode is sms', function() {
        assert.equal(message.getAttribute('x-inputmode'), '-moz-sms-7bit');
      });

      test('changing type to mms', function() {
        Compose.type = 'mms';

        assert.isFalse(message.hasAttribute('x-inputmode'));
      });

      test('changing type to mms then sms', function() {
        Compose.type = 'mms';
        Compose.type = 'sms';

        assert.equal(message.getAttribute('x-inputmode'), '-moz-sms-7bit');
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
        setup(function(done) {
          this.replacement = mockImgAttachment(true);
          this.sinon.stub(Compose, 'requestAttachment', function() {
            var mockResult = {};
            setTimeout(function() {
              mockResult.onsuccess(this.replacement);
              this.replacementSize = Compose.size;
              done();
            }.bind(this));
            return mockResult;
          }.bind(this));
          this.sinon.stub(Utils, 'getResizedImgBlob');

          // trigger click on replace
          document.getElementById('attachment-options-replace').click();
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
          assert.notEqual(this.replacementSize, this.attachmentSize,
            'Size was recalculated to be the new size');
        });
        test('resizes image', function() {
          assert.ok(Utils.getResizedImgBlob.called);
        });
        suite('after resize', function() {
          setup(function() {
            Utils.getResizedImgBlob.args[0][2](smallImageBlob);
          });

          test('recalculates size again', function() {
            assert.notEqual(Compose.size, this.replacementSize);
          });
        });
      });
    });
  });

  suite('Image attachment pre-send menu', function() {
    setup(function() {
      this.sinon.stub(AttachmentMenu, 'open');
      this.sinon.stub(AttachmentMenu, 'close');
    });
    test('click opens menu while resizing and resize complete', function(done) {
      Compose.clear();
      var imageAttachment = mockImgAttachment(true);
      function onInput() {
        if (!Compose.isResizing) {
          Compose.off('input', onInput);
          imageAttachment.mNextRender.click();
          assert.isTrue(AttachmentMenu.open.called, 'Menu should popup');
          done();
        }
      }
      Compose.on('input', onInput);
      Compose.append(imageAttachment);
      imageAttachment.mNextRender.click();
      assert.isFalse(AttachmentMenu.open.called,
        'Menu could not be opened while ressizing');
    });
  });
});

