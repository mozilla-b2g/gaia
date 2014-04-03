/* global parseAudioMetadata */
'use strict';

require('/js/metadata_scripts.js');

function testParseMetadata(testName, filename, callback, timeout) {
  test(testName, function(done) {
    // Override getThumbnailURL, since we don't need/want to talk to the
    // indexedDB here.
    window.getThumbnailURL = function(fileinfo, callback) {
      callback(null);
    };

    this.timeout(timeout || 1000);

    var xhr = new XMLHttpRequest();
    xhr.open('GET', filename);
    xhr.onload = function() {
      assert.equal(xhr.status, 200);
      parseAudioMetadata(
        new Blob([this.response]),
        function(metadata) {
          callback(metadata);
          done();
        },
        function(error) {
          assert.equal(null, error);
          done();
        }
      );
    };
    xhr.onerror = xhr.ontimeout = function() {
      assert.ok(false);
      done();
    };
    xhr.responseType = 'arraybuffer';
    xhr.send();
  });
}

// We have a bunch of otherwise-identical mp3 files using different ID3
// versions, covering all valid character encodings. Test them all.
[2, 3, 4].forEach(function(version) {
  suite('simple id3v2.' + version, function() {
    testParseMetadata('latin1',
                      '/test-data/id3v2.' + version + '-simple-latin1.mp3',
                      function(metadata) {
      assert.equal(metadata.artist, 'AC/DC');
      assert.equal(metadata.album, 'Dirty Deeds Done Dirt Cheap');
      assert.equal(metadata.title, 'Problem Child');
      assert.equal(metadata.tracknum, 5);
    });


    testParseMetadata('utf16',
                      '/test-data/id3v2.' + version + '-simple-utf16.mp3',
                      function(metadata) {
      assert.equal(metadata.artist, 'Mötley Crüe');
      assert.equal(metadata.album, 'Dr. Feelgood');
      assert.equal(metadata.title, 'Kickstart My Heart');
      assert.equal(metadata.tracknum, 5);
    });

    if (version === 4) {
      testParseMetadata('utf16be',
                        '/test-data/id3v2.' + version + '-simple-utf16be.mp3',
                        function(metadata) {
        assert.equal(metadata.artist, 'Gåte');
        assert.equal(metadata.album, 'Jygri');
        assert.equal(metadata.title, 'Bruremarsj frå Jämtland');
        assert.equal(metadata.tracknum, 8);
      });

      testParseMetadata('utf8',
                        '/test-data/id3v2.' + version + '-simple-utf8.mp3',
                        function(metadata) {
        assert.equal(metadata.artist, 'Lunar Aurora');
        assert.equal(metadata.album, 'Hoagascht');
        assert.equal(metadata.title, 'Håbergoaß');
        assert.equal(metadata.tracknum, 5);
      });
    }
  });
});

suite('album art', function() {
  [2, 3, 4].forEach(function(version) {
    testParseMetadata('id3v2.' + version,
                      '/test-data/id3v2.' + version + '-picture.mp3',
                      function(metadata) {
      assert.equal(metadata.artist, 'AC/DC');
      assert.equal(metadata.album, 'Dirty Deeds Done Dirt Cheap');
      assert.equal(metadata.title, 'Problem Child');
      assert.equal(metadata.tracknum, 5);
      assert.equal(metadata.picture.type, 'image/jpeg');
      // For now, just test that we got the expected size for the album art.
      assert.equal(metadata.picture.end - metadata.picture.start, 3);
    });
  });
});
