/*
 * Thumbnail Item tests
 */
'use strict';

requireApp('/gallery/js/thumbnail_item.js');

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
    var domNode;

    suiteSetup(function() {
      filedata = {
        metadata: {
          thumbnail: new Blob(['empty-image'], {'type': 'image/jpeg'})
        },
        date: 1375873140000,
        name: 'dummy-file-name'
      };

      thumbnail = new ThumbnailItem(filedata);
      domNode = thumbnail.htmlNode;
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
  });
});
