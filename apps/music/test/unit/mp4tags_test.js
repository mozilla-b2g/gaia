/* global parseMetadata */
'use strict';


require('/test/unit/metadata_utils.js');

suite('m4a tags', function() {
  setup(function() {
    this.timeout(1000);
  });

  test('m4a tags', function(done) {
    parseMetadata('/test-data/aac-tags.m4a',
                  function(metadata) {
                    assert.equal(metadata.artist, 'The Tragically Hip');
                    assert.equal(metadata.album, 'Trouble At The Henhouse');
                    assert.equal(metadata.title, 'Giftshop');
                    assert.equal(metadata.tracknum, 1);
                  }, done);
  });
});
