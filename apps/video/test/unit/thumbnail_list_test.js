/*
 * Thumbnail List tests
 */
'use strict';

requireApp('/video/test/unit/mock_thumbnail_group.js');
requireApp('/video/js/thumbnail_list.js');

suite('Thumbnail List Unit Tests', function() {

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
      MockThumbnailGroup.reset();
      dummyContainer = document.createElement('div');
      // we use mock thumbnail group which will not add any thumbnail item to
      // container.
      thumbnailList = new ThumbnailList(MockThumbnailGroup, dummyContainer);
    });

    test('#addItem, simple', function() {
      MockThumbnailGroup._GroupID = '2013-07';
      thumbnailList.addItem({'name': 'dummy-file-name-07.3gp'});
      assert.equal(dummyContainer.firstChild.textContent, '2013-07');
      assert.equal(thumbnailList.count, 1);
    });

    test('#addItem, first, middle, last', function() {
      // first
      MockThumbnailGroup._GroupID = '2013-09';
      thumbnailList.addItem({'name': 'dummy-file-name-09.3gp'});
      assert.equal(dummyContainer.firstChild.textContent, '2013-09');
      assert.equal(thumbnailList.count, 2);
      // middle
      MockThumbnailGroup._GroupID = '2013-08';
      thumbnailList.addItem({'name': 'dummy-file-name-08.3gp'});
      assert.equal(dummyContainer.children[1].textContent, '2013-08');
      assert.equal(thumbnailList.count, 3);
      // last
      MockThumbnailGroup._GroupID = '2013-06';
      thumbnailList.addItem({'name': 'dummy-file-name-06.3gp'});
      assert.equal(dummyContainer.children[3].textContent, '2013-06');
      assert.equal(thumbnailList.count, 4);
    });

    test('#addItem, to existed group', function() {
      // first
      MockThumbnailGroup._GroupID = '2013-07';
      thumbnailList.addItem({'name': 'dummy-file-name-07-2.3gp'});
      assert.equal(thumbnailList.count, 5);
      assert.equal(MockThumbnailGroup._GroupMap['2013-07'].getCount(), 2);
      assert.equal(dummyContainer.children.length, 4);
    });

    test('#addItem, empty', function() {
      // first
      MockThumbnailGroup._GroupID = '2013-07';
      thumbnailList.addItem(null);
      assert.equal(thumbnailList.count, 5);
      assert.equal(MockThumbnailGroup._GroupMap['2013-07'].getCount(), 2);
      assert.equal(dummyContainer.children.length, 4);
    });

    test('#addItem, duplicated', function() {
      // first
      MockThumbnailGroup._GroupID = '2013-07';
      thumbnailList.addItem({'name': 'dummy-file-name-07-2.3gp'});
      assert.equal(thumbnailList.count, 5);
      assert.equal(MockThumbnailGroup._GroupMap['2013-07'].getCount(), 2);
      assert.equal(dummyContainer.children.length, 4);
    });

    test('#removeItem', function() {
      MockThumbnailGroup._GroupID = '2013-07';
      thumbnailList.removeItem('dummy-file-name-07-2.3gp');
      assert.equal(thumbnailList.count, 4);
      assert.equal(MockThumbnailGroup._GroupMap['2013-07'].getCount(), 1);

      thumbnailList.removeItem('dummy-file-name-07.3gp');
      assert.equal(thumbnailList.count, 3);
      assert.equal(MockThumbnailGroup._GroupMap['2013-07'].getCount(), 0);
      assert.equal(dummyContainer.children.length, 3);
    });

    test('#removeItem, empty', function() {
      MockThumbnailGroup._GroupID = '2013-07';
      thumbnailList.removeItem(null);
      assert.equal(thumbnailList.count, 3);
    });

    test('#thumbnailMap', function() {
      assert.isDefined(thumbnailList.thumbnailMap['dummy-file-name-06.3gp']);
    });

    test('#pick mode', function() {
      thumbnailList.setPickMode(true);
      assert.isTrue(thumbnailList.isPickMode());
      assert.isTrue(dummyContainer.classList.contains('pick'));
      thumbnailList.setPickMode(false);
      assert.isFalse(thumbnailList.isPickMode());
      assert.isFalse(dummyContainer.classList.contains('pick'));
    });

    test('#select mode', function() {
      thumbnailList.setSelectMode(true);
      assert.isTrue(thumbnailList.isSelectMode());
      assert.isTrue(dummyContainer.classList.contains('select'));
      thumbnailList.setSelectMode(false);
      assert.isFalse(thumbnailList.isSelectMode());
      assert.isFalse(dummyContainer.classList.contains('select'));
    });

    test('#reset', function() {
      thumbnailList.reset();
      assert.equal(thumbnailList.count, 0);
      assert.isUndefined(thumbnailList.thumbnailMap['dummy-file-name-06.3gp']);
    });
  });
});
