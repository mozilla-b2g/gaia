'use strict';
(function() {
  ['normal', 'content', 'alarm', 'system', 'ringer',
   'telephony', 'notification', 'publicnotification'].forEach(function(type){
    var play = document.querySelector('#' + type + ' .play');
    var pause = document.querySelector('#' + type + ' .pause');
    var audio = new Audio();

    audio.src = 'audio/b2g.ogg';
    audio.loop = true;
    audio.mozAudioChannelType = type;

    play.addEventListener('click', function() {
      audio.play();
    });

    pause.addEventListener('click', function() {
      audio.pause();
    });
  });
}());
