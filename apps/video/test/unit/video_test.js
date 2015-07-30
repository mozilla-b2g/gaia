/* global clearTimeout:true,currentVideo:true,storageState:true,
  thumbnailList:true,LazyLoader:true,pendingPick:true,isPhone:true,
  firstScanEnded:true,metadataQueue:true,MediaDB:true,isPortrait:true,
  currentLayoutMode:true,playerShowing:true,processingQueue:true,
  pendingUpdateTitleText:true,controlShowing:true,touchStartID:true,
  selectedFileNames:true,selectedFileNamesToBlobs:true,dragging:true,
  sliderRect:true,updateVideoControlSlider:true,setControlsVisibility:true,
  controlFadeTimeout:true,handleSliderTouchMove:true */
/* global handleScreenLayoutChange,HAVE_NOTHING,handleSliderKeypress,
  hideOptionsView,MockLazyLoader,MockVideoPlayer,ThumbnailList,
  toggleVideoControls,showOptionsView,ScreenLayout,MocksHelper,dom,
  MockThumbnailGroup,MediaUtils,showInfoView,hideInfoView,
  updateSelection,setButtonPaused,handleSliderTouchStart,MockMediaDB,
  handleSliderTouchEnd,loadingChecker,MockL10n,VideoUtils,
  updateDialog,LAYOUT_MODE,showPlayer,hidePlayer,MockThumbnailItem */
'use strict';

require('/shared/js/lazy_loader.js');
require('/shared/js/l10n.js');
require('/shared/js/l10n_date.js');
require('/shared/js/media/media_utils.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_screen_layout.js');
require('/shared/test/unit/mocks/mock_video_stats.js');
requireApp('/video/js/video_utils.js');
requireApp('/video/test/unit/mock_l10n.js');
requireApp('/video/test/unit/mock_metadata.js');
requireApp('/video/test/unit/mock_mediadb.js');
requireApp('/video/test/unit/mock_thumbnail_group.js');
requireApp('/video/test/unit/mock_thumbnail_item.js');
requireApp('/video/test/unit/mock_video_loading_checker.js');
requireApp('/video/test/unit/mock_video_player.js');
requireApp('/video/js/thumbnail_list.js');

// Declare variables used in video.js that are declared in other
// javascript files (that we don't want to pull in).
var videodb;              // Declared in db.js
var startParsingMetadata; // Declared in metadata.js
var ThumbnailItem;

function containsClass(element, value) {
  return element.classList.contains(value);
}

var mocksForVideo = new MocksHelper([
  'ScreenLayout'
]);

function getAsset(filename, loadCallback) {
  var req = new XMLHttpRequest();
  req.open('GET', filename, true);
  req.responseType = 'blob';
  req.onload = function() {
    loadCallback(req.response);
  };
  req.send();
}

function testOverlayVisibility(expected) {
  assert.equal(document.body.classList.contains('overlay'), expected);
  assert.equal(dom.overlay.classList.contains('hidden'), !expected);
}

