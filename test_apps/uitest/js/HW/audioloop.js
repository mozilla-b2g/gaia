'use strict';

// Use getUserMedia to get sound and play it using audio tag
(function() {
  navigator.getMedia = (navigator.getUserMedia ||
                        navigator.webkitGetUserMedia ||
                        navigator.mozGetUserMedia ||
                        navigator.msGetUserMedia);

  navigator.getMedia(
    {
      video: false,
      audio: true
    },
    function(stream) {
      var audioPlayer = new Audio();
      var vendorURL = window.URL || window.webkitURL;
      audioPlayer.src = vendorURL.createObjectURL(stream);
      audioPlayer.play();
    },
    function(err) {
      alert('An error occured! ' + err);
    }
  );
})();
