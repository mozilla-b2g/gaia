/*
 * Thumbnail Size tests
 */
'use strict';

requireApp('/gallery/js/thumbnail_size.js');

suite('Thumbnail Size Unit Tests', function() {

  var testThumbnailWidth;
  var testThumbnailHeight;

  suiteSetup(function() {
    testThumbnailWidth = 100;
    testThumbnailHeight = 200;
  });

  suite('#test object creation', function() {

    test('#constructor', function() {
      try {
        var thumbnailSizeTest = new ThumbnailSize(true);

        assert.ok('Constructor with no arguments is correct.');

      } catch (ex) {
        assert.fail('Caught unexpected exception');
      }
    });

    test('#isSmall, width/height < than thumbnail size', function() {

      var metadata = {
        width: testThumbnailWidth - 1,
        height: testThumbnailHeight - 1
      };

      var thumbnailSize = new ThumbnailSize(true);
      thumbnailSizeWidth = testThumbnailWidth;
      thumbnailSizeHeight = testThumbnailHeight;

      assert.equal(thumbnailSize.isSmall(metadata), true);
    });
    test('#isSmall, width/height equal to thumbnail size', function() {

      var metadata = {
        width: testThumbnailWidth,
        height: testThumbnailHeight
      };

      var thumbnailSize = new ThumbnailSize(true);
      thumbnailSizeWidth = testThumbnailWidth;
      thumbnailSizeHeight = testThumbnailHeight;

      assert.equal(thumbnailSize.isSmall(metadata), true);
    });
    test('#isSmall, width/height > than thumbnail size', function() {

      var metadata = {
        width: testThumbnailWidth + 1,
        height: testThumbnailHeight + 1
      };

      var thumbnailSize = new ThumbnailSize(true);
      thumbnailSizeWidth = testThumbnailWidth;
      thumbnailSizeHeight = testThumbnailHeight;

      assert.equal(thumbnailSize.isSmall(metadata), false);
    });
    test('#isSmall, width > than thumbnail size, height <', function() {

      var metadata = {
        width: testThumbnailWidth + 1,
        height: testThumbnailHeight - 1
      };

      var thumbnailSize = new ThumbnailSize(true);
      thumbnailSizeWidth = testThumbnailWidth;
      thumbnailSizeHeight = testThumbnailHeight;

      assert.equal(thumbnailSize.isSmall(metadata), false);
    });
    test('#isSmall, width < than thumbnail size, height >', function() {

      var metadata = {
        width: testThumbnailWidth - 1,
        height: testThumbnailHeight + 1
      };

      var thumbnailSize = new ThumbnailSize(true);
      thumbnailSizeWidth = testThumbnailWidth;
      thumbnailSizeHeight = testThumbnailHeight;

      assert.equal(thumbnailSize.isSmall(metadata), false);
    });
  });
});
