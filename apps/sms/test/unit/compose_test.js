/*
  Compose Tests
*/
'use strict';

mocha.globals(['0']);

requireApp('sms/js/compose.js');
requireApp('sms/js/utils.js');
requireApp('sms/js/thread_ui.js');

requireApp('sms/test/unit/mock_l10n.js');
requireApp('sms/test/unit/mock_attachment.js');
requireApp('sms/test/unit/mock_recipients.js');
requireApp('sms/test/unit/mock_utils.js');
requireApp('sms/test/unit/mock_moz_activity.js');

var mocksHelper = new MocksHelper([
  'Recipients',
  'Utils',
  'MozActivity',
  'Attachment'
]).init();

suite('compose_test.js', function() {
  mocksHelper.attachTestHelpers();

  suite('Message Composition', function() {

    var message;
    var realMozL10n;

    suiteSetup(function() {
      realMozL10n = navigator.mozL10n;
      navigator.mozL10n = MockL10n;
    });
    suiteTeardown(function() {
      navigator.mozL10n = realMozL10n;
    });

    setup(function() {
      loadBodyHTML('/index.html');
      ThreadUI.init();
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
        var attachment = new MockAttachment('image',
                       '/test/unit/media/IMG_0554.jpg', '12345');
        attachment.mNextRender = document.createElement('iframe');
        Compose.append(attachment);
        var txt = Compose.getContent();
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
        var attachment = new MockAttachment('image',
                       '/test/unit/media/IMG_0554.jpg', '12345');
        attachment.mNextRender = document.createElement('iframe');
        Compose.append(attachment);
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
      test('Just attachment', function() {
        var attachment = new MockAttachment('image',
                       '/test/unit/media/IMG_0554.jpg', '12345');
        attachment.mNextRender = document.createElement('iframe');
        Compose.append(attachment);
        var txt = Compose.getContent();
        // clearing to remove the iframe so that mocha doesn't
        // get alarmed at window[0] pointing to the iframe
        Compose.clear();
        assert.equal(txt.length, 1, 'One line in txt');
        assert.ok(txt[0] instanceof MockAttachment, 'Sub 0 is an attachment');
      });
      test('Attachment in middle of text', function() {
        var attachment = new MockAttachment('image',
                       '/test/unit/media/IMG_0554.jpg', '54321');
        attachment.mNextRender = document.createElement('iframe');
        Compose.append('start');
        Compose.append(attachment);
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
        var attachment = new MockAttachment('image',
                       '/test/unit/media/IMG_0554.jpg', '55555');
        attachment.mNextRender = document.createElement('iframe');
        Compose.append('start');
        Compose.append('<br><br><br><br>');
        Compose.append(attachment);
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
          assert.equal(attachment.type, 'image');
          assert.equal(attachment.size, 0);
          assert.match(attachment.uri, /^blob:.+$/);
          done();
        };

        // Simulate a successful 'pick' MozActivity
        var activity = MockMozActivity.instances[0];
        activity.result = {
          type: 'image/jpeg',
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
    });

    suite('Message Attachment Iframe', function() {
      setup(function() {
        Compose.clear();
      });

      test('Attaching creates iframe.attachment', function() {
        var attachment = new MockAttachment('image',
                       '/test/unit/media/IMG_0554.jpg', '12345');
        attachment.mNextRender = document.createElement('iframe');
        attachment.mNextRender.className = 'attachment';
        Compose.append(attachment);
        var iframes = message.querySelectorAll('iframe');
        var txt = Compose.getContent();
        // clearing to remove the iframe so that mocha doesn't
        // get alarmed at window[0] pointing to the iframe
        Compose.clear();
        assert.equal(iframes.length, 1, 'One iframe');
        assert.ok(iframes[0].classList.contains('attachment'), '.attachment');
        assert.ok(txt[0] === attachment, 'iframe WeakMap\'d to attachment');
      });
    });
  });
});
