/*
  Video Media Info Tests
*/
'use strict';

require('/shared/js/lazy_loader.js');
require('/shared/js/l10n.js');
require('/shared/js/l10n_date.js');
require('/shared/js/media/media_utils.js');
require('/shared/test/unit/load_body_html_helper.js');
requireApp('/video/js/video.js');
requireApp('/video/test/unit/mock_l10n.js');
requireApp('/video/test/unit/mock_thumbnail_group.js');
requireApp('/video/js/thumbnail_list.js');

var metadataQueue;
var MediaDB;

suite('Video App Unit Tests', function() {
  var nativeMozL10n;
  suiteSetup(function() {
    // Create DOM structure
    loadBodyHTML('/index.html');
    dom.infoView = document.getElementById('info-view');
    nativeMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    MediaUtils._ = MockL10n.get;
  });

  suiteTeardown(function() {
    navigator.mozL10n = nativeMozL10n;
  });

  suite('#Video Info Populate Data', function() {
    before(function() {
      currentVideo = {
        metadata: {
          title: 'Small webm',
          duration: 5.568,
          width: 560,
          height: 320
        },
        type: 'video/webm',
        date: 1375873140000,
        size: 229455
      };
    });

    test('#Test Video details', function() {
      showInfoView();
      assert.equal(document.getElementById('info-name').textContent,
        'Small webm');
      assert.equal(document.getElementById('info-length').textContent,
        '00:05');
      assert.equal(document.getElementById('info-type').textContent,
        'webm');
      assert.equal(document.getElementById('info-date').textContent,
        '08/07/2013');
      assert.equal(document.getElementById('info-resolution').textContent,
        '560x320');
    });

    test('#Test show info view', function() {
      assert.isFalse(dom.infoView.classList[0] === 'hidden');
    });

    test('#Test hide info view', function() {
      hideInfoView();
      assert.isTrue(dom.infoView.classList[0] === 'hidden');
    });
  });

  suite('#Video Format Date', function() {

    test('#Test Video created date', function() {
      currentVideo = {
        metadata: {
          title: 'My test video'
        },
        date: 1376909940000
      };
      showInfoView();
      assert.equal(document.getElementById('info-date').textContent,
        '08/19/2013');
    });

    test('#Test Video date null', function() {
      currentVideo = {
        metadata: {
          title: 'Lorem Ipsum'
        },
        date: null
      };
      showInfoView();
      assert.equal(document.getElementById('info-date').textContent, '');
    });

    test('#Test Video date empty', function() {
      currentVideo = {
        metadata: {
          title: 'Video test'
        },
        date: ''
      };
      showInfoView();
      assert.equal(document.getElementById('info-date').textContent, '');
    });
  });


  suite('#Video Format Size', function() {

    test('#Test Video size', function() {
      currentVideo = {
        metadata: {
          title: 'My test video'
        },
        size: 229455
      };
      showInfoView();
      assert.equal(document.getElementById('info-size').textContent,
        '224 byteUnit-KB');
    });

    test('#Test Video size null', function() {
      currentVideo = {
        metadata: {
          title: 'Video title'
        },
        size: null
      };
      showInfoView();
      assert.equal(document.getElementById('info-size').textContent, '');
    });

    test('#Test Video size MB', function() {
      currentVideo = {
        metadata: {
          title: 'Video large size'
        },
        size: 4110000
      };
      showInfoView();
      assert.equal(document.getElementById('info-size').textContent,
        '4 byteUnit-MB');
    });
  });

  suite('#Update dialog tests', function() {
    var thumbnailItemName = 'dummy-file-name-09.3gp';
    MediaDB = {
      'OPENING': 'opening',
      'UPGRADING': 'upgrading',
      'READY': 'ready',
      'NOCARD': 'nocard',
      'UNMOUNTED': 'unmounted',
      'CLOSED': 'closed'
    };

    before(function() {
      MockThumbnailGroup.reset();
      var dummyContainer = document.createElement('div');

      thumbnailList = new ThumbnailList(MockThumbnailGroup, dummyContainer);

      dom.overlay = document.createElement('overlay');
      dom.overlayMenu = document.createElement('overlay-menu');
      dom.overlayActionButton = document.createElement('overlay-action-button');
      dom.overlayMenu = document.createElement('overlay-menu');
      dom.overlayTitle = document.createElement('overlay-title');
      dom.overlayText = document.createElement('overlay-text');
    });

    /**
     * If there is at least one thumbnail loaded, hide overlay
     */
    test('#Update dialog, hide overlay', function() {
      thumbnailList.addItem({'name': thumbnailItemName});
      updateDialog();
      assert.equal(dom.overlay.classList.contains('hidden'), true);
    });

    /**
     * DB being upraded
     */
    test('#Update dialog, db upgrade, \'upgrade\' title and text', function() {
      thumbnailList.removeItem(thumbnailItemName);
      storageState = MediaDB.UPGRADING;
      dom.overlayMenu.classList.remove('hidden');
      dom.overlayActionButton.classList.remove('hidden');
      dom.overlayTitle.textContent = '';
      dom.overlayText.textContent = '';

      updateDialog();

      assert.equal(dom.overlayMenu.classList.contains('hidden'), true);
      assert.equal(dom.overlayActionButton.classList.contains('hidden'), true);
      assert.equal(dom.overlayTitle.textContent, 'upgrade-title');
      assert.equal(dom.overlayText.textContent, 'upgrade-text');
    });

    test('#Update dialog, pick activity, cancel overlay menu', function() {
      pendingPick = {'source': {'name': 'pick_name'}};
      storageState = MediaDB.UNMOUNTED;
      dom.overlayMenu.classList.add('hidden');
      dom.overlayActionButton.classList.add('hidden');
      dom.overlayTitle.textContent = '';
      dom.overlayText.textContent = '';

      updateDialog();

      assert.equal(dom.overlayMenu.classList.contains('hidden'), false);
      assert.equal(dom.overlayActionButton.classList.contains('hidden'), false);
      assert.equal(dom.overlayActionButton.textContent,
                   'overlay-cancel-button');
      assert.equal(dom.overlayTitle.textContent, 'pluggedin-title');
      assert.equal(dom.overlayText.textContent, 'pluggedin-text');
    });

    test('#Update dialog, empty list, \'empty\' overlay menu', function() {
      pendingPick = null;
      storageState = null;
      dom.overlayMenu.classList.add('hidden');
      dom.overlayActionButton.classList.add('hidden');
      dom.overlayTitle.textContent = '';
      dom.overlayText.textContent = '';
      firstScanEnded = true;
      metadataQueue = {'length': 0};

      updateDialog();

      assert.equal(dom.overlayMenu.classList.contains('hidden'), false);
      assert.equal(dom.overlayActionButton.classList.contains('hidden'), false);
      assert.equal(dom.overlayActionButton.textContent,
                   'overlay-camera-button');
      assert.equal(dom.overlayTitle.textContent, 'empty-title');
      assert.equal(dom.overlayText.textContent, 'empty-text');
    });

    test('#Update dialog, no card, \'no card\' title and text', function() {
      thumbnailList.removeItem(thumbnailItemName);
      storageState = MediaDB.NOCARD;
      dom.overlayMenu.classList.remove('hidden');
      dom.overlayActionButton.classList.remove('hidden');
      dom.overlayTitle.textContent = '';
      dom.overlayText.textContent = '';

      updateDialog();

      assert.equal(dom.overlayMenu.classList.contains('hidden'), true);
      assert.equal(dom.overlayActionButton.classList.contains('hidden'), true);
      assert.equal(dom.overlayTitle.textContent, 'nocard2-title');
      assert.equal(dom.overlayText.textContent, 'nocard3-text');
    });

    test('#Update dialog, media no mnt, \'no mount\' title/text', function() {
      thumbnailList.removeItem(thumbnailItemName);
      storageState = MediaDB.UNMOUNTED;
      dom.overlayMenu.classList.remove('hidden');
      dom.overlayActionButton.classList.remove('hidden');
      dom.overlayTitle.textContent = '';
      dom.overlayText.textContent = '';

      updateDialog();

      assert.equal(dom.overlayMenu.classList.contains('hidden'), true);
      assert.equal(dom.overlayActionButton.classList.contains('hidden'), true);
      assert.equal(dom.overlayTitle.textContent, 'pluggedin-title');
      assert.equal(dom.overlayText.textContent, 'pluggedin-text');
    });
  });
});
