/*
 * Thumbnail Item tests
 */
'use strict';
/* global ThumbnailItem */

require('/shared/js/l10n.js');
requireApp('/gallery/js/thumbnail_item.js');

suite('Thumbnail Item Unit Tests', function() {

  suite('#test object creation', function() {
    test('#empty gallery object', function() {
      try {
        /* jshint nonew: false */
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
    var imgNode;

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
      imgNode = thumbnail.imgNode;
    });

    test('#htmlNode', function() {
      assert.equal(thumbnail.htmlNode, domNode);
    });

    test('#imgNode dataset name', function() {
      assert.equal(thumbnail.imgNode.dataset.filename, filedata.name);
    });

    test('#imgNode src', function() {
      assert.notEqual(thumbnail.imgNode.src, '');
    });
  });
});
