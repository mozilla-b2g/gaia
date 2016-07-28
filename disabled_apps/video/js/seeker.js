/* global performance */
(function(exports) {
  'use strict';

  function Seeker(player) {
    this.player = player;        // The <video> element we seek for
    this.seekStartedAt = null;   // When was the last call to fastSeek
    this.currentSeekTime = null; // What time are we currently seeking to
    this.nextSeekTime = null;    // Where to seek when done with this one
    this.player.addEventListener('seeked', this); // Find out when seeks end
  }

  // We may defer seek requests that are made less than this amount of
  // time (in milliseconds) from the currently pending seek request
  Seeker.SEEK_INTERVAL = 200;    // milliseconds

  // We may defer seek requests if the seek target is less than this
  // distance (in seconds)  away from the currently pending seek request
  Seeker.SEEK_DISTANCE = 10;     // seconds

  /*
   * Call this method to efficiently seek the video player to the
   * specified time.
   *
   * When the user is dragging the time slider we may request a seek
   * every 50ms or less. fastSeek() can take 100ms or more to
   * complete. And it only seeks to the nearest keyframe so is
   * probably only accurate to +/- 10 seconds, depending on the video.
   * We want to avoid sending lots of redundant seek requests to gecko
   * since this seems to cause performance problems. But at the same
   * time, we don't want to have to wait for gecko to complete a seek
   * to one position if the user now wants to seek to some position
   * far away.
   *
   * So, if we're already seeking, and if the last seek request was
   * not very long ago and if the target of that seek request was
   * close to the target of this seek, then we defer this seek request
   * until the current seek request finishes with a 'seeked' event.
   * Because it is common to seek to 0, we'll never defer that request.
   */
  Seeker.prototype.seekTo = function(time) {
    if (this.currentSeekTime === time) { // If we are already seeking to time
      return;                            // then we don't have to do anything.
    }

    var now = performance.now();
    if (this.currentSeekTime === null ||
        time === 0 ||
        Math.abs(this.currentSeekTime - time) > Seeker.SEEK_DISTANCE ||
        now - this.seekStartedAt > Seeker.SEEK_INTERVAL)
    {
      // In this case we want to actually request a new seek
      this.player.fastSeek(time);
      this.seekStartedAt = now;
      this.currentSeekTime = time;
      this.nextSeekTime = null;
    }
    else {
      // In this case we defer the seek until the current seek ends
      this.nextSeekTime = time;
    }
  };

  // This is invoked when we get a seeked event from the player
  Seeker.prototype.handleEvent = function() {
    this.currentSeekTime = null;
    this.seekStartedAt = null;
    if (this.nextSeekTime !== null) {
      this.seekTo(this.nextSeekTime);
    }
  };

  exports.Seeker = Seeker;
}(window));
