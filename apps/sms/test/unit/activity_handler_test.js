'use strict';

requireApp('sms/js/activity_handler.js');

requireApp('sms/test/unit/mock_attachment.js');
requireApp('sms/test/unit/mock_compose.js');

var mocksHelper = new MocksHelper([
  'Attachment',
  'Compose'
]).init();

suite('ActivityHandler', function() {
  mocksHelper.attachTestHelpers();

  suite('"share" activity', function() {

    setup(function() {
      this.prevHash = window.location.hash;
      this.shareActivity = {
        source: {
          name: 'share',
          data: {
            blobs: [new Blob(), new Blob()],
            filenames: ['testBlob1', 'testBlob2']
          }
        }
      };
      this.prevAppend = Compose.append;
    });
    teardown(function() {
      window.location.hash = this.prevHash;
      Compose.append = this.prevAppend;
    });

    test('modifies the URL "hash" when necessary', function() {
      window.location.hash = '#wrong-location';
      ActivityHandler.global(this.shareActivity);
      assert.equal(window.location.hash, '#new');
    });

    test('Appends an attachment to the Compose field for each media file',
      function(done) {
      Compose.append = sinon.spy(function(attachment) {

        assert.instanceOf(attachment, Attachment);
        assert.ok(Compose.append.callCount < 3);

        if (Compose.append.callCount === 2) {
          done();
        }
      });

      ActivityHandler.global(this.shareActivity);
    });
  });

});
