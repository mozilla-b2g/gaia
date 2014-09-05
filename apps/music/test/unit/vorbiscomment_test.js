/* global parseMetadata */
'use strict';

require('/test/unit/metadata_utils.js');

suite('vorbis comment', function() {
  setup(function() {
    this.timeout(1000);
  });

  test('vorbis comment', function(done) {
    parseMetadata('/test-data/vorbis-c.ogg',
                function(metadata) {
                  assert.equal(metadata.artist, 'Angra');
                  assert.equal(metadata.album, 'Holy Land');
                  assert.equal(metadata.title, 'Carolina IV');
                  assert.equal(metadata.tracknum, 4);
                }, done);
  });
});
