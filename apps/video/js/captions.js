(function(exports) {
  'use strict';

  function Captions(player) {
    this.player = player;
  }

  //
  // Remove all <track> elements from the <video> element
  //
  Captions.prototype.remove = function() {
    for(var track of this.player.querySelectorAll('track')) {
      if (track.src && track.src.startsWith('blob:')) {
        URL.revokeObjectURL(track.src);
      }
      track.remove();
    }
  };

  //
  // Given the path of a video file, look in the same directory for a
  // file of captions or subtitles for that video. If we find one, set
  // it on the <track> element of the player to display the captions.
  //
  // This ought to be locale sensitive so that we pick the best captions
  // for the current locale. But for now, if the video file is named foo.mp4
  // then we'll just look for a file in the same directory with name foo.vtt.
  //
  Captions.prototype.findAndDisplay = function(filepath) {
    if (!filepath) {  // If it is a blob with no name we can't look for captions
      return;
    }

    // Look for a vtt file for this video
    // XXX: ignoring locale for now
    var basename = filepath.substring(0, filepath.lastIndexOf('.'));
    var captionsFilename = basename + '.vtt';

    var sdcard = navigator.getDeviceStorage('sdcard');
    var request = sdcard.get(captionsFilename);
    request.onsuccess = function() {
      var track = document.createElement('track');
      track.src = URL.createObjectURL(request.result);
      track.default = true;
      this.player.appendChild(track);
      track.track.mode = 'showing';
    }.bind(this);
  };

  exports.Captions = Captions;
}(window));