suite('Video App Unit Tests', function() {
  var nativeMozL10n;
  var videoName = 'video name';

  suiteSetup(function(done) {

    mocksForVideo.suiteSetup();

    // Create DOM structure
    loadBodyHTML('/index.html');

    nativeMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    MediaUtils._ = MockL10n.get;
    requireApp('/video/js/video.js', done);
  });

  suiteTeardown(function() {
    navigator.mozL10n = nativeMozL10n;
  });

  suite('#Video Info Populate Data', function() {
    suiteSetup(function() {
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
        '00:06');
      assert.equal(document.getElementById('info-type').textContent,
        'webm');
      assert.equal(document.getElementById('info-date').textContent,
        '08/07/2013');
      assert.equal(document.getElementById('info-resolution').textContent,
        '560x320');
    });

    test('#Test show info view', function() {
      assert.isFalse(dom.infoView.classList[0] === 'hidden');
      assert.isTrue(document.body.classList.contains('info-view'));
    });

    test('#Test hide info view', function() {
      hideInfoView();
      assert.isTrue(dom.infoView.classList[0] === 'hidden');
      assert.isFalse(document.body.classList.contains('info-view'));
    });
  });

  suite('#Video Action Menu Test', function() {

    test('#Test show option view', function() {
      showOptionsView();
      assert.isFalse(dom.optionsView.classList[0] === 'hidden');
      assert.isTrue(document.body.classList.contains('options-view'));
    });

    test('#Test hide option view', function() {
      hideOptionsView();
      assert.isTrue(dom.optionsView.classList[0] === 'hidden');
      assert.isFalse(document.body.classList.contains('options-view'));
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
    var realLazyLoader;

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

      realLazyLoader = LazyLoader;
      LazyLoader = MockLazyLoader;
    });

    setup(function() {
      dom.overlayTitle.setAttribute('data-l10n-id', '');
      dom.overlayText.setAttribute('data-l10n-id', '');
      dom.overlay.classList.add('hidden');
      document.body.classList.remove('overlay');
    });

    suiteTeardown(function() {
      LazyLoader = realLazyLoader;
    });

    /**
     * If there is at least one thumbnail loaded, hide overlay
     */
    test('#Update dialog, hide overlay', function(done) {
      thumbnailList.addItem({'name': thumbnailItemName});
      updateDialog();
      setTimeout(function() {
        testOverlayVisibility(false);
        done();
      }, 1);
    });

    /**
     * DB being upraded
     */
    test('#Update dialog, db upgrade, \'upgrade\' title and text',
        function(done) {
      thumbnailList.removeItem(thumbnailItemName);
      storageState = MediaDB.UPGRADING;
      dom.overlayMenu.classList.remove('hidden');
      dom.overlayActionButton.classList.remove('hidden');

      updateDialog();

      // Allow lazy loader to load
      setTimeout(function() {
        testOverlayVisibility(true);
        assert.isTrue(dom.overlayMenu.classList.contains('hidden'));
        assert.isTrue(dom.overlayActionButton.classList.contains('hidden'));
        assert.equal(dom.overlayTitle.getAttribute('data-l10n-id'),
                                                   'upgrade-title');
        assert.equal(dom.overlayText.getAttribute('data-l10n-id'),
                                                  'upgrade-text');
        done();
      }, 1);
    });

    test('#Update dialog, empty list, \'empty\' overlay menu',
        function(done) {
      pendingPick = null;
      storageState = null;
      dom.overlayMenu.classList.add('hidden');
      dom.overlayActionButton.classList.add('hidden');
      dom.overlayTitle.setAttribute('data-l10n-id', '');
      dom.overlayText.setAttribute('data-l10n-id', '');
      firstScanEnded = true;
      metadataQueue = {'length': 0};

      updateDialog();

      // Allow lazy loader to load
      setTimeout(function() {
        testOverlayVisibility(true);
        assert.isFalse(dom.overlayMenu.classList.contains('hidden'));
        assert.isFalse(dom.overlayActionButton.classList.contains('hidden'));
        assert.equal(dom.overlayActionButton.getAttribute('data-l10n-id'),
                     'overlay-camera-button');
        assert.equal(dom.overlayTitle.getAttribute('data-l10n-id'),
                                                   'empty-title');
        assert.equal(dom.overlayText.getAttribute('data-l10n-id'),
                                                  'empty-text');
        done();
      }, 1);
    });

    test('#Update dialog, no card, \'no card\' title and text',
        function(done) {
      thumbnailList.removeItem(thumbnailItemName);
      storageState = MediaDB.NOCARD;
      dom.overlayMenu.classList.remove('hidden');
      dom.overlayActionButton.classList.remove('hidden');
      dom.overlayTitle.setAttribute('data-l10n-id', '');
      dom.overlayText.setAttribute('data-l10n-id', '');

      updateDialog();

      // Allow lazy loader to load
      setTimeout(function() {
        testOverlayVisibility(true);
        assert.isTrue(dom.overlayMenu.classList.contains('hidden'));
        assert.isTrue(dom.overlayActionButton.classList.contains('hidden'));
        assert.equal(dom.overlayTitle.getAttribute('data-l10n-id'),
                                                   'nocard2-title');
        assert.equal(dom.overlayText.getAttribute('data-l10n-id'),
                                                  'nocard3-text');
        done();
      }, 1);
    });

    test('#Update dialog, media no mnt, \'no mount\' title/text',
        function(done) {
      thumbnailList.removeItem(thumbnailItemName);
      storageState = MediaDB.UNMOUNTED;
      dom.overlayMenu.classList.remove('hidden');
      dom.overlayActionButton.classList.remove('hidden');
      dom.overlayTitle.setAttribute('data-l10n-id', '');
      dom.overlayText.setAttribute('data-l10n-id', '');

      updateDialog();

      // Allow lazy loader to load
      setTimeout(function() {
        testOverlayVisibility(true);
        assert.isTrue(dom.overlayMenu.classList.contains('hidden'));
        assert.isTrue(dom.overlayActionButton.classList.contains('hidden'));
        assert.equal(dom.overlayTitle.getAttribute('data-l10n-id'),
                                                   'pluggedin-title');
        assert.equal(dom.overlayText.getAttribute('data-l10n-id'),
                                                  'pluggedin-text');
        done();
      }, 1);
    });
  });

  suite('#showPlayer flows', function() {

    var selectedVideo;
    var videoDuration;
    var selectedThumbnail;

    var playerPlaySpy;
    var playerPauseSpy;
    var fakeTimer;

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

      fakeTimer = sinon.useFakeTimers();

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

      isPhone = true; // setControlsVisibility

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
      dom.player.setDuration(0);
      dom.player.currentTime = -1;
      loadingChecker.resetLoadedMetadataCallback();
    });

    teardown(function() {
      playerPlaySpy.reset();
      playerPauseSpy.reset();
    });

    function testTimeSliderAccessibility() {
      assert.equal(dom.timeSlider.getAttribute('data-l10n-id'), 'seek-bar');
      assert.deepEqual(
        JSON.parse(dom.timeSlider.getAttribute('data-l10n-args')),
        { duration: '00:01' });
      assert.equal(dom.timeSlider.getAttribute('aria-valuemin'), '0');
      assert.equal(dom.timeSlider.getAttribute('aria-valuemax'),
        dom.player.duration);
      assert.equal(dom.timeSlider.getAttribute('aria-valuenow'),
        dom.player.currentTime);
      assert.equal(dom.timeSlider.getAttribute('aria-valuetext'), '00:00');
    }

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
      setButtonPaused(true);

      document.body.classList.add(LAYOUT_MODE.list); // Stage list layout
      // Stage controls being hidden
      dom.playerView.classList.add('video-controls-hidden');
      dom.videoContainer.setAttribute('data-l10n-id', 'show-controls-button');
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
      loadingChecker.invokeLoadedMetadataCallback();
      //
      // enterFullscreen is false -- did not enter fullscreen
      //
      assert.equal(containsClass(document.body,
                                 LAYOUT_MODE.list), true);
      assert.equal(containsClass(document.body,
                                 LAYOUT_MODE.fullscreenPlayer), false);
      assert.equal(dom.durationText.textContent, '00:01');
      assert.equal(dom.player.currentTime, currentVideo.metadata.currentTime);
      testTimeSliderAccessibility();
      //
      // video is not seeking -- 'doneSeeking' is called syncronously
      //   * autoPlay is false -- video is paused
      //   * keepControls is true -- controls not hidden
      //
      assert.isTrue(containsClass(dom.play, 'paused'));
      assert.equal(dom.play.getAttribute('data-l10n-id'), 'play-button');
      assert.isTrue(playerPauseSpy.calledOnce);
      assert.isFalse(containsClass(dom.playerView, 'video-controls-hidden'));
      assert.equal(dom.videoContainer.getAttribute('data-l10n-id'),
        'hide-controls-button');
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
      loadingChecker.invokeLoadedMetadataCallback();
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
      assert.equal(dom.play.getAttribute('data-l10n-id'), 'play-button');
      assert.isTrue(playerPauseSpy.calledOnce);
      assert.isFalse(containsClass(dom.playerView, 'video-controls-hidden'));
      assert.equal(dom.videoContainer.getAttribute('data-l10n-id'),
        'hide-controls-button');
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
      // Stage controls being hidden
      dom.playerView.classList.add('video-controls-hidden');
      dom.videoContainer.setAttribute('data-l10n-id', 'show-controls-button');

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

      loadingChecker.invokeLoadedMetadataCallback();

      assert.equal(dom.durationText.textContent, '00:01');
      assert.equal(dom.player.currentTime, 0);
      testTimeSliderAccessibility();
      assert.equal(containsClass(document.body,
                   LAYOUT_MODE.list), true);
      assert.equal(containsClass(document.body,
                   LAYOUT_MODE.fullscreenPlayer), false);
      assert.isTrue(dom.play.classList.contains('paused'));
      assert.equal(dom.play.getAttribute('data-l10n-id'), 'play-button');
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
      dom.playerView.classList.add('video-controls-hidden');
      dom.videoContainer.setAttribute('data-l10n-id', 'show-controls-button');

      showPlayer(selectedVideo,
                 true, /* autoPlay */
                 false, /* enterFullscreen */
                 true /* keepControls */);

      loadingChecker.invokeLoadedMetadataCallback();

      assert.isTrue(containsClass(document.body, LAYOUT_MODE.list));
      assert.isFalse(containsClass(dom.play, 'paused'));
      assert.equal(dom.play.getAttribute('data-l10n-id'), 'pause-button');
      assert.isTrue(playerPlaySpy.calledOnce);
      assert.isFalse(containsClass(dom.playerView, 'video-controls-hidden'));
      assert.equal(dom.videoContainer.getAttribute('data-l10n-id'),
        'hide-controls-button');
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

      dom.playerView.classList.add('video-controls-hidden');
      dom.videoContainer.setAttribute('data-l10n-id', 'show-controls-button');

      showPlayer(selectedVideo,
                 true, /* autoPlay */
                 true, /* enterFullscreen */
                 true /* keepControls */);

      loadingChecker.invokeLoadedMetadataCallback();

      assert.equal(containsClass(document.body,
                   LAYOUT_MODE.list), false);
      assert.equal(containsClass(document.body,
                   LAYOUT_MODE.fullscreenPlayer), true);
      assert.isFalse(containsClass(dom.play, 'paused'));
      assert.equal(dom.play.getAttribute('data-l10n-id'), 'pause-button');
      assert.isTrue(playerPlaySpy.calledOnce);
      assert.equal(playerPauseSpy.callCount, 0);
      assert.isFalse(containsClass(dom.playerView, 'video-controls-hidden'));
      assert.equal(dom.videoContainer.getAttribute('data-l10n-id'),
        'hide-controls-button');
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
    test(getTitle(true, true, false), function() {

      currentVideo = null;
      dom.player.setSeeking(false);

      //
      // Not fullscreen, prepare to change layout made to fullscreen
      //
      currentLayoutMode = LAYOUT_MODE.list;
      document.body.classList.add(LAYOUT_MODE.list);

      dom.playerView.classList.remove('video-controls-hidden');
      dom.videoContainer.setAttribute('data-l10n-id', 'hide-controls-button');

      showPlayer(selectedVideo,
                 true, /* autoPlay */
                 true, /* enterFullscreen */
                 false /* keepControls */);

      loadingChecker.invokeLoadedMetadataCallback();

      assert.equal(containsClass(document.body,
                   LAYOUT_MODE.list), false);
      assert.equal(containsClass(document.body,
                   LAYOUT_MODE.fullscreenPlayer), true);
      assert.isFalse(containsClass(dom.play, 'paused'));
      assert.equal(dom.play.getAttribute('data-l10n-id'), 'pause-button');
      assert.isTrue(playerPlaySpy.calledOnce);
      assert.equal(playerPauseSpy.callCount, 0);

      fakeTimer.tick(300);

      assert.isTrue(containsClass(dom.playerView, 'video-controls-hidden'));
      assert.equal(dom.videoContainer.getAttribute('data-l10n-id'),
        'show-controls-button');
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

      loadingChecker.invokeLoadedMetadataCallback();

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

      loadingChecker.invokeLoadedMetadataCallback();

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

      loadingChecker.invokeLoadedMetadataCallback();

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

      loadingChecker.invokeLoadedMetadataCallback();

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

      loadingChecker.invokeLoadedMetadataCallback();

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

      videodb = new MockMediaDB();
      updateMetadataDbSpy = sinon.spy(videodb, 'updateMetadata');

      currentVideo = {
        'name': videoName
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
      setButtonPaused(true);

      // In the 'playerShowing' flow, dom.player has 'src' attribute,
      // which gets removed during the flow
      dom.player.src = 'about:blank';

      hidePlayer(false);

      assert.isFalse(containsClass(dom.play, 'paused'));
      assert.equal(dom.play.getAttribute('data-l10n-id'), 'pause-button');
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
      setButtonPaused(true);
      dom.player.src = 'about:blank';

      //
      // Initialize dom.player.currentTime in order to test
      // that currentVideo.metadata.currentTime is set to
      // dom.player.currentTime
      //
      dom.player.currentTime = 1;

      currentVideo = {
        'name': videoName,
        'metadata': {
          'title': 'video title',
          'watched': true
        }
      };

      hidePlayer(true);

      assert.isFalse(containsClass(dom.play, 'paused'));
      assert.equal(dom.play.getAttribute('data-l10n-id'), 'pause-button');
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

      setButtonPaused(true);
      dom.player.src = 'about:blank';

      //
      // Initialize dom.player.currentTime in order to test
      // that currentVideo.metadata.currentTime is set to
      // dom.player.currentTime
      //
      dom.player.currentTime = 1;

      currentVideo = {
        'name': videoName,
        'metadata': {
          'title': 'video title',
          'watched': false
        }
      };

      hidePlayer(true);

      assert.isFalse(containsClass(dom.play, 'paused'));
      assert.equal(dom.play.getAttribute('data-l10n-id'), 'pause-button');
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

      setButtonPaused(true);
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
        'name': videoName,
        'metadata': {
          'title': 'video title',
          'watched': false,
          'currentTime': currentTime
        }
      };

      hidePlayer(true);

      assert.isFalse(containsClass(dom.play, 'paused'));
      assert.equal(dom.play.getAttribute('data-l10n-id'), 'pause-button');
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

      setButtonPaused(true);
      dom.player.src = 'about:blank';

      // dom.player.currentTime is not set for this test because
      // the current video for this test has no metadata therefore
      // there is no assertion regarding the value of
      // currentVideo.metadata.currentTime

      currentVideo = {
        'name': videoName
      };

      hidePlayer(true);

      assert.isFalse(containsClass(dom.play, 'paused'));
      assert.equal(dom.play.getAttribute('data-l10n-id'), 'pause-button');
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

      setButtonPaused(true);
      dom.player.src = 'about:blank';

      //
      // Initialize dom.player.currentTime in order to test
      // that currentVideo.metadata.currentTime is set to
      // dom.player.currentTime
      //
      dom.player.currentTime = 1;

      currentVideo = {
        'name': videoName,
        'metadata': {
          'title': 'video title',
          'watched': false
        }
      };

      hidePlayer(true, function() {
        assert.isFalse(containsClass(dom.play, 'paused'));
        assert.equal(dom.play.getAttribute('data-l10n-id'), 'pause-button');
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
      setButtonPaused(true);

      // In the 'playerShowing' flow, dom.player has 'src' attribute,
      // which gets removed during the flow
      dom.player.src = 'about:blank';

      // dom.player.currentTime is not set for this test because
      // 'updateVideoMetadata' is false and the current video for
      // this test has no metadata. Therefore, there is no assertion
      // regarding the value of currentVideo.metadata.currentTime

      hidePlayer(false, function() {
        assert.isFalse(containsClass(dom.play, 'paused'));
        assert.equal(dom.play.getAttribute('data-l10n-id'), 'pause-button');
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
      setButtonPaused(true);
      dom.player.src = 'about:blank';

      // dom.player.currentTime is not set for this test because
      // 'updateVideoMetadata' is false and the current video for
      // this test has no metadata. Therefore, there is no assertion
      // regarding the value of currentVideo.metadata.currentTime

      playerShowing = false;

      hidePlayer(false, function() {
        assert.isTrue(containsClass(dom.play, 'paused'));
        assert.equal(dom.play.getAttribute('data-l10n-id'), 'play-button');
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
      setButtonPaused(true);
      dom.player.src = 'about:blank';

      // dom.player.currentTime is not set for this test because
      // 'updateVideoMetadata' is false and the current video for
      // this test has no metadata. Therefore, there is no assertion
      // regarding the value of currentVideo.metadata.currentTime

      playerShowing = false;

      hidePlayer(false);

      assert.isTrue(containsClass(dom.play, 'paused'));
      assert.equal(dom.play.getAttribute('data-l10n-id'), 'play-button');
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
      setButtonPaused(true);
      dom.player.src = 'about:blank';

      // dom.player.currentTime is not set for this test because
      // 'playerShowing' is false and the current video for
      // this test has no metadata. Therefore, there is no assertion
      // regarding the value of currentVideo.metadata.currentTime

      playerShowing = false;

      hidePlayer(true, function() {
        assert.isTrue(containsClass(dom.play, 'paused'));
        assert.equal(dom.play.getAttribute('data-l10n-id'), 'play-button');
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
      setButtonPaused(true);
      dom.player.src = 'about:blank';

      // dom.player.currentTime is not set for this test because
      // 'playerShowing' is false and the current video for
      // this test has no metadata. Therefore, there is no assertion
      // regarding the value of currentVideo.metadata.currentTime

      playerShowing = false;

      hidePlayer(true);

      assert.isTrue(containsClass(dom.play, 'paused'));
      assert.equal(dom.play.getAttribute('data-l10n-id'), 'play-button');
      assert.isFalse(playerPauseSpy.calledOnce);
      assert.isTrue(dom.player.hasAttribute('src'));
      assert.isFalse(playerShowing);
      assert.isFalse(startParsingMetadataSpy.calledOnce);
      assert.isFalse(updatePosterSpy.calledOnce);
      assert.isFalse(setWatchedSpy.calledOnce);
      assert.isFalse(updateMetadataDbSpy.calledOnce);
    });
  });

  suite('handleScreenLayoutChange flows', function() {

    var updateAllThumbnailTitlesSpy;
    var rescaleSpy;
    var HAVE_METADATA = 1;

    suiteSetup(function(done) {
      dom.player = new MockVideoPlayer();
      ThumbnailItem = MockThumbnailItem;

      MockThumbnailGroup.reset();
      var dummyContainer = document.createElement('div');

      thumbnailList = new ThumbnailList(MockThumbnailGroup, dummyContainer);
      thumbnailList.addItem({'name': videoName});

      updateAllThumbnailTitlesSpy = sinon.spy(thumbnailList,
                                             'updateAllThumbnailTitles');
      rescaleSpy = sinon.spy(VideoUtils, 'fitContainer');

      getAsset('/test/unit/media/test.webm', function(blob) {
        videodb = new MockMediaDB(blob);
        done();
      });
    });

    teardown(function() {
      updateAllThumbnailTitlesSpy.reset();
      rescaleSpy.reset();
    });

    test('#handleScreenLayoutChange: tablet, landscape, everything is waiting',
        function() {

      // In tablet, the landscape mode will show player and list at the same
      // time. To keep only one hardware codec be used, we shows loading icon
      // at the player view before first batch of files scanned and all their
      // metadata are parsed.

      ScreenLayout.setCurrentLayout('landscape');
      isPhone = false;
      firstScanEnded = false;
      dom.spinnerOverlay.classList.add('hidden'); // stage spinner being hidden

      handleScreenLayoutChange();

      assert.isFalse(containsClass(dom.spinnerOverlay, 'hidden'));
      assert.isTrue(containsClass(dom.playerView, 'disabled'));
      assert.equal(dom.playerView.getAttribute('aria-disabled'), 'true',
        'aria-disabled attribute should be set to true');
      assert.equal(ThumbnailItem.titleMaxLines, 2);
    });

    test('#handleScreenLayoutChange: tablet, landscape, scan has ended',
        function() {
      ScreenLayout.setCurrentLayout('landscape');
      isPhone = false;
      firstScanEnded = true;
      processingQueue = false;
      dom.spinnerOverlay.classList.remove('hidden'); // stage spinner shown
      dom.playerView.classList.add('disabled'); // stage player view

      handleScreenLayoutChange();

      assert.isTrue(containsClass(dom.spinnerOverlay, 'hidden'));
      assert.isFalse(containsClass(dom.playerView, 'disabled'));
      assert.equal(dom.playerView.getAttribute('aria-disabled'), 'false',
        'aria-disabled attribute should be set to false');
      assert.equal(ThumbnailItem.titleMaxLines, 2);
    });

    test('#handleScreenLayoutChange: tablet rotating to portrait, list view',
        function() {

      isPhone = false;
      currentLayoutMode = LAYOUT_MODE.list;
      ScreenLayout.setCurrentLayout('portrait');
      playerShowing = true;
      //
      // currentVideo without metadata will cause hidePlayer to execute
      // faster (won't try to update metadata).
      //
      currentVideo = {
        'name': videoName
      };

      handleScreenLayoutChange();

      assert.isFalse(playerShowing);
      assert.equal(ThumbnailItem.titleMaxLines, 4);
    });

    test('#handleScreenLayoutChange: tablet rotating to landscape, list view',
        function() {

      isPhone = false;
      currentLayoutMode = LAYOUT_MODE.list;
      ScreenLayout.setCurrentLayout('landscape');
      playerShowing = false;

      //
      // handleScreenLayoutChange invokes showPlayer with 'currentVideo',
      //
      currentVideo = {
        'name': videoName
      };

      dom.player.onloadedmetadata = null;

      handleScreenLayoutChange();
      //
      // showPlayer calls setVideoUrl which sets 'src' of
      // video element. Except that we're using a mock video
      // object so onloadedmetadata is not going to be called
      // automatically -- invoke it manually
      //
      loadingChecker.invokeLoadedMetadataCallback();

      assert.isTrue(playerShowing);
      assert.equal(ThumbnailItem.titleMaxLines, 2);
    });

    test('#handleScreenLayoutChange: update thumbnail title text immediately',
        function() {

      isPhone = true;
      currentLayoutMode = LAYOUT_MODE.list;

      handleScreenLayoutChange();

      assert.isTrue(updateAllThumbnailTitlesSpy.calledOnce);
    });

    test('#handleScreenLayoutChange: update thumbnail title text later',
        function() {

      isPhone = true;
      currentLayoutMode = LAYOUT_MODE.fullscreenPlayer;
      pendingUpdateTitleText = false;

      handleScreenLayoutChange();

      assert.equal(updateAllThumbnailTitlesSpy.callCount, 0);
      assert.isTrue(pendingUpdateTitleText);
    });

    test('#handleScreenLayoutChange: update thumbnail title text -- abort',
        function() {

      isPhone = true;
      currentLayoutMode = LAYOUT_MODE.list;
      pendingUpdateTitleText = false;
      thumbnailList = null;

      handleScreenLayoutChange();

      // Shouldn't have invoked updateAllThumbnailTitles nor
      // should have set pendingUpdateTitleText
      assert.equal(updateAllThumbnailTitlesSpy.callCount, 0);
      assert.isFalse(pendingUpdateTitleText);
    });

    test('#handleScreenLayoutChange: phone, rescale',
        function() {

      currentVideo = {
        'name': videoName,
        'metadata': {
          'rotation': '90'
        }
      };
      isPhone = true;
      currentLayoutMode = LAYOUT_MODE.fullscreenPlayer;
      ScreenLayout.setCurrentLayout('portrait');
      dom.player.readyState = HAVE_METADATA;

      handleScreenLayoutChange();

      assert.isTrue(rescaleSpy.calledOnce);
    });

    test('#handleScreenLayoutChange: phone, no rescale',
        function() {

      currentVideo = {
        'name': videoName,
        'metadata': {
          'rotation': '90'
        }
      };
      isPhone = true;
      currentLayoutMode = LAYOUT_MODE.fullscreenPlayer;
      ScreenLayout.setCurrentLayout('portrait');
      dom.player.readyState = HAVE_NOTHING;

      handleScreenLayoutChange();

      assert.equal(rescaleSpy.callCount, 0);
    });
  });

  suite('handleSliderKeypress', function() {
    var keyEvent;

    setup(function() {
      dom.player.currentTime = 0;
      dom.player.duration = 10;
      dom.player.currentTime = 5;
      keyEvent = document.createEvent('KeyboardEvent');
    });

    test('test seek up and seek down based on key up and key down', function() {
      [{ key: 38 /* DOM_VK_UP */, step: 2 },
       { key: 40 /* DOM_VK_UP */, step: -2 }].forEach(function(testSpec) {
        var currentTime = dom.player.currentTime;
        keyEvent.initKeyEvent('keypress', true, true, window, false, false,
          false, false, testSpec.key, 0);
        handleSliderKeypress(keyEvent);
        assert.equal(dom.player.currentTime, currentTime + testSpec.step);
      });
    });
  });

  suite('setControlsVisibility flows', function() {
    var updateVideoControlSliderSpy;
    var nativeUpdateVideoControlSlider;

    suiteSetup(function() {
      nativeUpdateVideoControlSlider = updateVideoControlSlider;
      updateVideoControlSliderSpy = sinon.spy();
      updateVideoControlSlider = updateVideoControlSliderSpy;
    });

    suiteTeardown(function() {
      updateVideoControlSlider = nativeUpdateVideoControlSlider;
    });

    teardown(function() {
      updateVideoControlSliderSpy.reset();
    });

    /**
     * On tablet in landscape mode, we always shows the video controls in list
     * layout. Therefore, in this use case setControlsVisibility will update
     * video controls slider.
     */
    test('#setControlsVisibility: tablet in landscape mode, list view',
        function() {
      isPhone = false;
      isPortrait = false;
      currentLayoutMode = LAYOUT_MODE.list;
      setControlsVisibility(false);
      assert.isTrue(updateVideoControlSliderSpy.calledOnce);
    });

    /**
     * On tablet in portrait mode, regardless of the view,
     * setControlsVisibility will show video controls based on the 'visible'
     * argument. And therefore, setControlsVisibility will update the video
     * controls slider based on the value of the 'visible' argument.
     */
    test('#setControlsVisibility: tablet in portrait mode, show controls',
        function() {
      isPhone = false;
      isPortrait = true;
      currentLayoutMode = LAYOUT_MODE.list;
      setControlsVisibility(true);
      assert.isTrue(updateVideoControlSliderSpy.calledOnce);
    });

    /**
     * On tablet in portrait mode, regardless of the view,
     * setControlsVisibility will show video controls based on the 'visible'
     * argument. And therefore, setControlsVisibility will update the video
     * controls slider based on the value of the 'visible' argument.
     */
    test('#setControlsVisibility: tablet in portrait mode, dont show controls',
        function() {
      isPhone = false;
      isPortrait = true;
      currentLayoutMode = LAYOUT_MODE.list;
      setControlsVisibility(false);
      assert.equal(updateVideoControlSliderSpy.callCount, 0);
    });

    /**
     * On phone, regardless of the view, setControlsVisibility will show
     * video controls based on the 'visible' argument. And therefore,
     * setControlsVisibility will update the video controls slider based on
     * the value of the 'visible' argument.
     */
    test('#setControlsVisibility: phone, landscape, list view, show controls',
        function() {
      isPhone = true;
      isPortrait = false;
      currentLayoutMode = LAYOUT_MODE.list;
      setControlsVisibility(true);
      assert.isTrue(updateVideoControlSliderSpy.calledOnce);
    });

    test('#setControlsVisibility: phone, portrait, list view, show controls',
        function() {
      isPhone = true;
      isPortrait = true;
      currentLayoutMode = LAYOUT_MODE.list;
      setControlsVisibility(true);
      assert.isTrue(updateVideoControlSliderSpy.calledOnce);
    });

    test('#setControlsVisibility: phone, portrait, fullscreen, show controls',
        function() {
      isPhone = true;
      isPortrait = false;
      currentLayoutMode = LAYOUT_MODE.fullscreen;
      setControlsVisibility(true);
      assert.isTrue(updateVideoControlSliderSpy.calledOnce);
    });

    test('#setControlsVisibility: phone, landscape, list, no show controls',
        function() {
      isPhone = true;
      isPortrait = false;
      currentLayoutMode = LAYOUT_MODE.list;
      setControlsVisibility(false);
      assert.equal(updateVideoControlSliderSpy.callCount, 0);
    });
  });

  suite('toggleVideoControls flows', function() {
    var clearTimeoutSpy;
    var setControlsVisibilitySpy;
    var nativeSetControlsVisibility;
    var event = {};

    suiteSetup(function() {
      clearTimeoutSpy = sinon.spy(window, 'clearTimeout');
      clearTimeout = clearTimeoutSpy;
      nativeSetControlsVisibility = setControlsVisibility;
      setControlsVisibilitySpy = sinon.spy();
      setControlsVisibility = setControlsVisibilitySpy;
    });

    suiteTeardown(function() {
      clearTimeoutSpy.restore();
    });

    teardown(function() {
      clearTimeoutSpy.reset();
      setControlsVisibilitySpy.reset();
    });

    test('#toggleVideoControls: control fade timeout', function() {
      controlFadeTimeout = 1;
      toggleVideoControls(event);
      assert.isTrue(clearTimeoutSpy.calledOnce);
      assert.equal(controlFadeTimeout, null);
    });

    test('#toggleVideoControls: no control fade timeout', function() {
      controlFadeTimeout = null;
      toggleVideoControls(event);
      assert.equal(clearTimeoutSpy.callCount, 0);
      assert.equal(controlFadeTimeout, null);
    });

    test('#toggleVideoControls: toggle control showing', function() {
      pendingPick = false;
      controlShowing = false;
      toggleVideoControls(event);
      assert.isTrue(setControlsVisibilitySpy.calledOnce);
      assert.isTrue(setControlsVisibilitySpy.calledWith(true));
      assert.isTrue(event.cancelBubble);
    });

    test('#toggleVideoControls: toggle control not showing',
      function() {
      pendingPick = false;
      controlShowing = true;
      toggleVideoControls(event);
      assert.isTrue(setControlsVisibilitySpy.calledOnce);
      assert.isTrue(setControlsVisibilitySpy.calledWith(false));
      assert.isFalse(event.cancelBubble);
    });

    test('#toggleVideoControls: pending pick, no toggle',
      function() {
      pendingPick = true;
      toggleVideoControls(event);
      assert.equal(setControlsVisibilitySpy.callCount, 0);
    });
  });

  /*
   * updateSelection is called when entering thumbnail selection mode, or
   * when the selection changes. The function updates the message the top
   * of the screen and enables or disables the Delete and Share buttons.
   */
  suite('updateSelection flows', function() {
    var videodata = {};
    var videoBlob;

    suiteSetup(function(done) {
      videodata = {'name': videoName};

      MockThumbnailGroup.reset();
      var dummyContainer = document.createElement('div');

      thumbnailList = new ThumbnailList(MockThumbnailGroup, dummyContainer);
      thumbnailList.addItem({'name': videodata.name});

      getAsset('/test/unit/media/test.webm', function(blob) {
        videoBlob = blob;
        videodb = new MockMediaDB(videoBlob);
        done();
      });
    });

    setup(function() {
      selectedFileNames = [];
      selectedFileNamesToBlobs = {};
    });

    test('#updateSelection: toggle thumbnail as selected and add to selected ' +
      'filenames', function() {
        var thumbnail = thumbnailList.thumbnailMap[videodata.name];
        thumbnail.htmlNode.classList.remove('selected'); // not selected
        thumbnail.htmlNode.setAttribute('aria-selected', false);
        updateSelection(videodata);
        assert.isTrue(thumbnail.htmlNode.classList.contains('selected'),
                      'thumbnail should contain \'selected\' class');
        assert.equal(thumbnail.htmlNode.getAttribute('aria-selected'), 'true',
                     'thumbnail aria-selected attribute should be set to true');
        assert.equal(selectedFileNames.length, 1,
                     'should be one selected file');
        assert.equal(selectedFileNames[0], videodata.name,
                     'name of selected file should be name of videodata');
        assert.equal(selectedFileNamesToBlobs[videodata.name], videoBlob,
          'blob associated with videodata name should be video blob');
    });

    test('#updateSelection: toggle thumbnail as not selected and remove ' +
      'selected filenames', function() {
        var thumbnail = thumbnailList.thumbnailMap[videodata.name];
        thumbnail.htmlNode.classList.add('selected'); // selected
        thumbnail.htmlNode.setAttribute('aria-selected', true);
        updateSelection(videodata);
        assert.isFalse(thumbnail.htmlNode.classList.contains('selected'),
                       'thumbnail should not contain \'selected\' class');
        assert.equal(thumbnail.htmlNode.getAttribute('aria-selected'), 'false',
          'thumbnail aria-selected attribute should be set to false');
        assert.equal(selectedFileNames.length, 0,
                     'shouldnt be any selected files');
        assert.equal(selectedFileNamesToBlobs[videodata.name], undefined,
                     'no blob associated with videodata name');
    });

    test('#updateSelection: update UI, thumbnail is selected', function() {
      dom.thumbnailsDeleteButton.classList.add('disabled');
      dom.thumbnailsShareButton.classList.add('disabled');
      dom.thumbnailsDeleteButton.setAttribute('aria-disabled', true);
      dom.thumbnailsShareButton.setAttribute('aria-disabled', true);
      var thumbnail = thumbnailList.thumbnailMap[videodata.name];
      thumbnail.htmlNode.classList.remove('selected'); // not selected
      thumbnail.htmlNode.setAttribute('aria-selected', false);

      updateSelection(videodata);
      assert.equal(dom.thumbnailsNumberSelected.textContent,
                   'number-selected2{"n":1}',
                   'there should be one thumbnail selected');
      assert.isFalse(containsClass(dom.thumbnailsDeleteButton, 'disabled'),
                     'thumbnail delete button should be enabled');
      assert.isFalse(containsClass(dom.thumbnailsShareButton, 'disabled'),
                     'thumbnail share button should be enabled');
      assert.equal(dom.thumbnailsDeleteButton.getAttribute('aria-disabled'),
        'false', 'aria-disabled attribute should be set to false');
      assert.equal(dom.thumbnailsShareButton.getAttribute('aria-disabled'),
        'false', 'aria-disabled attribute should be set to false');
    });

    test('#updateSelection: update UI, no thumbnail is selected', function() {
      var thumbnail = thumbnailList.thumbnailMap[videodata.name];
      thumbnail.htmlNode.classList.add('selected'); // selected
      thumbnail.htmlNode.setAttribute('aria-selected', true);

      updateSelection(videodata);
      assert.equal(dom.thumbnailsNumberSelected.textContent,
                   'number-selected2{"n":0}',
                   'there shouldnt be any thumbnails selected');
      assert.isTrue(containsClass(dom.thumbnailsDeleteButton, 'disabled'),
                    'thumbnail delete button should be disabled');
      assert.isTrue(containsClass(dom.thumbnailsShareButton, 'disabled'),
                    'thumbnail share button should be disabled');
      assert.equal(dom.thumbnailsDeleteButton.getAttribute('aria-disabled'),
        'true', 'aria-disabled attribute should be set to true');
      assert.equal(dom.thumbnailsShareButton.getAttribute('aria-disabled'),
        'true', 'aria-disabled attribute should be set to true');
    });
  });

  suite('handleSliderTouchStart flows', function() {
    var handleSliderTouchMoveSpy;
    var nativeHandleSliderTouchMove;
    var existingTouchStartEventId = 1;
    var touchStartIdFromEvent = 10;
    var event = { 'changedTouches': [{'identifier': touchStartIdFromEvent}] };
    var playerPauseSpy;
    var width, height;

    suiteSetup(function() {
      nativeHandleSliderTouchMove = handleSliderTouchMove;
      handleSliderTouchMoveSpy = sinon.spy();
      handleSliderTouchMove = handleSliderTouchMoveSpy;
      playerPauseSpy = sinon.spy(dom.player, 'pause');
      width = 50;
      height = 100;
    });

    setup(function() {
      dragging = false;
      touchStartID = null;
      handleSliderTouchMoveSpy.reset();
      playerPauseSpy.reset();
      dom.sliderWrapper.style.width = width + 'px';
      dom.sliderWrapper.style.height = height + 'px';
    });

    teardown(function() {
      dom.sliderWrapper.style.width = 0 + 'px';
      dom.sliderWrapper.style.height = 0 + 'px';
    });

    suiteTeardown(function() {
      handleSliderTouchMove = nativeHandleSliderTouchMove;
      playerPauseSpy.restore();
    });

    test('#handleSliderTouchStart: already have touch start event',
         function() {
      // stage data to indicate there has already been a touch start event
      touchStartID = existingTouchStartEventId;

      handleSliderTouchStart();

      assert.equal(touchStartID, existingTouchStartEventId);
      assert.equal(handleSliderTouchMoveSpy.callCount, 0);
      assert.isFalse(dragging);
      assert.equal(sliderRect, undefined);
    });

    test('#handleSliderTouchStart: dont know video duration',
         function() {
      dom.player.duration = Infinity;

      handleSliderTouchStart(event);

      assert.isTrue(dragging);
      assert.equal(touchStartID, touchStartIdFromEvent,
                   'touch start id should come from event');
      assert.equal(handleSliderTouchMoveSpy.callCount, 0,
                   'function returns before calling handleSliderTouchMove');
      assert.equal(sliderRect.width, width);
      assert.equal(sliderRect.height, height);
      assert.equal(sliderRect.right, sliderRect.left + width);
      assert.equal(sliderRect.bottom, sliderRect.top + height);
    });

    test('#handleSliderTouchStart: paused while dragging',
         function() {
      dom.player.duration = 100;
      dom.player.paused = true;

      handleSliderTouchStart(event);

      assert.isTrue(dragging);
      assert.equal(touchStartID, touchStartIdFromEvent,
                   'touch start id should come from event');
      assert.isTrue(handleSliderTouchMoveSpy.calledOnce,
                   'handleSliderTouchMove is called once');
      assert.equal(playerPauseSpy.callCount, 0,
                   'dom.player.pause is not called');
      assert.equal(sliderRect.width, width);
      assert.equal(sliderRect.height, height);
      assert.equal(sliderRect.right, sliderRect.left + width);
      assert.equal(sliderRect.bottom, sliderRect.top + height);
    });

    test('#handleSliderTouchStart: not paused while dragging',
         function() {
      dom.player.duration = 100;
      dom.player.paused = false;

      handleSliderTouchStart(event);

      assert.isTrue(dragging);
      assert.equal(touchStartID, touchStartIdFromEvent,
                   'touch start id should come from event');
      assert.isTrue(handleSliderTouchMoveSpy.calledOnce,
                   'handleSliderTouchMove is called once');
      assert.isTrue(playerPauseSpy.calledOnce,
                   'dom.player.pause is called');
      assert.equal(sliderRect.width, width);
      assert.equal(sliderRect.height, height);
      assert.equal(sliderRect.right, sliderRect.left + width);
      assert.equal(sliderRect.bottom, sliderRect.top + height);
    });
  });

  suite('handleSliderTouchMove flows', function() {
    var fastSeekSpy;

    var clientX = 110;
    var touch = {'clientX': clientX};
    var identifiedTouchSuccess = function(touchStartID) {
      return touch;
    };

    var identifiedTouchFailure = function(touchStartID) {
      return null;
    };

    var successEvent = { 'changedTouches':
                         {'identifiedTouch': identifiedTouchSuccess} };
    var failureEvent = { 'changedTouches':
                         {'identifiedTouch': identifiedTouchFailure} };

    suiteSetup(function() {
      fastSeekSpy = sinon.spy(dom.player, 'fastSeek');
      sliderRect = {'left': 10,
                    'width': 200};
    });

    setup(function() {
      fastSeekSpy.reset();
      dragging = true;
      dom.playHead.classList.remove('active');
    });

    suiteTeardown(function() {
      fastSeekSpy.restore();
    });

    test('#handleSliderTouchMove: update the slider', function() {

      handleSliderTouchMove(successEvent);

      assert.isTrue(containsClass(dom.playHead, 'active'));
      assert.equal(dom.playHead.style.left, '50%');
      assert.equal(dom.elapsedTime.style.width, '50%');
      assert.isTrue(fastSeekSpy.calledOnce);
    });

    test('#handleSliderTouchMove: not dragging', function() {
      dragging = false;

      handleSliderTouchMove(successEvent);

      assert.isFalse(containsClass(dom.playHead, 'active'));
      assert.equal(fastSeekSpy.callCount, 0);
    });

    test('#handleSliderTouchMove: no touch start event', function() {
      dragging = false;

      handleSliderTouchMove(failureEvent);

      assert.isFalse(containsClass(dom.playHead, 'active'));
      assert.equal(fastSeekSpy.callCount, 0);
    });
  });

  suite('handleSliderTouchEnd flows', function() {
    var playerPlaySpy;
    var playerPauseSpy;
    var existingTouchEventId = 1;

    var identifiedTouchSuccess = function(touchStartID) {
      return true;
    };

    var identifiedTouchFailure = function(touchStartID) {
      return false;
    };

    var touchEvent = { 'changedTouches':
                            {'identifiedTouch': identifiedTouchSuccess} };
    var unrelatedTouchEvent = { 'changedTouches':
                                {'identifiedTouch': identifiedTouchFailure} };

    suiteSetup(function() {
      playerPlaySpy = sinon.spy(dom.player, 'play');
      playerPauseSpy = sinon.spy(dom.player, 'pause');
    });

    setup(function() {
      playerPlaySpy.reset();
      playerPauseSpy.reset();
      dragging = true;
      dom.playHead.classList.add('active');
    });

    suiteTeardown(function() {
      playerPlaySpy.restore();
      playerPauseSpy.restore();
    });

    test('#handleSliderTouchEnd: no touch start event', function() {

      touchStartID = existingTouchEventId;

      handleSliderTouchEnd(unrelatedTouchEvent);

      assert.equal(touchStartID, existingTouchEventId);
      assert.isTrue(containsClass(dom.playHead, 'active'));
    });

    test('#handleSliderTouchEnd: not dragging', function() {

      touchStartID = existingTouchEventId;
      dragging = false;

      handleSliderTouchEnd(touchEvent);

      assert.isNull(touchStartID);
      assert.isTrue(containsClass(dom.playHead, 'active'));
    });

    test('#handleSliderTouchEnd: video at end', function() {
      touchStartID = existingTouchEventId;
      dragging = true;
      dom.player.currentTime = dom.player.duration = 10;

      handleSliderTouchEnd(touchEvent);

      assert.isNull(touchStartID);
      assert.isFalse(containsClass(dom.playHead, 'active'));
      assert.isTrue(playerPauseSpy.calledOnce);
    });

    test('#handleSliderTouchEnd: video not at end', function() {
      touchStartID = existingTouchEventId;
      dragging = true;
      dom.player.currentTime = 5;
      dom.player.duration = 10;

      handleSliderTouchEnd(touchEvent);

      assert.isNull(touchStartID);
      assert.isFalse(containsClass(dom.playHead, 'active'));
      assert.equal(playerPauseSpy.callCount, 0);
      assert.isTrue(playerPlaySpy.calledOnce);
    });
  });
});
