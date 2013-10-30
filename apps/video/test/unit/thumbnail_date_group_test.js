/*
 *  Thumbnail Date Group tests
 */
'use strict';

require('/shared/js/template.js');
require('/shared/js/l10n.js');
require('/shared/js/l10n_date.js');
require('/shared/js/media/media_utils.js');
requireApp('/video/test/unit/mock_l10n.js');
requireApp('/video/test/unit/mock_thumbnail_item.js');
requireApp('/video/js/thumbnail_date_group.js');
requireApp('/video/js/thumbnail_item.js');

suite('Thumbnail Date Group Unit Tests', function() {

  var nativeMozL10n;
  var nativeThumbnailItem;
  suiteSetup(function() {
    nativeThumbnailItem = ThumbnailItem;
    nativeMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    MediaUtils._ = MockL10n.get;
    ThumbnailItem = MockThumbnailItem;
  });

  suiteTeardown(function() {
    navigator.mozL10n = nativeMozL10n;
    ThumbnailItem = nativeThumbnailItem;
  });

  suite('#static functions', function() {
    test('#getGroupID', function() {
      assert.equal(ThumbnailDateGroup.getGroupID({date: 1375873140000}),
                   'group_2013-08');
      assert.equal(ThumbnailDateGroup.getGroupID({date: 1381967318275}),
                   'group_2013-10');
    });

    test('#compareGroupID', function() {
      assert.equal(ThumbnailDateGroup.compareGroupID('group_2013-08',
                                                     'group_2013-08'),
                   0);
      assert.equal(ThumbnailDateGroup.compareGroupID('group_2013-08',
                                                     'group_2013-07'),
                   1);
      assert.equal(ThumbnailDateGroup.compareGroupID('group_2013-08',
                                                     'group_2013-09'),
                   -1);
      assert.equal(ThumbnailDateGroup.compareGroupID('group_2013-09',
                                                     'group_2013-10'),
                   -1);
    });
  });

  suite('#test object creation', function() {
    test('#empty video object', function() {
      try {
        new ThumbnailDateGroup();
        assert.fail('undefined or null videoitem should not be ok.');
      } catch (ex) {
        assert.ok('correct behavior caught');
      }
    });

    test('#no template', function() {
      try {
        delete ThumbnailDateGroup.Template;
        new ThumbnailDateGroup({date: 1375873140000});
        assert.fail('new object without template is not allowed.');
      } catch (ex) {
        assert.ok('correct behavior caught');
      }
    });

    test('#template with empty content', function() {
      try {
        var dummyDiv = document.createElement('div');
        dummyDiv.innerHTML = '<!-- empty -->';

        ThumbnailDateGroup.Template = new Template(dummyDiv);
        new ThumbnailDateGroup({date: 1375873140000});
        assert.fail('empty template is not allowed.');
      } catch (ex) {
        assert.ok('correct behavior caught');
      }
    });
  });

  suite('#error handling', function() {
    var dateGroup;
    var videoData;
    var domNode;

    suiteSetup(function() {
      videoData = {date: 1375873140000};

    });

    test('#render without template', function() {
      try {
        var dateGroup = new ThumbnailDateGroup(videoData, 'test-id');
        assert.fail('render() should throw error without template');
      } catch (ex) {
        assert.ok('expected error caught.');
      }
    });
  });

  suite('#rendering', function() {
    var dateGroup;
    var videoData;
    var domNode;

    suiteSetup(function() {
      videoData = {date: 1375873140000};

      var dummyDiv = document.createElement('div');
      dummyDiv.innerHTML = '<!--' +
        '<li class="thumbnail-group-header">' +
        '  <div>${group-header}</div>' +
        '  <ul class="thumbnail-group-container"></ul>' +
        '</li>' +
        '-->';

      ThumbnailDateGroup.Template = new Template(dummyDiv);
      dateGroup = new ThumbnailDateGroup(videoData, 'test-id');
      domNode = dateGroup.htmlNode;
    });

    test('#normal', function() {
      assert.equal(domNode.firstElementChild.textContent,
                   '1375873140000,%B %Y');
    });
  });

  suite('#API', function() {
    var dateGroup;
    var videoData;
    var domNode;
    var groupContainerNode;
    var dummyContainer;

    setup(function() {
      videoData = {date: 1375873140000};

      dummyContainer = document.createElement('div');
      var dummyDiv = document.createElement('div');
      dummyDiv.innerHTML = '<!--' +
        '<li class="thumbnail-group-header">' +
        '  <div>${group-header}</div>' +
        '  <ul class="thumbnail-group-container"></ul>' +
        '</li>' +
        '-->';

      ThumbnailDateGroup.Template = new Template(dummyDiv);
      dateGroup = new ThumbnailDateGroup(videoData);
      domNode = dateGroup.htmlNode;
      groupContainerNode = domNode.querySelector('.thumbnail-group-container');
      dummyContainer.appendChild(domNode);
    });

    test('#addItem, simple', function() {
      assert.isUndefined(dateGroup.addItem());

      var thumbnail = dateGroup.addItem({date: 1375873140005});
      assert.isDefined(thumbnail);
      assert.equal(dateGroup.getCount(), 1);
      assert.equal(groupContainerNode.children[0], thumbnail.htmlNode);
    });

    test('#addItem, first, middle, last', function() {
      // addItem, to empty
      var thumbnail2 = dateGroup.addItem({date: 1375873140003});
      assert.equal(dateGroup.getCount(), 1);
      assert.equal(groupContainerNode.children[0], thumbnail2.htmlNode);
      // addItem, to first
      var thumbnail1 = dateGroup.addItem({date: 1375873140004});
      assert.equal(dateGroup.getCount(), 2);
      assert.equal(groupContainerNode.children[0], thumbnail1.htmlNode);
      assert.equal(groupContainerNode.children[1], thumbnail2.htmlNode);
      // addItem, to last
      var thumbnail4 = dateGroup.addItem({date: 1375873140001});
      assert.equal(dateGroup.getCount(), 3);
      assert.isNull(thumbnail4.htmlNode.nextSibling);
      assert.equal(groupContainerNode.children[2], thumbnail4.htmlNode);
      // addItem to middle
      var thumbnail3 = dateGroup.addItem({date: 1375873140002});
      assert.equal(dateGroup.getCount(), 4);
      assert.equal(groupContainerNode.children[2], thumbnail3.htmlNode);
      assert.equal(groupContainerNode.children[3], thumbnail4.htmlNode);
      // check from dummyContainer
      assert.equal(groupContainerNode.children.length, 4);
    });

    test('#groupID', function() {
      assert.equal(dateGroup.groupID, 'group_2013-08');
    });

    test('#htmlNode', function() {
      assert.equal(dateGroup.htmlNode, domNode);
    });

    test('#removeItem, unknown thumbnail', function() {

      var thumbnail1 = dateGroup.addItem({date: 1375873140004});
      var thumbnail2 = dateGroup.addItem({date: 1375873140003});

      var dummyThumbnail = new ThumbnailItem({});
      dateGroup.removeItem(dummyThumbnail);
      assert.equal(dateGroup.getCount(), 2);
    });

    test('#removeItem, remove all', function() {
      var thumbnail1 = dateGroup.addItem({date: 1375873140004});
      var thumbnail2 = dateGroup.addItem({date: 1375873140003});
      var thumbnail3 = dateGroup.addItem({date: 1375873140002});
      var thumbnail4 = dateGroup.addItem({date: 1375873140001});

      dateGroup.removeItem(thumbnail1);
      assert.equal(dateGroup.getCount(), 3);
      assert.equal(groupContainerNode.children[0], thumbnail2.htmlNode);
      assert.isUndefined(groupContainerNode.children[3]);
      dateGroup.removeItem(thumbnail4);
      assert.equal(dateGroup.getCount(), 2);
      assert.equal(groupContainerNode.children[1], thumbnail3.htmlNode);
      assert.isUndefined(groupContainerNode.children[2]);
      dateGroup.removeItem(thumbnail3);
      assert.equal(dateGroup.getCount(), 1);
      assert.equal(groupContainerNode.children[0], thumbnail2.htmlNode);
      assert.isUndefined(groupContainerNode.children[1]);
      dateGroup.removeItem(thumbnail2);
      assert.equal(dateGroup.getCount(), 0);
      assert.isUndefined(groupContainerNode.children[0]);
    });
  });
});
