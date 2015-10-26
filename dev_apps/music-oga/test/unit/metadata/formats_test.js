/* global FLACMetadata, ForwardLockMetadata, ID3v1Metadata, ID3v2Metadata,
   MP4Metadata, OggMetadata, MetadataFormats, fetchBlobView, fetchBuffer,
   ForwardLock, makeBlobView, pass, fail */
'use strict';

require('/test/unit/metadata/utils.js');
require('/shared/js/omadrm/fl.js');
require('/js/metadata/flac.js');
require('/js/metadata/forward_lock.js');
require('/js/metadata/id3v1.js');
require('/js/metadata/id3v2.js');
require('/js/metadata/mp4.js');
require('/js/metadata/ogg.js');

suite('format deduction', function() {
  // Define the tests we want to run; note that `module` is a getter because
  // the modules won't be loaded by the time this code is run.
  var formats = [
    {name: 'flac', file: '/test-data/vorbis-c.flac',
     get module() { return FLACMetadata; }},
    {name: 'mp3 (id3v1)', file: '/test-data/id3v1-simple.mp3',
     get module() { return ID3v1Metadata; }},
    {name: 'mp3 (id3v2)', file: '/test-data/id3v2.4-simple-latin1.mp3',
     get module() { return ID3v2Metadata; }},
    {name: 'mp3 (id3v1+2)', file: '/test-data/id3v1+2-simple.mp3',
     get module() { return ID3v2Metadata; }},
    {name: 'flac', file: '/test-data/aac-tags.m4a',
     get module() { return MP4Metadata; }},
    {name: 'ogg', file: '/test-data/vorbis-c.ogg',
     get module() { return OggMetadata; }},
  ];

  formats.forEach(function(fmt) {
    test(fmt.name, function(done) {
      fetchBlobView(fmt.file)
        .then(MetadataFormats.findParser)
        .then(function(parser) {
          assert.strictEqual(parser._formatInfo.module, fmt.module);
        })
        .then(pass(done), fail(done));
    });
  });

  test('forwardlock', function(done) {
    fetchBuffer('/test-data/no-tag.mp3')
      .then(function(buffer) {
        return ForwardLock.lockBuffer(
          0xDEADBEEF, buffer, 'audio/mpeg', {}
        );
      })
      .then(makeBlobView)
      .then(MetadataFormats.findParser)
      .then(function(parser) {
        assert.strictEqual(parser._formatInfo.module, ForwardLockMetadata);
      })
      .then(pass(done), fail(done));
  });

});
