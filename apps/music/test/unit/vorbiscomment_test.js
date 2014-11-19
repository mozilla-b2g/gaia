/* global parseMetadata */
'use strict';

require('/test/unit/metadata_utils.js');

suite('vorbis comment', function() {
  setup(function() {
    this.timeout(1000);
  });

  test('vorbis comment', function(done) {
    parseMetadata('/test-data/vorbis-c.ogg').then(function(metadata) {
      done(function() {
        assert.strictEqual(metadata.tag_format, 'vorbis');
        assert.strictEqual(metadata.artist, 'Angra');
        assert.strictEqual(metadata.album, 'Holy Land');
        assert.strictEqual(metadata.title, 'Carolina IV');
        assert.strictEqual(metadata.tracknum, 4);
        assert.strictEqual(metadata.trackcount, 10);
        assert.strictEqual(metadata.discnum, 1);
        assert.strictEqual(metadata.disccount, 1);
      });
    });
  });
});
