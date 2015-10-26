/* global MP4Metadata, fetchBuffer, makeBlobView, readPicSlice,
   assertBuffersEqual, pass, fail */
'use strict';

require('/test/unit/metadata/utils.js');
require('/js/metadata/mp4.js');

suite('mp4', function () {
  var expectedPicture;
  setup(function(done) {
    fetchBuffer('/test-data/album-art.jpg').then(function(buffer) {
      expectedPicture = buffer;
      done();
    });
  });

  test('m4a tags', function(done) {
    var blob;
    fetchBuffer('/test-data/aac-tags.m4a')
      .then(function(buffer) {
        return (blob = new Blob([buffer]));
      })
      .then(makeBlobView)
      .then(MP4Metadata.parse)
      .then(function(metadata) {
        assert.strictEqual(metadata.tag_format, 'mp4');
        assert.strictEqual(metadata.artist, 'The Tragically Hip');
        assert.strictEqual(metadata.album, 'Trouble At The Henhouse');
        assert.strictEqual(metadata.title, 'Giftshop');
        assert.strictEqual(metadata.tracknum, 1);
        assert.strictEqual(metadata.trackcount, 12);
        assert.strictEqual(metadata.discnum, 1);
        assert.strictEqual(metadata.disccount, 1);
        assert.strictEqual(metadata.picture.flavor, 'embedded');
        assert.strictEqual(metadata.picture.type, 'image/jpeg');

        return readPicSlice(blob, metadata.picture);
      })
      .then(function(buffer) {
        assertBuffersEqual(buffer, expectedPicture);
      })
      .then(pass(done), fail(done));
  });

});
