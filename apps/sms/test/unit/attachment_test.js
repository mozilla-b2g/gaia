'use strict';

requireApp('sms/js/attachment.js');
requireApp('sms/js/utils.js');

requireApp('sms/test/unit/mock_attachment_menu.js');
requireApp('sms/test/unit/mock_l10n.js');
requireApp('sms/test/unit/mock_utils.js');

var MocksHelperForAttachment = new MocksHelper([
  'AttachmentMenu',
  'Utils'
]).init();

suite('attachment_test.js', function() {
  MocksHelperForAttachment.attachTestHelpers();

  var testImageBlob;
  var testImageBlob_small;
  var testImageBlob_bogus;
  var testAudioBlob;
  var testVideoBlob;

  suiteSetup(function(done) {
    this.realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    // create a bogus image blob (should be rendered with a `corrupted' class)
    testImageBlob_bogus = new Blob(['This is an image message'], {
      type: 'image/jpeg'
    });

    // create sample blobs from real files: image, audio, video
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
      testImageBlob_small = blob; // image < 400 kB => create thumbnail
    });
    getAsset('/test/unit/media/IMG_0554.jpg', function(blob) {
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
    navigator.mozL10n = this.realMozL10n;
  });

  setup(function() {
    loadBodyHTML('/index.html');
    AttachmentMenu.init('attachment-options-menu');
  });

  test('Name property defaults to a string value', function() {
    var attachment = new Attachment(new Blob());
    assert.typeOf(attachment.name, 'string');
  });

  test('render bogus image attachment', function(done) {
    var attachment = new Attachment(testImageBlob_bogus, {
      name: 'Image attachment'
    });
    var el = attachment.render(function() {
      assert.ok(el.src, 'src set');
      assert.include(el.classList, 'attachment');
      assert.equal(el.dataset.attachmentType, 'img');
      // broken image => there should be a `corrupted' class
      assert.include(el.src, 'corrupted');
      done();
    });
  });

  test('render small image attachment (thumbnail)', function(done) {
    var attachment = new Attachment(testImageBlob_small, {
      name: 'Image attachment'
    });
    var el = attachment.render(function() {
      assert.ok(el.src, 'src set');
      assert.include(el.classList, 'attachment');
      assert.equal(el.dataset.attachmentType, 'img');
      // image < 400 kB => there should be a dataURL thumbnail
      assert.include(el.src, 'background');
      assert.include(el.src, 'data:image');
      assert.ok(el.src.indexOf('corrupted') < 0);
      done();
    });
  });

  test('render big image attachment', function(done) {
    var attachment = new Attachment(testImageBlob, {
      name: 'Image attachment'
    });
    var el = attachment.render(function() {
      assert.ok(el.src, 'src set');
      assert.include(el.classList, 'attachment');
      assert.equal(el.dataset.attachmentType, 'img');
      assert.ok(el.src.indexOf('corrupted') < 0);
      done();
    });
  });

  test('render audio attachment', function(done) {
    var attachment = new Attachment(testAudioBlob, {
      name: 'Audio attachment'
    });
    var el = attachment.render(function() {
      assert.ok(el.src, 'src set');
      assert.include(el.classList, 'attachment');
      assert.equal(el.dataset.attachmentType, 'audio');
      assert.ok(el.src.indexOf('corrupted') < 0);
      done();
    });
  });

  test('render video attachment', function(done) {
    var attachment = new Attachment(testVideoBlob, {
      name: 'Video attachment'
    });
    var el = attachment.render(function() {
      assert.ok(el.src, 'src set');
      assert.include(el.classList, 'attachment');
      assert.equal(el.dataset.attachmentType, 'video');
      assert.ok(el.src.indexOf('corrupted') < 0);
      done();
    });
  });

});
