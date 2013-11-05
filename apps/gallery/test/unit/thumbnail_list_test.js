/*
 * Thumbnail List and getFileIndex method in gallery Unit tests
 */
'use strict';

requireApp('/gallery/js/gallery.js');
requireApp('/gallery/test/unit/mock_thumbnail_group.js');
requireApp('/gallery/js/thumbnail_list.js');

suite('Thumbnail List Unit Tests', function() {

  var nativeThumbnailList;
  suiteSetup(function() {
    nativeThumbnailList = window.thumbnailList;
  });

  suiteTeardown(function() {
    thumbnailList = nativeThumbnailList;
  });

  suite('#constructor tests', function() {
    var dummyContainer;
    suiteSetup(function() {
      MockThumbnailGroup.reset();
      dummyContainer = document.createElement('div');
    });

    test('normal', function() {
      new ThumbnailList(MockThumbnailGroup, dummyContainer);
      assert.ok('everything should be ok');
    });

    test('missing arguments', function() {
      try {
        new ThumbnailList(MockThumbnailGroup);
        assert.fail('it should throws an error.');
      } catch (ex) {
        assert.ok('everything should be ok');
      }

      try {
        new ThumbnailList();
        assert.fail('it should throws an error.');
      } catch (ex) {
        assert.ok('everything should be ok');
      }
    });
  });

  suite('#api tests', function() {
    var dummyContainer;
    var thumbnailList;

    suiteSetup(function() {
      dummyContainer = document.createElement('div');
      thumbnailList = new ThumbnailList(MockThumbnailGroup, dummyContainer);
      // Used in getFileIndex
      window.thumbnailList = thumbnailList;
    });

    test('#addItem, Add multiple items', function() {
      // first
      MockThumbnailGroup._GroupID = '2013-09';
      thumbnailList.addItem({'name': 'dummy-file-name-09.jpg'});
      // Group Header
      assert.equal(dummyContainer.firstChild.textContent, '2013-09');
      // Index of File Added in Group 2013-09
      assert.equal(getFileIndex('dummy-file-name-09.jpg'), 0);
      //Total files
      assert.equal(thumbnailList.count, 1);

      // second
      MockThumbnailGroup._GroupID = '2013-08';
      thumbnailList.addItem({'name': 'dummy-file-name-08.jpg'});
      assert.equal(dummyContainer.children[1].textContent, '2013-08');
      // Index of File Added in Group 2013-08
      assert.equal(getFileIndex('dummy-file-name-08.jpg'), 1);
      assert.equal(thumbnailList.count, 2);

      //third
      MockThumbnailGroup._GroupID = '2013-07';
      thumbnailList.addItem({'name': 'dummy-file-name-07.jpg'});
      assert.equal(dummyContainer.children[2].textContent, '2013-07');
      // Index of File Added in Group 2013-07
      assert.equal(getFileIndex('dummy-file-name-07.jpg'), 2);
      assert.equal(thumbnailList.count, 3);

      // last
      MockThumbnailGroup._GroupID = '2013-06';
      thumbnailList.addItem({'name': 'dummy-file-name-06.jpg'});
      assert.equal(dummyContainer.children[3].textContent, '2013-06');
      // Index of File Added in Group 2013-06
      assert.equal(getFileIndex('dummy-file-name-06.jpg'), 3);
      assert.equal(thumbnailList.count, 4);
    });

    test('#addItem, to existing group', function() {
      // first
      MockThumbnailGroup._GroupID = '2013-07';
      thumbnailList.addItem({'name': 'dummy-file-name-07-2.jpg'});

      // Index of File Added in Group 2013-07
      assert.equal(getFileIndex('dummy-file-name-07-2.jpg'), 3);
      // Total files in group 2013-07
      assert.equal(MockThumbnailGroup._GroupMap['2013-07'].getCount(), 2);
      // Total groups
      assert.equal(dummyContainer.children.length, 4);
      //Total files in all groups
      assert.equal(thumbnailList.count, 5);
    });


    test('#addItem, empty item', function() {
      // first
      MockThumbnailGroup._GroupID = '2013-07';
      thumbnailList.addItem(null);
      assert.equal(MockThumbnailGroup._GroupMap['2013-07'].getCount(), 2);
      assert.equal(dummyContainer.children.length, 4);
      assert.equal(thumbnailList.count, 5);
    });

    test('#addItem, duplicate item', function() {
      // first
      MockThumbnailGroup._GroupID = '2013-07';
      thumbnailList.addItem({'name': 'dummy-file-name-07-2.jpg'});
      assert.equal(thumbnailList.count, 5);
      assert.equal(MockThumbnailGroup._GroupMap['2013-07'].getCount(), 2);
      assert.equal(dummyContainer.children.length, 4);
    });

    test('#removeItem', function() {
      MockThumbnailGroup._GroupID = '2013-07';
      thumbnailList.removeItem('dummy-file-name-07-2.jpg');
      assert.equal(thumbnailList.count, 4);
      assert.equal(MockThumbnailGroup._GroupMap['2013-07'].getCount(), 1);

      thumbnailList.removeItem('dummy-file-name-07.jpg');
      assert.equal(thumbnailList.count, 3);
      assert.equal(MockThumbnailGroup._GroupMap['2013-07'].getCount(), 0);
      assert.equal(dummyContainer.children.length, 3);

      // Index of last file  in Group 2013-06
      assert.equal(getFileIndex('dummy-file-name-06.jpg'), 2);
    });

    test('#thumbnailMap', function() {
      assert.isDefined(thumbnailList.thumbnailMap['dummy-file-name-06.jpg']);
    });

    test('#reset', function() {
      thumbnailList.reset();
      assert.equal(thumbnailList.count, 0);
      assert.isUndefined(thumbnailList.thumbnailMap['dummy-file-name-06.jpg']);
    });
  });
});
