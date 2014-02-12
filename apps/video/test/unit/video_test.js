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
});
