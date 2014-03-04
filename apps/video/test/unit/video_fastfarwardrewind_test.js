/* globals dom, ForwardRewindController, currentVideo */

'use strict';

require('/shared/test/unit/load_body_html_helper.js');
requireApp('/video/js/forwardrewind_controller.js');
requireApp('/video/js/video.js');


suite('Video Fastfarwardrewind Unit Tests', function() {

  suiteSetup(function() {
    // Create DOM structure
    loadBodyHTML('/index.html');
    dom.player = document.getElementById('player');
    dom.seekForward = document.getElementById('seek-forward');
    dom.seekBackward = document.getElementById('seek-backward');
    ForwardRewindController.init(currentVideo, dom.seekForward,
                                 dom.seekBackward);
  });

  suite('#Video Play/Pause Test', function() {

    test('#Test Playing Video Fastfarward Tap Test', function() {
     ForwardRewindController.isPlaying = true;
     ForwardRewindController.startFastSeeking(1);
     assert.isTrue(currentVideo.currentTime == 12.0);
   });

    test('#Test Playing Video Rewind Tap Test', function() {
     ForwardRewindController.isPlaying = true;
     ForwardRewindController.startFastSeeking(-1);
     assert.isTrue(currentVideo.currentTime == 2.0);
   });

    test('#Test Paused Video Fastfarward Tap Test', function() {
     var currentTime = currentVideo.currentTime;
     ForwardRewindController.isPlaying = false;
     ForwardRewindController.startFastSeeking(1);
     assert.isTrue(currentVideo.currentTime == currentTime);
   });

    test('#Test Paused Video Rewind Tap Test', function() {
     var currentTime = currentVideo.currentTime;
     ForwardRewindController.isPlaying = false;
     ForwardRewindController.startFastSeeking(-1);
     assert.isTrue(currentVideo.currentTime == currentTime);
   });

   test('#Test Playing Video Fastfarward Hold Test', function() {
     var currentTime = currentVideo.currentTime;
     ForwardRewindController.isPlaying = true;
     ForwardRewindController.isContextMenu = true;
     ForwardRewindController.startFastSeeking(1);
     setTimeout(function() {
     ForwardRewindController.stopFastSeeking();
     alert(currentVideo.currentTime);
     assert.isTrue(currentVideo.currentTime == (currentTime + (2 * 10)));
     },2000);
   });

    test('#Test Playing Video Rewind Hold Test', function() {
     var currentTime = currentVideo.currentTime;
     ForwardRewindController.isPlaying = true;
     ForwardRewindController.isContextMenu = true;
     ForwardRewindController.startFastSeeking(-1);
     setTimeout(function() {
     ForwardRewindController.stopFastSeeking();
     assert.isTrue(currentVideo.currentTime == (currentTime - (2 * 10)));
     },2000);
   });

    test('#Test Paused Video Fastfarward Hold Test', function() {
     var currentTime = currentVideo.currentTime;
     ForwardRewindController.isPlaying = false;
     ForwardRewindController.isContextMenu = true;
     ForwardRewindController.startFastSeeking(1);
     assert.isTrue(currentVideo.currentTime == currentTime);
   });

    test('#Test Paused Video Rewind Hold Test', function() {
     var currentTime = currentVideo.currentTime;
     ForwardRewindController.isPlaying = false;
     ForwardRewindController.isContextMenu = true;
     ForwardRewindController.startFastSeeking(-1);
     assert.isTrue(currentVideo.currentTime == currentTime);
   });
 });

});
