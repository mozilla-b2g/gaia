'use strict';

var clickHandlers = {
  'play': function play() {
    var src = this.dataset.src;
    var ringtonePlayer = new Audio();
    ringtonePlayer.loop = true;
    var selectedSound = '../../data/ringtones/' + src;
    ringtonePlayer.src = selectedSound;
    ringtonePlayer.play();
    window.setTimeout(function _pauseRingtone() {
      ringtonePlayer.pause();
    }, 20000);
  }
};

document.body.addEventListener('click', function(evt) {
  if (clickHandlers[evt.target.id || evt.target.dataset.fn])
    clickHandlers[evt.target.id || evt.target.dataset.fn].call(evt.target, evt);
});
