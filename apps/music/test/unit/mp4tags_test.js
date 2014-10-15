/* global parseMetadata */
'use strict';


require('/test/unit/metadata_utils.js');

suite('m4a tags', function() {
  setup(function() {
    this.timeout(1000);
  });

  test('m4a tags', function(done) {
    parseMetadata('/test-data/aac-tags.m4a').then(function(metadata) {
      done(function() {
        assert.strictEqual(metadata.tag_format, 'mp4');
        assert.strictEqual(metadata.artist, 'The Tragically Hip');
        assert.strictEqual(metadata.album, 'Trouble At The Henhouse');
        assert.strictEqual(metadata.title, 'Giftshop');
        assert.strictEqual(metadata.tracknum, 1);
        assert.strictEqual(metadata.trackcount, 12);
        assert.strictEqual(metadata.discnum, 1);
        assert.strictEqual(metadata.disccount, 1);
      });
    });
  });
});
