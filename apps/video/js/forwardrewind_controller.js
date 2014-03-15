'use strict';

var ForwardRewindController = (function() {

  var isContextMenu = false;
  var intervalId = null;
  var forwardButton;
  var backwardButton;
  var player;


  function init(video, forward, backward) {
    forwardButton = forward;
    backwardButton = backward;
    player = video;

    forwardButton.addEventListener('click', handleForwardButtonClick);
    backwardButton.addEventListener('click', handleBackwardButtonClick);
    forwardButton.addEventListener('contextmenu', handlePlayerLongPress);
    backwardButton.addEventListener('contextmenu', handlePlayerLongPress);
    forwardButton.addEventListener('touchend', stopFastSeeking);
    backwardButton.addEventListener('touchend', stopFastSeeking);
  }

  function handleForwardButtonClick() {
    startFastSeeking(1);
  }

  function handleBackwardButtonClick() {
    startFastSeeking(-1);
  }

  function handlePlayerLongPress(event) {

    if (!ForwardRewindController.isPlaying) {
      return;
    }

    isContextMenu = true;

    if (event.target === forwardButton) {
      startFastSeeking(1);
    } else {
      startFastSeeking(-1);
    }
  }

  function startFastSeeking(direction) {
    // direction can be 1 or -1, 1 means forward and -1 means rewind.
    var offset = direction * 10;

    if (!ForwardRewindController.isPlaying) {
      return;
    }

    if (isContextMenu) {
      intervalId = window.setInterval(function() {
        seekVideo(player.currentTime + offset);
      },1000);
    } else {
      seekVideo(player.currentTime + offset);
    }
  }

  function stopFastSeeking() {
    if (intervalId) {
     window.clearInterval(intervalId);
     intervalId = null;
     isContextMenu = false;
    }
  }

  function seekVideo(seekTime) {
    if (seekTime >= player.duration) {
      if (isContextMenu) {
        isContextMenu = false;
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
   handlePlayerLongPress: handlePlayerLongPress,
   startFastSeeking: startFastSeeking,
   stopFastSeeking: stopFastSeeking,
   isPlaying: false
  };

}());
