/*
 * Thumbnail Item tests
 */
'use strict';

requireApp('/gallery/js/thumbnail_item.js');
requireApp('/gallery/js/thumbnail_size.js');

var thumbnailSize;

suite('Thumbnail Item Unit Tests', function() {

  suite('#test object creation', function() {
    test('#empty gallery object', function() {
      try {
        new ThumbnailItem();
        assert.fail('undefined or null galleryitem should not be ok.');
      } catch (ex) {
        assert.ok('correct behavior caught');
      }
    });
  });

  suite('#rendering', function() {
    var filedata;
    var thumbnail;
    var thumbnail_small;
    var domNode;

    function containsClass(thumbnailItem, classString) {
      return thumbnailItem.htmlNode.classList.contains(classString);
    }

    suiteSetup(function() {
      filedata = {
        metadata: {
          thumbnail: new Blob(['empty-image'], {'type': 'image/jpeg'}),
          width: 200,
          height: 400
        },
        date: 1375873140000,
        name: 'dummy-file-name'
      };

      thumbnailSize = new ThumbnailSize(false /* isPhone */);

      // Used in thumbnail_size.js isSmall
      thumbnailSizeWidth = 10;
      thumbnailSizeHeight = 20;

      thumbnail = new ThumbnailItem(filedata);
      domNode = thumbnail.htmlNode;

      filedata.metadata.width = 5;
      filedata.metadata.height = 10;
      thumbnail_small = new ThumbnailItem(filedata);

    });

    test('#htmlNode', function() {
      assert.equal(thumbnail.htmlNode, domNode);
    });

    test('#data', function() {
      assert.deepEqual(thumbnail.data, filedata);
    });

    test('#htmlNode dataset name', function() {
      assert.equal(thumbnail.htmlNode.dataset.filename, filedata.name);
    });

    test('#htmlNode dataset backgroundImage', function() {
      assert.notEqual(thumbnail.htmlNode.dataset.backgroundImage, '');
      assert.equal(thumbnail.htmlNode.style.backgroundImage, '');
    });

    test('#image size greater than thumbnail size', function() {
      assert.equal(containsClass(thumbnail, 'thumbnail'), true);
      assert.equal(containsClass(thumbnail, 'thumbnail-small'), false);
    });

    test('#image size smaller than thumbnail size', function() {
      assert.equal(containsClass(thumbnail_small, 'thumbnail'), true);
      assert.equal(containsClass(thumbnail_small, 'thumbnail-small'), true);
    });
  });
});
