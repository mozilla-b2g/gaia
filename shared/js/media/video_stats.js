'use strict';

//
// VideoStats records video playback statistics and
// dumps them to the native console
//
var VideoStats = (function() {
  var startQuality;

  var startTime;

  var endQuality;

  var endTime;

  var video;

  // Start recording stats
  function start(v) {
    video = v;
    if (!video.getVideoPlaybackQuality) {
      // This API is needed to record stats.
      // It is enabled in gecko by setting
      // the media.mediasource.enabled pref to true.
      return;
    }

    startQuality = video.getVideoPlaybackQuality();
    startTime = video.currentTime;
    endQuality = null;
    endTime = null;
  };

  // Stop recording stats
  function stop() {
    if (!video) {
      dump('Warning: no stats have been recorded. ' +
        'Make sure start() has been called');
      return;
    }

    if (!video.getVideoPlaybackQuality) {
      // This API is needed to record stats.
      // It is enabled in gecko by setting
      // the media.mediasource.enabled pref to true.
      return;
    }

    endQuality = video.getVideoPlaybackQuality();
    endTime = video.currentTime;
  };

  // Dump stats to the native console
  function print() {
    if (!video) {
      dump('Warning: no stats have been recorded. ' +
        'Make sure start() has been called');
      return;
    }

    if (!video.getVideoPlaybackQuality) {
      // This API is needed to record stats.
      // It is enabled in gecko by setting
      // the media.mediasource.enabled pref to true.
      return;
    }

    if (!startQuality || !endQuality) {
      dump('Warning: no stats have been recorded. ' +
        'Make sure start() and stop() have been called');
      return;
    }

    // Playback segment duration in seconds
    var segmentDuration =
      (endQuality.creationTime - startQuality.creationTime) / 1000;
    var startRendered =
      startQuality.totalVideoFrames - startQuality.droppedVideoFrames;
    var endRendered =
      endQuality.totalVideoFrames - endQuality.droppedVideoFrames;
    var segmentRendered = endRendered - startRendered;
    var fps = segmentRendered / segmentDuration;

    dump('Video statistics start');
    dump('Dimensions: ' + video.videoWidth + 'x' + video.videoHeight);
    dump('Complete duration: ' + MediaUtils.formatDuration(video.duration));
    dump('Start time: ' + MediaUtils.formatDuration(startTime));
    dump('End time: ' + MediaUtils.formatDuration(endTime));
    dump('Total frames: ' + endQuality.totalVideoFrames);
    dump('Decoded frames: ' +
      (endQuality.totalVideoFrames - endQuality.corruptedVideoFrames));
    dump('Corrupted frames: ' + endQuality.corruptedVideoFrames);
    dump('Rendered frames: ' +
      (endQuality.totalVideoFrames - endQuality.droppedVideoFrames));
    dump('Dropped frames: ' + endQuality.droppedVideoFrames);
    dump('Average rendered FPS: ' + fps.toFixed(2));
    dump('Video statistics end');
  };

  return {
    start: start,
    stop: stop,
    dump: print
  };
})();
