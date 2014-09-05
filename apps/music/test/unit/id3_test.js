/* global parseMetadata, fetchPicture, checkPicture */
'use strict';

require('/test/unit/metadata_utils.js');

// We have a bunch of otherwise-identical mp3 files using different ID3
// versions, covering all valid character encodings. Test them all.
[2, 3, 4].forEach(function(version) {
  var tag_type = 'id3v2.' + version + '.0';
  suite('simple id3v2.' + version, function() {

    setup(function() {
      this.timeout(1000);
    });

    test('latin1', function(done) {
      var filename = '/test-data/id3v2.' + version + '-simple-latin1.mp3';
      parseMetadata(filename).then(function(metadata) {
        assert.equal(metadata.tag_type, tag_type);
        assert.equal(metadata.artist, 'AC/DC');
        assert.equal(metadata.album, 'Dirty Deeds Done Dirt Cheap');
        assert.equal(metadata.title, 'Problem Child');
        assert.equal(metadata.tracknum, 5);
        done();
      });
    });

    test('utf16', function(done) {
      var filename = '/test-data/id3v2.' + version + '-simple-utf16.mp3';
      parseMetadata(filename).then(function(metadata) {
        assert.equal(metadata.tag_type, tag_type);
        assert.equal(metadata.artist, 'Mötley Crüe');
        assert.equal(metadata.album, 'Dr. Feelgood');
        assert.equal(metadata.title, 'Kickstart My Heart');
        assert.equal(metadata.tracknum, 5);
        done();
      });
    });

    if (version === 4) {
      test('utf16be', function(done) {
        var filename = '/test-data/id3v2.' + version + '-simple-utf16be.mp3';
        parseMetadata(filename).then(function(metadata) {
          assert.equal(metadata.tag_type, tag_type);
          assert.equal(metadata.artist, 'Gåte');
          assert.equal(metadata.album, 'Jygri');
          assert.equal(metadata.title, 'Bruremarsj frå Jämtland');
          assert.equal(metadata.tracknum, 8);
          done();
        });
      });

      test('utf8', function(done) {
        var filename = '/test-data/id3v2.' + version + '-simple-utf8.mp3';
        parseMetadata(filename).then(function(metadata) {
          assert.equal(metadata.tag_type, tag_type);
          assert.equal(metadata.artist, 'Lunar Aurora');
          assert.equal(metadata.album, 'Hoagascht');
          assert.equal(metadata.title, 'Håbergoaß');
          assert.equal(metadata.tracknum, 5);
          done();
        });
      });
    }
  });

});

suite('simple id3v1', function() {

  setup(function() {
    this.timeout(1000);
  });

  test('id3v1', function(done) {
    parseMetadata('/test-data/id3v1-simple.mp3').then(function(metadata) {
      assert.equal(metadata.tag_type, 'id3v1');
      assert.equal(metadata.artist, 'AC/DC');
      assert.equal(metadata.album, 'Dirty Deeds Done Dirt Cheap');
      assert.equal(metadata.title, 'Problem Child');
      assert.equal(metadata.tracknum, 5);
      done();
    });
  });

  test('id3 v1+v2', function(done) {
    parseMetadata('/test-data/id3v1+2-simple.mp3').then(function(metadata) {
      // Here we should have the v2 tag content.
      assert.equal(metadata.tag_type, 'id3v2.3.0');
      assert.equal(metadata.artist, 'AC/DC');
      assert.equal(metadata.album, 'Dirty Deeds Done Dirt Cheap');
      assert.equal(metadata.title, 'Problem Child');
      assert.equal(metadata.tracknum, 5);
      done();
    });
  });

});

suite('album art', function() {

  var expectedPicture;
  setup(function(done) {
    this.timeout(1000);
    fetchPicture('/test-data/album-art.jpg').then(function(data) {
      expectedPicture = data;
      done();
    });
  });

  [2, 3, 4].forEach(function(version) {
    test('id3v2.' + version, function(done) {
      var filename = '/test-data/id3v2.' + version + '-picture.mp3';
      parseMetadata(filename).then(function(metadata) {
        assert.equal(metadata.artist, 'AC/DC');
        assert.equal(metadata.album, 'Dirty Deeds Done Dirt Cheap');
        assert.equal(metadata.title, 'Problem Child');
        assert.equal(metadata.tracknum, 5);
        checkPicture(metadata.picture.blob, expectedPicture, done);
      });
    });
  });

});

suite('extended header', function() {

  setup(function() {
    this.timeout(1000);
  });

  [3, 4].forEach(function(version) {
    var tag_type = 'id3v2.' + version + '.0';

    test('id3v2.' + version, function(done) {
      var filename = '/test-data/id3v2.' + version + '-extheader.mp3';
      parseMetadata(filename).then(function(metadata) {
        assert.equal(metadata.tag_type, tag_type);
        assert.equal(metadata.artist, 'AC/DC');
        assert.equal(metadata.album, 'Dirty Deeds Done Dirt Cheap');
        assert.equal(metadata.title, 'Problem Child');
        assert.equal(metadata.tracknum, 5);
        done();
      });
    });
  });

});

suite('unsynchronized data', function() {

  var expectedPicture;
  setup(function(done) {
    this.timeout(1000);
    fetchPicture('/test-data/album-art.jpg').then(function(data) {
      expectedPicture = data;
      done();
    });
  });

  [3, 4].forEach(function(version) {
    var tag_type = 'id3v2.' + version + '.0';

    test('id3v2.' + version + ' whole tag', function(done) {
      var filename = '/test-data/id3v2.' + version + '-allunsync.mp3';
      parseMetadata(filename).then(function(metadata) {
        assert.equal(metadata.tag_type, tag_type);
        assert.equal(metadata.artist, 'AC/DC');
        assert.equal(metadata.album, 'Dirty Deeds Done Dirt Cheap');
        assert.equal(metadata.title, 'Problem Child');
        assert.equal(metadata.tracknum, 5);
        checkPicture(metadata.picture.blob, expectedPicture, done);
      });
    });
  });

  test('id3v2.4 selected frames', function(done) {
    var filename = '/test-data/id3v2.4-framesunsync.mp3';
    parseMetadata(filename).then(function(metadata) {
      assert.equal(metadata.tag_type, 'id3v2.4.0');
      assert.equal(metadata.artist, 'AC/DC');
      assert.equal(metadata.album, 'Dirty Deeds Done Dirt Cheap');
      assert.equal(metadata.title, 'Problem Child');
      assert.equal(metadata.tracknum, 5);
      checkPicture(metadata.picture.blob, expectedPicture, done);
    });
  });
});

suite('multivalue frames', function() {

  setup(function() {
    this.timeout(1000);
  });

  ['latin1', 'utf16', 'utf16be', 'utf8'].forEach(function(encoding) {
    test('id3v2.4 ' + encoding, function(done) {
      var filename = '/test-data/id3v2.4-multivalue-' + encoding + '.mp3';
      parseMetadata(filename).then(function(metadata) {
        assert.equal(metadata.tag_type, 'id3v2.4.0');
        assert.equal(metadata.artist, 'Dynatron / Perturbator');
        assert.equal(metadata.album, 'I Am the Night');
        assert.equal(metadata.title, 'Volcanic Machinery');
        assert.equal(metadata.tracknum, 13);
        done();
      });
    });
  });

});
