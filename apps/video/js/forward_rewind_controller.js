/* exported ForwardRewindController */

/**
   * This file is used for forward and rewind funtionality of Gaia Video app.
   *
   * If the user taps the forward or rewind icons,
   * the video will jump forward or back by 10 seconds.
   *
   * When the user presses and holds on the forward or rewind icons,
   * the video time will move foward or back at 10 times the regular speed.
   */

'use strict';

var seekInterval;

var ForwardRewindController = (function() {

  var isLongPressing = false;
  var intervalId = null;
  var forwardButton;
  var backwardButton;
  var videoToolbar;
  var player;

  function init(video, forward, backward) {
    forwardButton = forward;
    backwardButton = backward;
    player = video;

    videoToolbar = forward.parentElement;
    videoToolbar.addEventListener('click', handleButtonClick);
    videoToolbar.addEventListener('contextmenu', handlePlayerLongPress);
    videoToolbar.addEventListener('touchend', stopFastSeeking);
  }

  function uninit(video, forward, backward) {
    videoToolbar.removeEventListener('click', handleButtonClick);
    videoToolbar.removeEventListener('contextmenu', handlePlayerLongPress);
    videoToolbar.removeEventListener('touchend', stopFastSeeking);

    forwardButton = null;
    backwardButton = null;
    player = null;
  }

  function handleButtonClick(event) {

    if (event.target === forwardButton) {
      startFastSeeking(1);
    } else if (event.target === backwardButton) {
      startFastSeeking(-1);
    } else {
      return;
    }
  }

  function handlePlayerLongPress(event) {

    if (event.target === forwardButton) {
      isLongPressing = true;
      startFastSeeking(1);
    } else if (event.target === backwardButton) {
      isLongPressing = true;
      startFastSeeking(-1);
    } else {
      return;
    }
  }

  function startFastSeeking(direction) {
    // direction can be 1 or -1, 1 means forward and -1 means rewind.
    var offset = direction * 10;

    if (isLongPressing) {
      // To hold the interval time, e.g., during unit testing
      var interval = (seekInterval !== undefined) ? seekInterval : 1000;

      intervalId = window.setInterval(function() {
        seekVideo(player.currentTime + offset);
      }, interval);
    } else {
      seekVideo(player.currentTime + offset);
    }
  }

  function stopFastSeeking() {
    if (intervalId) {
     window.clearInterval(intervalId);
     intervalId = null;
     isLongPressing = false;
    }
  }

  function seekVideo(seekTime) {
    if (seekTime >= player.duration) {
      if (isLongPressing) {
        stopFastSeeking();
      }
      var remaingDuration = player.duration - player.currentTime;
      player.currentTime = player.currentTime + remaingDuration;
    } else {
      player.currentTime = seekTime;
    }
  }

  return {
   init: init,
   uninit: uninit,
   handlePlayerLongPress: handlePlayerLongPress,
   startFastSeeking: startFastSeeking,
   stopFastSeeking: stopFastSeeking
  };

}());
