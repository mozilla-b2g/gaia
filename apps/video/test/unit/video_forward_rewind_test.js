/* globals MockVideoPlayer, ForwardRewindController:true */

'use strict';

requireApp('/video/test/unit/mock_video_player.js');
requireApp('/video/js/forward_rewind_controller.js');

var pause;

suite('Video forward rewind Unit Tests', function() {

  var seekForward;
  var seekBackward;
  var play;
  var videoToolBar;
  var player;
  var videoDuration = 50;
  var pauseSpy;
  var fakeTimer;

  suiteSetup(function() {
    videoToolBar = document.createElement('div');
    seekForward = document.createElement('button');
    seekBackward = document.createElement('button');
    play = document.createElement('button');
    videoToolBar.appendChild(seekBackward);
    videoToolBar.appendChild(play);
    videoToolBar.appendChild(seekForward);
    player = new MockVideoPlayer();
    player.setDuration(videoDuration);
    ForwardRewindController.init(player, seekForward,
                                 seekBackward);
    pauseSpy = sinon.spy();
    pause = pauseSpy;
    fakeTimer = sinon.useFakeTimers();
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

    setup(function() {
      pauseSpy.reset();
    });

    test('#Test Playing Video Forward Button Tap Test', function() {
      simulateClick(seekForward);
      assert.equal(player.currentTime, 10);
    });

    test('#Test Playing Video Rewind Button Tap Test', function() {
      simulateClick(seekBackward);
      assert.equal(player.currentTime, 0);
    });

    test('#Test Playing Video Play Button Tap Test', function() {
      simulateClick(play);
      simulateClick(seekForward);
      assert.equal(player.currentTime, 10);
      simulateClick(seekBackward);
      assert.equal(player.currentTime, 0);
    });

    test('#Test Playing Video Play Button Tap Test, wrap', function() {
      player.currentTime = videoDuration - 5;
      simulateClick(play);
      simulateClick(seekForward);
      assert.equal(player.currentTime, videoDuration);
      assert.isTrue(pauseSpy.calledOnce);
    });

    test('#Test Playing Video Rewind Button Tap Test, wrap', function() {
      player.currentTime = 5;
      simulateClick(play);
      simulateClick(seekBackward);
      assert.equal(player.currentTime, 0);
      assert.equal(pauseSpy.callCount, 0);
    });

    test('#Test Playing Video Forward Button Hold Test', function() {
      var currentTime = player.currentTime;
      simulateContextMenu(seekForward);

      fakeTimer.tick(1500);

      ForwardRewindController.stopFastSeeking();
      assert.equal(player.currentTime, currentTime + 10);
      assert.equal(pauseSpy.callCount, 0);
    });

    test('#Test Playing Video Forward Button Hold Test, wrap', function() {
      player.currentTime = videoDuration - 5;
      simulateContextMenu(seekForward);

      fakeTimer.tick(1500);

      ForwardRewindController.stopFastSeeking();
      assert.equal(player.currentTime, videoDuration);
      assert.isTrue(pauseSpy.calledOnce);
    });

    test('#Test Playing Video Rewind Button Hold Test', function() {
      player.currentTime = 20;
      simulateContextMenu(seekBackward);

      fakeTimer.tick(1500);

      ForwardRewindController.stopFastSeeking();
      assert.equal(player.currentTime, 10);
      assert.equal(pauseSpy.callCount, 0);
    });

    test('#Test Playing Video Rewind Button Hold Test, wrap', function() {
      player.currentTime = 5;
      simulateContextMenu(seekBackward);

      fakeTimer.tick(1500);

      ForwardRewindController.stopFastSeeking();
      assert.equal(player.currentTime, 0);
      assert.equal(pauseSpy.callCount, 0);
    });
  });
});
