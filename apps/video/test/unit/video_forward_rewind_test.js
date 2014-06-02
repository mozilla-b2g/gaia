/* globals MockVideoPlayer, ForwardRewindController:true */

'use strict';

requireApp('/video/test/unit/mock_video_player.js');
requireApp('/video/js/forward_rewind_controller.js');

var seekInterval = 5; // Used in forward_rewind_controller.js

suite('Video forward rewind Unit Tests', function() {

  var seekForward;
  var seekBackward;
  var play;
  var videoToolBar;
  var player;

  suiteSetup(function() {
    videoToolBar = document.createElement('div');
    seekForward = document.createElement('button');
    seekBackward = document.createElement('button');
    play = document.createElement('button');
    videoToolBar.appendChild(seekBackward);
    videoToolBar.appendChild(play);
    videoToolBar.appendChild(seekForward);
    player = new MockVideoPlayer();
    player.setDuration(50);
    ForwardRewindController.init(player, seekForward,
                                 seekBackward);
  });

  suiteTeardown(function() {
    ForwardRewindController.uninit(player, seekForward,
                                 seekBackward);
  });

  suite('#Video Forward/Rewind Test', function() {

    var simulateClick = function(button) {
      var evt = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
      });
      button.dispatchEvent(evt);
    };

    var simulateContextMenu = function(button) {
      var ev = document.createEvent('MouseEvents');
        ev.initMouseEvent('contextmenu', true, false, window, 0, 0, 0, 0, 0,
                          false, false, false, false, 1, null);
      button.dispatchEvent(ev);
    };

    test('#Test Playing Video Forward Button Tap Test', function() {
      simulateClick(seekForward);
      assert.isTrue(player.currentTime === 10);
    });

    test('#Test Playing Video Rewind Button Tap Test', function() {
      simulateClick(seekBackward);
      assert.isTrue(player.currentTime === 0);
    });

    test('#Test Playing Video Play Button Tap Test', function() {
      simulateClick(play);
      simulateClick(seekForward);
      assert.isTrue(player.currentTime === 10);
      simulateClick(seekBackward);
      assert.isTrue(player.currentTime === 0);
    });

    test('#Test Playing Video Forward Button Hold Test', function(done) {
      var currentTime = player.currentTime;
      simulateContextMenu(seekForward);
      setTimeout(function() {
        ForwardRewindController.stopFastSeeking();
        assert.isTrue(player.currentTime == currentTime + 10);
        done();
      }, seekInterval);
    });

    test('#Test Playing Video Rewind Button Hold Test', function(done) {
      var currentTime = player.currentTime;
      simulateContextMenu(seekBackward);
      setTimeout(function() {
        ForwardRewindController.stopFastSeeking();
        assert.isTrue(player.currentTime == currentTime - 10);
        done();
      }, seekInterval);
    });
  });
});
