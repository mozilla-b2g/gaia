'use strict';

function headphoneTest() {
  var status_display = document.getElementById('status');
  var acm = navigator.mozAudioChannelManager;
  if (acm) {
    acm.addEventListener('headphoneschange', update.bind(this));
  }
  else {
    status_display.textContent = 'mozAudioChannelManager not found';
  }

  function update() {
    if (acm.headphones) {
      status_display.textContent = 'plugged';
    }
    else {
      status_display.textContent = 'unpluged';
    }
  }
  update();
}
window.addEventListener('load', headphoneTest);
