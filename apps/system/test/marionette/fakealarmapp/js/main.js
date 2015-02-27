'use strict';

// Tell audio channel manager that we want to adjust the alarm channel
// if the user press the volumeup/volumedown buttons in this app.
if (navigator.mozAudioChannelManager) {
  navigator.mozAudioChannelManager.volumeControlChannel = 'alarm';
}

// Play alarm.
var audio = new Audio();
audio.mozAudioChannelType = 'alarm';
var cursor = navigator.getDeviceStorage('music').enumerate();
cursor.onsuccess = function(evt) {
  var url = window.URL.createObjectURL(evt.target.result);
  audio.src = url;
  audio.play();
};
