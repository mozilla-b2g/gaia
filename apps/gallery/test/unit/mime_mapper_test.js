'use strict';
// We might need to modify the build script to run the shared lib
// right under the shared folder in the future(bug 841422).
require('/shared/js/mime_mapper.js');

suite('Shared library mime_mapper api tests', function() {

  suite('parse extension test', function() {
    test('Filename with extension', function() {
      var ext = MimeMapper._parseExtension('test.jpg');
      assert.equal(ext, 'jpg');
    });

    test('Filename without extension', function() {
      var ext = MimeMapper._parseExtension('test');
      assert.equal(ext, '');
    });

    test('Filename is empty string', function() {
      var ext = MimeMapper._parseExtension('');
      assert.equal(ext, '');
    });
  });

  suite('guess valid type from file properties test', function() {
    test('Filename/mimetype is matched', function() {
      var mimetype =
        MimeMapper.guessTypeFromFileProperties('test.jpg', 'image/jpeg');
      assert.equal(mimetype, 'image/jpeg');
    });

    test('Filename without extension but mimetype supported', function() {
      var mimetype =
        MimeMapper.guessTypeFromFileProperties('test', 'image/jpeg');
      assert.equal(mimetype, 'image/jpeg');
    });

    test('Extension unsupported but mimetype supported', function() {
      var mimetype =
        MimeMapper.guessTypeFromFileProperties('test.txt', 'image/jpeg');
      assert.equal(mimetype, 'image/jpeg');
    });

    test('Filename with valid extension but mimetype unsupported', function() {
      var mimetype =
        MimeMapper.guessTypeFromFileProperties('test.jpg',
          'application/download');
      assert.equal(mimetype, 'image/jpeg');
    });

    test('Filename and mimetype are both unsupported', function() {
      var mimetype =
        MimeMapper.guessTypeFromFileProperties('test',
          'application/download');
      assert.equal(mimetype, '');
    });
  });

  suite('Check is filename matches type test', function() {
    test('Extension/mimetype matches', function() {
      var match = MimeMapper.isFilenameMatchesType('test.jpg', 'image/jpeg');
      assert.isTrue(match);
    });

    test('Extension/mimetype does not match', function() {
      var match = MimeMapper.isFilenameMatchesType('test.txt', 'image/jpeg');
      assert.isFalse(match);
    });

    test('Filename without extension', function() {
      var match = MimeMapper.isFilenameMatchesType('test', 'image/jpeg');
      assert.isFalse(match);
    });
  });

  suite('Ensure filename matches type test', function() {
    test('Filename/mimetype is matched', function() {
      var filename =
        MimeMapper.ensureFilenameMatchesType('test.jpg', 'image/jpeg');
      assert.equal(filename, 'test.jpg');
    });

    test('Filename without extension but mimetype supported', function() {
      var filename =
        MimeMapper.ensureFilenameMatchesType('test', 'image/jpeg');
      assert.equal(filename, 'test.jpg');
    });

    test('Extension unsupported but mimetype supported', function() {
      var filename =
        MimeMapper.ensureFilenameMatchesType('test.txt', 'image/jpeg');
      assert.equal(filename, 'test.txt.jpg');
    });

    test('Filename with valid extension but mimetype unsupported', function() {
      var filename =
        MimeMapper.ensureFilenameMatchesType('test.jpg',
          'application/download');
      assert.equal(filename, 'test.jpg');
    });

    test('Filename and mimetype are both unsupported', function() {
      var filename =
        MimeMapper.ensureFilenameMatchesType('test',
          'application/download');
      assert.equal(filename, 'test');
    });
  });
});

