/*
  Video Media Info Tests
*/
'use strict';

require('/shared/js/lazy_loader.js');
require('/shared/js/l10n.js');
require('/shared/js/l10n_date.js');
require('/shared/js/media/media_utils.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_video_stats.js');
requireApp('/video/js/video.js');
requireApp('/video/js/video_utils.js');
requireApp('/video/test/unit/mock_l10n.js');
requireApp('/video/test/unit/mock_thumbnail_group.js');
requireApp('/video/test/unit/mock_mediadb.js');
requireApp('/video/test/unit/mock_video_player.js');
requireApp('/video/js/thumbnail_list.js');

var metadataQueue; // Declare here to avoid pulling in metadata.js
var MediaDB;       // Declare here to avoid pulling in mediadb.js
var videodb;       // Used in video.js
var videoControlsAutoHidingMsOverride = 0; // Used in video.js
var startParsingMetadata; // Declared in metadata.js
var captureFrame;  // Declared in metadata.js

function containsClass(element, value) {
  return element.classList.contains(value);
}

suite('Video App Unit Tests', function() {
  var nativeMozL10n;
  suiteSetup(function() {

    // Create DOM structure
    loadBodyHTML('/index.html');
    dom.infoView = document.getElementById('info-view');
    dom.durationText = document.getElementById('duration-text');
    dom.overlay = document.createElement('overlay');
    dom.play = document.getElementById('play');
    dom.videoTitle = document.getElementById('video-title');
    dom.videoContainer = document.getElementById('video-container');
    dom.videoControls = document.getElementById('videoControls');
    dom.elapsedText = document.getElementById('elapsed-text');
    dom.elapsedTime = document.getElementById('elapsedTime');
    dom.playHead = document.getElementById('playHead');

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

    test('#Test Video size 3.9MB', function() {
      currentVideo = {
        metadata: {
          title: 'Video large size'
        },
        size: 4110000
      };
      showInfoView();
      assert.equal(document.getElementById('info-size').textContent,
        '3.9 byteUnit-MB');
    });

    test('#Test Video size 4MB', function() {
      currentVideo = {
        metadata: {
          title: 'Video large size'
        },
        size: 4 * 1024 * 1024
      };
      showInfoView();
      assert.equal(document.getElementById('info-size').textContent,
        '4 byteUnit-MB');
    });
  });

  suite('#Update dialog tests', function() {
    var thumbnailItemName = 'dummy-file-name-09.3gp';

    suiteSetup(function() {
      MediaDB = new MockMediaDB();

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
      assert.isTrue(dom.overlay.classList.contains('hidden'));
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

      assert.isTrue(dom.overlayMenu.classList.contains('hidden'));
      assert.isTrue(dom.overlayActionButton.classList.contains('hidden'));
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

      assert.isFalse(dom.overlayMenu.classList.contains('hidden'));
      assert.isFalse(dom.overlayActionButton.classList.contains('hidden'));
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

      assert.isFalse(dom.overlayMenu.classList.contains('hidden'));
      assert.isFalse(dom.overlayActionButton.classList.contains('hidden'));
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

      assert.isTrue(dom.overlayMenu.classList.contains('hidden'));
      assert.isTrue(dom.overlayActionButton.classList.contains('hidden'));
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

      assert.isTrue(dom.overlayMenu.classList.contains('hidden'));
      assert.isTrue(dom.overlayActionButton.classList.contains('hidden'));
      assert.equal(dom.overlayTitle.textContent, 'pluggedin-title');
      assert.equal(dom.overlayText.textContent, 'pluggedin-text');
    });
  });

  suite('#showPlayer flows', function() {

    var selectedVideo;
    var videoDuration;
    var selectedThumbnail;

    var playerPlaySpy;
    var playerPauseSpy;

    function getTitle(autoPlay, enterFullscreen, keepControls, misc) {
      var appendage;
      var title = '#showPlayer: ';

      // All three boolean arguments need to be passed or none.
      // If none, misc argument can be passed by itself or together
      // with the booleans.
      if (arguments.length > 1) {
        if (!autoPlay) {
          title += '!';
        }
        title += 'play';
        title += ', ';

        if (!enterFullscreen) {
          title += '!';
        }
        title += 'fullscreen';
        title += ', ';

        if (!keepControls) {
          title += '!';
        }
        title += 'show controls';

        if (arguments.length === 4) {
          title += ' - ';

          appendage = misc;
        }
      }
      else {
        appendage = autoPlay;
      }

      if (arguments.length === 4 || arguments.length === 1) {
        title += appendage;
      }
      return title;
    }

    suiteSetup(function(done) {

      dom.player = new MockVideoPlayer();

      playerPlaySpy = sinon.spy(dom.player, 'play');
      playerPauseSpy = sinon.spy(dom.player, 'pause');

      videoDuration = 1.25;

      selectedVideo = {
        'name': 'test-video.webm',
        'type': 'video\/webm',
        'size': '19565',
        'date': '1395088917000',
        'metadata': {
            'isVideo': 'true',
            'title': 'test-video1',
            'duration': videoDuration,
            'width': '640',
            'height': '360',
            'rotation': '0',
            'currentTime': 0
        }
      };

      MockThumbnailGroup.reset();
      var dummyContainer = document.createElement('div');

      thumbnailList = new ThumbnailList(MockThumbnailGroup, dummyContainer);

      // Thumbnail being selected is not focused
      MockThumbnailGroup._GroupID = '2014-03_selected';
      thumbnailList.addItem(selectedVideo);
      selectedThumbnail =
          thumbnailList.thumbnailMap[selectedVideo.name];

      function getAsset(filename, loadCallback) {
        var req = new XMLHttpRequest();
        req.open('GET', filename, true);
        req.responseType = 'blob';
        req.onload = function() {
          loadCallback(req.response);
        };
        req.send();
      }

      getAsset('/test/unit/media/test.webm', function(blob) {
        videodb = new MockMediaDB(blob);
        done();
      });
    });

    suiteTeardown(function() {
      dom.player = null;
    });

    setup(function() {
      selectedThumbnail.htmlNode.classList.remove('focused');
      dom.player.duration = 0;
      dom.player.currentTime = -1;
    });

    teardown(function() {
      playerPlaySpy.reset();
      playerPauseSpy.reset();
    });

    /**
     * autoPlay=false, enterFullscreen=false, keepControls=true, current
     * video exists, video is NOT seeking
     *   + show, do not play, current video
     *   + do not show fullscreen
     *   + do not auto-hide controls
     *   + change focus from 'old' thumbnail to newly selected
     *   + 'doneSeeking' function is called synchronously
     *   + video player is paused
     */
    test(getTitle(false, false, true,
                  'curr video !exist, video !seeking'),
        function() {

      currentVideo = {
        'name': 'current video',
        'type': 'video\/webm',
        'size': '1048576',
        'date': '1395088917000',
        'metadata': {
            'isVideo': 'true',
            'title': 'test-video2',
            'duration': '5:00',
            'width': '640',
            'height': '360',
            'rotation': '0',
            'currentTime': 1.2
        }
      };

      // Mock that the 'current' thumbnail is focused
      MockThumbnailGroup._GroupID = '2014-03_current';
      thumbnailList.addItem(currentVideo);
      var currentThumbnail = thumbnailList.thumbnailMap[currentVideo.name];
      currentThumbnail.htmlNode.classList.add('focused');
      dom.play.classList.add('paused');

      document.body.classList.add(LAYOUT_MODE.list); // Stage list layout
      dom.videoControls.classList.add('hidden'); // Stage controls being hidden
      dom.player.setSeeking(false);
      dom.player.setDuration(videoDuration);

      showPlayer(selectedVideo,
                 false, /* autoPlay */
                 false, /* enterFullscreen */
                 true /* keepControls */);

      assert.equal(containsClass(currentThumbnail.htmlNode,
                   'focused'), false);
      assert.equal(containsClass(selectedThumbnail.htmlNode,
                   'focused'), true);

      assert.equal(dom.player.preload, 'metadata');
      assert.isTrue(dom.player.hidden);

      //
      // showPlayer calls setVideoUrl which sets 'src' of
      // video element. Except that we're using a mock video
      // object so onloadedmetadata is not going to be called
      // automatically -- invoke it manually
      //
      dom.player.onloadedmetadata();
      //
      // enterFullscreen is false -- did not enter fullscreen
      //
      assert.equal(containsClass(document.body,
                                 LAYOUT_MODE.list), true);
      assert.equal(containsClass(document.body,
                                 LAYOUT_MODE.fullscreenPlayer), false);
      assert.equal(dom.durationText.textContent, '00:01');
      assert.equal(dom.player.currentTime, currentVideo.metadata.currentTime);
      //
      // video is not seeking -- 'doneSeeking' is called syncronously
      //   * autoPlay is false -- video is paused
      //   * keepControls is true -- controls not hidden
      //
      assert.isTrue(containsClass(dom.play, 'paused'));
      assert.isTrue(playerPauseSpy.calledOnce);
      assert.isFalse(containsClass(dom.videoControls, 'hidden'));
      assert.isNull(dom.player.onseeked);
    });

    /**
     * This test is the same as 'test1' except that in test1
     * the video is not seeking whereas in this test the video
     * is seeking.
     *
     * autoPlay=false, enterFullscreen=false, keepControls=true, current
     * video exists, video IS seeking
     *   + show, do not play, current video
     *   + do not show fullscreen
     *   + do not auto-hide controls
     *   + change focus from 'old' thumbnail to newly selected
     *   + 'doneSeeking' function is not called synchronously
     *   + video player is paused when 'doneSeeking' is called
     */
    test(getTitle(false, false, true,
                  'curr video !exist, video seeking'),
        function() {

      dom.player.setSeeking(true);

      showPlayer(selectedVideo,
                 false, /* autoPlay */
                 false, /* enterFullscreen */
                 true /* keepControls */);

      //
      // showPlayer calls setVideoUrl which sets 'src' of
      // video element. Except that we're using a mock video
      // object so onloadedmetadata is not going to be called
      // automatically -- invoke it manually
      //
      dom.player.onloadedmetadata();
      //
      // video is seeking -- 'doneSeeking' is not called syncronously
      //  * dom.player.onseeked is set to 'doneSeeking' function
      //
      assert.isTrue(dom.player.onseeked.toString().search('doneSeeking') > 0);
      assert.equal(playerPauseSpy.callCount, 0);
      dom.player.onseeked();
      //
      //   * autoPlay is false -- video is paused
      //   * keepControls is true -- controls not hidden
      //
      assert.isTrue(containsClass(dom.play, 'paused'));
      assert.isTrue(playerPauseSpy.calledOnce);
      assert.isFalse(containsClass(dom.videoControls, 'hidden'));
      assert.isNull(dom.player.onseeked);
    });

    /**
     * autoPlay=false, enterFullscreen=false, keepControls=true, current
     * video does NOT exist, video is not seeking
     *   + show, do not play, current video
     *   + do not show fullscreen
     *   + do not auto-hide controls
     *   + current video is set to selected video
     *   + selected video becomes focused
     *   + 'doneSeeking' function is called synchronously
     *   + video player is paused
     */
     test(getTitle(false, false, true,
                   'curr video does not exist, video not seeking'),
         function() {

      currentVideo = null;
      dom.player.setSeeking(false);
      dom.player.setDuration(videoDuration);

      document.body.classList.add(LAYOUT_MODE.list); // Stage list layout
      dom.videoControls.classList.add('hidden'); // Stage controls being hidden

      showPlayer(selectedVideo,
                 false, /* autoPlay */
                 false, /* enterFullscreen */
                 true /* keepControls */);

      // currentVideo should be same as selectedVideo
      assert.equal(currentVideo.name, selectedVideo.name);
      assert.equal(currentVideo.type, selectedVideo.type);
      assert.equal(currentVideo.date, selectedVideo.date);
      assert.equal(currentVideo.metadata.isVideo,
                   selectedVideo.metadata.isVideo);
      assert.equal(currentVideo.metadata.title,
                   selectedVideo.metadata.title);
      assert.equal(currentVideo.metadata.duration,
                   selectedVideo.metadata.duration);
      assert.equal(currentVideo.metadata.width,
                   selectedVideo.metadata.width);
      assert.equal(currentVideo.metadata.height,
                   selectedVideo.metadata.height);
      assert.equal(currentVideo.metadata.rotation,
                   selectedVideo.metadata.rotation);
      assert.equal(currentVideo.metadata.currentTime,
                   selectedVideo.metadata.currentTime);

      assert.isTrue(containsClass(selectedThumbnail.htmlNode, 'focused'));
      assert.equal(dom.player.preload, 'metadata');
      assert.isTrue(dom.player.hidden);

      dom.player.onloadedmetadata();

      assert.equal(dom.durationText.textContent, '00:01');
      assert.equal(dom.player.currentTime, 0);
      assert.equal(containsClass(document.body,
                   LAYOUT_MODE.list), true);
      assert.equal(containsClass(document.body,
                   LAYOUT_MODE.fullscreenPlayer), false);
      assert.isTrue(dom.play.classList.contains('paused'));
      assert.isTrue(playerPauseSpy.calledOnce);
    });

    /**
     * This test tests that the video player is playing after
     * showPlayer is called.
     *
     * autoPlay=true, enterFullscreen=false, keepControls=true, current
     * video does not exist, video is NOT seeking
     *   + 'doneSeeking' function is called synchronously
     *   + video player is playing
     *
     *   This test does not test the body of show player as
     *   that has already been tested fully by the previous
     *   tests.
     */
    test(getTitle(true, false, true), function() {

      currentVideo = null;
      dom.player.setSeeking(false);

      document.body.classList.add(LAYOUT_MODE.list); // Not fullscreen
      dom.videoControls.classList.add('hidden');

      showPlayer(selectedVideo,
                 true, /* autoPlay */
                 false, /* enterFullscreen */
                 true /* keepControls */);

      dom.player.onloadedmetadata();

      assert.isTrue(containsClass(document.body, LAYOUT_MODE.list));
      assert.isFalse(containsClass(dom.play, 'paused'));
      assert.isTrue(playerPlaySpy.calledOnce);
      assert.isFalse(containsClass(dom.videoControls, 'hidden'));
    });

   /**
    * This test tests that the video player is shown fullscreen.
    *
    * autoPlay=true, enterFullscreen=true, keepControls=true, current
    * video does not exist, video is NOT seeking
    *   + 'doneSeeking' function is called synchronously
    *   + video player is playing
    *   + video player is fullscreen
    *
    *   This test does not test the body of show player as
    *   that has already been tested fully by the previous
    *   tests.
    */
    test(getTitle(true, true, true), function() {

      currentVideo = null;
      dom.player.setSeeking(false);

      //
      // Not fullscreen, prepare to change layout made to fullscreen
      //
      currentLayoutMode = LAYOUT_MODE.list;
      document.body.classList.add(LAYOUT_MODE.list);

      dom.videoControls.classList.add('hidden');

      showPlayer(selectedVideo,
                 true, /* autoPlay */
                 true, /* enterFullscreen */
                 true /* keepControls */);

      dom.player.onloadedmetadata();

      assert.equal(containsClass(document.body,
                   LAYOUT_MODE.list), false);
      assert.equal(containsClass(document.body,
                   LAYOUT_MODE.fullscreenPlayer), true);
      assert.isFalse(containsClass(dom.play, 'paused'));
      assert.isTrue(playerPlaySpy.calledOnce);
      assert.equal(playerPauseSpy.callCount, 0);
      assert.isFalse(containsClass(dom.videoControls, 'hidden'));
    });

   /**
    * This test tests that the video controls are not shown.
    *
    * autoPlay=true, enterFullscreen=true, keepControls=false, current
    * video does not exist, video is NOT seeking
    *   + 'doneSeeking' function is called synchronously
    *   + video player is playing
    *   + video player is fullscreen
    *   + controls are not shown
    *
    *   This test does not test the body of show player as
    *   that has already been tested fully by the previous
    *   tests.
    */
    test(getTitle(true, true, false), function(done) {

      currentVideo = null;
      dom.player.setSeeking(false);

      //
      // Not fullscreen, prepare to change layout made to fullscreen
      //
      currentLayoutMode = LAYOUT_MODE.list;
      document.body.classList.add(LAYOUT_MODE.list);

      // In order to test 'setControlsVisibility(true)'
      isPhone = true;
      dom.videoControls.classList.remove('hidden');

      showPlayer(selectedVideo,
                 true, /* autoPlay */
                 true, /* enterFullscreen */
                 false /* keepControls */);

      dom.player.onloadedmetadata();

      assert.equal(containsClass(document.body,
                   LAYOUT_MODE.list), false);
      assert.equal(containsClass(document.body,
                   LAYOUT_MODE.fullscreenPlayer), true);
      assert.isFalse(containsClass(dom.play, 'paused'));
      assert.isTrue(playerPlaySpy.calledOnce);
      assert.equal(playerPauseSpy.callCount, 0);

      setTimeout(function() {
        assert.isTrue(containsClass(dom.videoControls, 'hidden'));
        done();
      }, 0);
    });

    /**
     *   Tests whether the appropriate video-related elements
     *   are set properly based on the metadata of the selected video:
     *
     *   - video position is not at end
     */
    test(getTitle('selected video has metadata, video not at end'),
        function() {

      currentVideo = null;
      selectedVideo.metadata.currentTime = 0;
      dom.player.setSeeking(false);

      showPlayer(selectedVideo,
                 false, /* autoPlay */
                 false, /* enterFullscreen */
                 true /* keepControls */);

      dom.player.onloadedmetadata();

      assert.equal(dom.player.currentTime,
                   selectedVideo.metadata.currentTime);
      assert.equal(dom.videoTitle.textContent,
          selectedVideo.metadata.title);
    });

    /**
     *   Tests whether the appropriate video-related elements
     *   are set properly based on the metadata of the selected video:
     *
     *   - video position is at end
     */
    test(getTitle('selected video has metadata, video at end'),
        function() {

      currentVideo = null;
      dom.player.setDuration(videoDuration);
      selectedVideo.metadata.currentTime = videoDuration;
      dom.player.setSeeking(false);

      showPlayer(selectedVideo,
                 false, /* autoPlay */
                 false, /* enterFullscreen */
                 true /* keepControls */);

      dom.player.onloadedmetadata();

      assert.equal(dom.player.currentTime, 0);
      assert.equal(dom.videoTitle.textContent, currentVideo.metadata.title);
    });

    /**
     *   Tests whether the appropriate video-related elements
     *   are set properly based on the metadata of the selected video:
     *
     *   - video has not been played before (metadata.currentTime
     *     has no value)
     */
    test(getTitle('selected video has metadata, first time played'),
        function() {

      dom.player.setSeeking(false);
      currentVideo = null;
      selectedVideo = {
        'name': 'test-video.webm',
        'type': 'video\/webm',
        'size': '19565',
        'date': '1395088917000',
        'metadata': {
            'isVideo': 'true',
            'title': 'test-video1',
            'duration': videoDuration,
            'width': '640',
            'height': '360',
            'rotation': '0'
        }
      };

      showPlayer(selectedVideo,
                 false, /* autoPlay */
                 false, /* enterFullscreen */
                 true /* keepControls */);

      dom.player.onloadedmetadata();

      assert.equal(dom.player.currentTime, 0);
      assert.equal(dom.videoTitle.textContent, currentVideo.metadata.title);
    });

    /**
     *   Tests whether the appropriate video-related elements
     *   are set properly based on the metadata of the selected video:
     *
     *   - video does not have metadata
     *   - video does not have a title
     */
    test(getTitle('selected video has no metadata, no title'),
        function() {

      dom.player.setSeeking(false);
      currentVideo = null;
      selectedVideo = {
        'name': 'test-video.webm',
        'type': 'video\/webm',
        'size': '19565',
        'date': '1395088917000'
      };

      showPlayer(selectedVideo,
                 false, /* autoPlay */
                 false, /* enterFullscreen */
                 true /* keepControls */);

      dom.player.onloadedmetadata();

      assert.equal(dom.player.currentTime, 0);
      assert.equal(dom.videoTitle.textContent, '');
    });

    /**
     *   Tests whether the appropriate video-related elements
     *   are set properly based on the metadata of the selected video:
     *
     *   - video does not have metadata
     *   - video does have a title
     */
    test(getTitle('selected video has no metadata, has title'),
        function() {

      dom.player.setSeeking(false);
      currentVideo = null;
      selectedVideo = {
        'name': 'test-video.webm',
        'type': 'video\/webm',
        'size': '19565',
        'date': '1395088917000',
        'title': 'test-video1'
      };

      showPlayer(selectedVideo,
                 false, /* autoPlay */
                 false, /* enterFullscreen */
                 true /* keepControls */);

      dom.player.onloadedmetadata();

      assert.equal(dom.player.currentTime, 0);
      assert.equal(dom.videoTitle.textContent, selectedVideo.title);
    });
  });

  suite('hidePlayer flows', function() {
    var playerPauseSpy;
    var playerLoadSpy;
    var startParsingMetadataSpy;
    var updateMetadataDbSpy;
    var updatePosterSpy;
    var setWatchedSpy;

    suiteSetup(function() {

      dom.player = new MockVideoPlayer();

      playerPauseSpy = sinon.spy(dom.player, 'pause');
      playerLoadSpy = sinon.spy(dom.player, 'load');
      startParsingMetadataSpy = sinon.spy();
      startParsingMetadata = startParsingMetadataSpy;
      updateMetadataDbSpy = sinon.spy();
      updatePosterSpy = sinon.spy();
      setWatchedSpy = sinon.spy();

      // We need a mock captureFrame function as opposed to simply
      // using a spy because the function needs to have an implementation,
      // it needs to invoke the callback function.
      captureFrame = function captureFrame(player, metadata, callback) {
        callback();
      };

      videodb = new MockMediaDB();
      updateMetadataDbSpy = sinon.spy(videodb, 'updateMetadata');

      currentVideo = {
        'name': 'video name'
      };

      thumbnailList.addItem(currentVideo);
      var thumbnail = thumbnailList.thumbnailMap[currentVideo.name];
      thumbnail.updatePoster = updatePosterSpy;
      thumbnail.setWatched = setWatchedSpy;
    });

    setup(function() {
      playerPauseSpy.reset();
      playerLoadSpy.reset();
      startParsingMetadataSpy.reset();
      updateMetadataDbSpy.reset();
      updatePosterSpy.reset();
      setWatchedSpy.reset();
    });

    test('#hidePlayer: !update metadata, playerShowing, !callback',
        function() {

      pendingPick = false;
      playerShowing = true;

      // hidePlayer pauses the video and removes the 'paused' class; TODO: why?
      // In the 'playerShowing' flow, dom.play has 'paused' attribute,
      // which gets removed during the flow
      dom.play.classList.add('paused');

      // In the 'playerShowing' flow, dom.player has 'src' attribute,
      // which gets removed during the flow
      dom.player.src = 'about:blank';

      hidePlayer(false);

      assert.isFalse(containsClass(dom.play, 'paused'));
      assert.isFalse(dom.player.hasAttribute('src'));
      assert.isFalse(playerShowing);
      assert.isTrue(playerLoadSpy.calledOnce);
      assert.isTrue(startParsingMetadataSpy.calledOnce);
    });

    /**
     * updateVideoMetadata is true and currentVideo.metadata is not null,
     * pendingPick is false -- updateMetadata function should be invoked
     * (not first time watched)
     */
    test('#hidePlayer: update metadata (1), playerShowing, !callback',
        function() {
      playerShowing = true;
      pendingPick = false;

      // hidePlayer pauses video and then removes 'paused' class - TODO: why?
      dom.play.classList.add('paused');
      dom.player.src = 'about:blank';

      //
      // Initialize dom.player.currentTime in order to test
      // that currentVideo.metadata.currentTime is set to
      // dom.player.currentTime
      //
      dom.player.currentTime = 1;

      currentVideo = {
        'name': 'video name',
        'metadata': {
          'title': 'video title',
          'watched': true
        }
      };

      hidePlayer(true);

      assert.isFalse(containsClass(dom.play, 'paused'));
      assert.isFalse(dom.player.hasAttribute('src'));
      assert.isFalse(playerShowing);
      assert.isTrue(playerLoadSpy.calledOnce);
      assert.isTrue(startParsingMetadataSpy.calledOnce);
      assert.isTrue(updatePosterSpy.calledOnce);
      assert.isFalse(setWatchedSpy.calledOnce);
      assert.isTrue(currentVideo.metadata.watched);
      assert.isTrue(updateMetadataDbSpy.calledOnce);
      assert.equal(currentVideo.metadata.currentTime, dom.player.currentTime);
    });

    /**
     * updateVideoMetadata is true and currentVideo.metadata is not null,
     * pendingPick is false -- updateMetadata function should be invoked
     * (first time watched)
     */
    test('#hidePlayer: update metadata (2), playerShowing, !callback',
        function() {
      playerShowing = true;
      pendingPick = false;

      dom.play.classList.add('paused');
      dom.player.src = 'about:blank';

      //
      // Initialize dom.player.currentTime in order to test
      // that currentVideo.metadata.currentTime is set to
      // dom.player.currentTime
      //
      dom.player.currentTime = 1;

      currentVideo = {
        'name': 'video name',
        'metadata': {
          'title': 'video title',
          'watched': false
        }
      };

      hidePlayer(true);

      assert.isFalse(containsClass(dom.play, 'paused'));
      assert.isFalse(dom.player.hasAttribute('src'));
      assert.isFalse(playerShowing);
      assert.isTrue(playerLoadSpy.calledOnce);
      assert.isTrue(startParsingMetadataSpy.calledOnce);
      assert.isTrue(updatePosterSpy.calledOnce);
      assert.isTrue(setWatchedSpy.calledOnce);
      assert.isTrue(currentVideo.metadata.watched);
      assert.isTrue(updateMetadataDbSpy.calledOnce);
      assert.equal(currentVideo.metadata.currentTime, dom.player.currentTime);
    });

    /**
     * updateVideoMetadata is true and currentVideo.metadata is not null,
     * pendingPick is true -- updateMetadata function should not be invoked.
     */
    test('#hidePlayer: update metadata (3), playerShowing, !callback',
        function() {
      playerShowing = true;
      pendingPick = true;

      dom.play.classList.add('paused');
      dom.player.src = 'about:blank';

      //
      // Initialize dom.player.currentTime in order to test
      // that currentVideo.metadata.currentTime is NOT set to
      // dom.player.currentTime (since updateMetadata should
      // not be called).
      //
      dom.player.currentTime = 1;
      var currentTime = 10;

      currentVideo = {
        'name': 'video name',
        'metadata': {
          'title': 'video title',
          'watched': false,
          'currentTime': currentTime
        }
      };

      hidePlayer(true);

      assert.isFalse(containsClass(dom.play, 'paused'));
      assert.isTrue(playerPauseSpy.calledOnce);
      assert.isFalse(dom.player.hasAttribute('src'));
      assert.isTrue(playerLoadSpy.calledOnce);
      assert.isFalse(playerShowing);
      assert.isTrue(startParsingMetadataSpy.calledOnce);
      assert.isFalse(updatePosterSpy.calledOnce);
      assert.isFalse(setWatchedSpy.calledOnce);
      assert.isFalse(currentVideo.metadata.watched);
      assert.isFalse(updateMetadataDbSpy.calledOnce);
      assert.equal(currentVideo.metadata.currentTime, currentTime);
    });

    /**
     * updateVideoMetadata is true, currentVideo.metadata is null --
     * updateMetadata function should not be invoked.
     */
    test('#hidePlayer: update metadata (4), playerShowing, !callback',
        function() {
      playerShowing = true;
      pendingPick = false;

      dom.play.classList.add('paused');
      dom.player.src = 'about:blank';

      // dom.player.currentTime is not set for this test because
      // the current video for this test has no metadata therefore
      // there is no assertion regarding the value of
      // currentVideo.metadata.currentTime

      currentVideo = {
        'name': 'video name'
      };

      hidePlayer(true);

      assert.isFalse(containsClass(dom.play, 'paused'));
      assert.isTrue(playerPauseSpy.calledOnce);
      assert.isFalse(dom.player.hasAttribute('src'));
      assert.isFalse(playerShowing);
      assert.isTrue(playerLoadSpy.calledOnce);
      assert.isTrue(startParsingMetadataSpy.calledOnce);
      assert.isFalse(updatePosterSpy.calledOnce);
      assert.isFalse(setWatchedSpy.calledOnce);
      assert.isFalse(updateMetadataDbSpy.calledOnce);
    });

    /**
     * updateVideoMetadata is true and currentVideo.metadata is not null,
     * pendingPick is false -- updateMetadata function should be invoked
     * (first time watched). hidePlayer callback is specified.
     */
    test('#hidePlayer: update metadata (5), playerShowing, callback',
        function(done) {
      playerShowing = true;
      pendingPick = false;

      dom.play.classList.add('paused');
      dom.player.src = 'about:blank';

      //
      // Initialize dom.player.currentTime in order to test
      // that currentVideo.metadata.currentTime is set to
      // dom.player.currentTime
      //
      dom.player.currentTime = 1;

      currentVideo = {
        'name': 'video name',
        'metadata': {
          'title': 'video title',
          'watched': false
        }
      };

      hidePlayer(true, function() {
        assert.isFalse(containsClass(dom.play, 'paused'));
        assert.isTrue(playerPauseSpy.calledOnce);
        assert.isFalse(dom.player.hasAttribute('src'));
        assert.isFalse(playerShowing);
        assert.isTrue(playerLoadSpy.calledOnce);
        assert.isTrue(startParsingMetadataSpy.calledOnce);
        assert.isTrue(updatePosterSpy.calledOnce);
        assert.isTrue(setWatchedSpy.calledOnce);
        assert.isTrue(currentVideo.metadata.watched);
        assert.isTrue(updateMetadataDbSpy.calledOnce);
        assert.equal(currentVideo.metadata.currentTime, dom.player.currentTime);
        done();
      });
    });

    /**
     * updateVideoMetadata is false -- updateMetadata function should not
     * be invoked. hidePlayer callback is specified and should be called.
     */
    test('#hidePlayer: !update metadata, playerShowing, callback',
        function(done) {
      pendingPick = false;
      playerShowing = true;

      // In the 'playerShowing' flow, dom.play has 'paused' attribute,
      // which gets removed during the flow
      dom.play.classList.add('paused');

      // In the 'playerShowing' flow, dom.player has 'src' attribute,
      // which gets removed during the flow
      dom.player.src = 'about:blank';

      // dom.player.currentTime is not set for this test because
      // 'updateVideoMetadata' is false and the current video for
      // this test has no metadata. Therefore, there is no assertion
      // regarding the value of currentVideo.metadata.currentTime

      hidePlayer(false, function() {
        assert.isFalse(containsClass(dom.play, 'paused'));
        assert.isTrue(playerPauseSpy.calledOnce);
        assert.isFalse(dom.player.hasAttribute('src'));
        assert.isFalse(playerShowing);
        assert.isTrue(playerLoadSpy.calledOnce);
        assert.isTrue(startParsingMetadataSpy.calledOnce);
        assert.isFalse(updateMetadataDbSpy.calledOnce);
        done();
      });
    });

    /**
     * updateMetadata is true but playerShowing is false, hidePlayer should be
     * a noop other than to call the hidePlayer callback if specified, which
     * it is for this test.
     */
    test('#hidePlayer: !update metadata, !playerShowing, callback',
        function(done) {

      // In the 'playerShowing' flow, dom.play has 'paused' attribute
      // and dom.player has 'src' attribute. Set these to test that
      // in the !playerShowing flow these attributes are not changed.
      dom.play.classList.add('paused');
      dom.player.src = 'about:blank';

      // dom.player.currentTime is not set for this test because
      // 'updateVideoMetadata' is false and the current video for
      // this test has no metadata. Therefore, there is no assertion
      // regarding the value of currentVideo.metadata.currentTime

      playerShowing = false;

      hidePlayer(false, function() {
        assert.isTrue(containsClass(dom.play, 'paused'));
        assert.isFalse(playerPauseSpy.calledOnce);
        assert.isTrue(dom.player.hasAttribute('src'));
        assert.isFalse(playerShowing);
        assert.isFalse(playerLoadSpy.calledOnce);
        assert.isFalse(startParsingMetadataSpy.calledOnce);
        assert.isFalse(updatePosterSpy.calledOnce);
        assert.isFalse(setWatchedSpy.calledOnce);
        assert.isFalse(updateMetadataDbSpy.calledOnce);
        done();
      });
    });

    /**
     * updateMetadata is false and playerShowing is false, hidePlayer should be
     * a noop other than to call the hidePlayer callback if specified, which
     * it is not for this test.
     */
    test('#hidePlayer: !update metadata, !playerShowing, !callback',
        function() {

      // In the 'playerShowing' flow, dom.play has 'paused' attribute
      // and dom.player has 'src' attribute. Set these to test that
      // in the !playerShowing flow these attributes are not changed.
      dom.play.classList.add('paused');
      dom.player.src = 'about:blank';

      // dom.player.currentTime is not set for this test because
      // 'updateVideoMetadata' is false and the current video for
      // this test has no metadata. Therefore, there is no assertion
      // regarding the value of currentVideo.metadata.currentTime

      playerShowing = false;

      hidePlayer(false);

      assert.isTrue(containsClass(dom.play, 'paused'));
      assert.isFalse(playerPauseSpy.calledOnce);
      assert.isTrue(dom.player.hasAttribute('src'));
      assert.isFalse(playerShowing);
      assert.isFalse(startParsingMetadataSpy.calledOnce);
      assert.isFalse(updatePosterSpy.calledOnce);
      assert.isFalse(setWatchedSpy.calledOnce);
      assert.isFalse(updateMetadataDbSpy.calledOnce);
    });

    /**
     * updateMetadata is true, playerShowing is false: hidePlayer should be
     * a noop other than to call the hidePlayer callback if specified, which
     * it is for this test.
     */
    test('#hidePlayer: update metadata, !playerShowing, callback',
        function(done) {

      // In the 'playerShowing' flow, dom.play has 'paused' attribute
      // and dom.player has 'src' attribute. Set these to test that
      // in the !playerShowing flow these attributes are not changed.
      dom.play.classList.add('paused');
      dom.player.src = 'about:blank';

      // dom.player.currentTime is not set for this test because
      // 'playerShowing' is false and the current video for
      // this test has no metadata. Therefore, there is no assertion
      // regarding the value of currentVideo.metadata.currentTime

      playerShowing = false;

      hidePlayer(true, function() {
        assert.isTrue(containsClass(dom.play, 'paused'));
        assert.isFalse(playerPauseSpy.calledOnce);
        assert.isTrue(dom.player.hasAttribute('src'));
        assert.isFalse(playerShowing);
        assert.isFalse(startParsingMetadataSpy.calledOnce);
        assert.isFalse(updatePosterSpy.calledOnce);
        assert.isFalse(setWatchedSpy.calledOnce);
        assert.isFalse(updateMetadataDbSpy.calledOnce);
        done();
      });
    });

    /**
     * updateMetadata is true, playerShowing is false: hidePlayer should be
     * a noop other than to call the hidePlayer callback if specified, which
     * it is not for this test.
     */
    test('#hidePlayer: update metadata, !playerShowing, !callback',
        function() {

      // In the 'playerShowing' flow, dom.play has 'paused' attribute
      // and dom.player has 'src' attribute. Set these to test that
      // in the !playerShowing flow these attributes are not changed.
      dom.play.classList.add('paused');
      dom.player.src = 'about:blank';

      // dom.player.currentTime is not set for this test because
      // 'playerShowing' is false and the current video for
      // this test has no metadata. Therefore, there is no assertion
      // regarding the value of currentVideo.metadata.currentTime

      playerShowing = false;

      hidePlayer(true);

      assert.isTrue(containsClass(dom.play, 'paused'));
      assert.isFalse(playerPauseSpy.calledOnce);
      assert.isTrue(dom.player.hasAttribute('src'));
      assert.isFalse(playerShowing);
      assert.isFalse(startParsingMetadataSpy.calledOnce);
      assert.isFalse(updatePosterSpy.calledOnce);
      assert.isFalse(setWatchedSpy.calledOnce);
      assert.isFalse(updateMetadataDbSpy.calledOnce);
    });
  });
});
