/* global ID3v1Metadata, fetchBlobView, pass, fail */
'use strict';

require('/test/unit/metadata/utils.js');
require('/js/metadata/id3v1.js');

suite('id3v1 tags', function() {

  test('id3v1', function(done) {
    fetchBlobView('/test-data/id3v1-simple.mp3')
      .then(ID3v1Metadata.parse)
      .then(function(metadata) {
        assert.strictEqual(metadata.tag_format, 'id3v1');
        assert.strictEqual(metadata.artist, 'AC/DC');
        assert.strictEqual(metadata.album, 'Dirty Deeds Done Dirt Cheap');
        assert.strictEqual(metadata.title, 'Problem Child');
        assert.strictEqual(metadata.tracknum, 5);
        assert.strictEqual(metadata.trackcount, undefined);
      })
      .then(pass(done), fail(done));
  });

  test('no metadata', function(done) {
    fetchBlobView('/test-data/no-tag.mp3')
      .then(ID3v1Metadata.parse)
      .then(function(metadata) {
        assert.deepEqual(metadata, {});
      })
      .then(pass(done), fail(done));
  });

});
