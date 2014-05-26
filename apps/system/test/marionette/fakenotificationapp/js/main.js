'use strict';

// Tell audio channel manager that we want to adjust the notification
// channel if the user press the volumeup/volumedown buttons in this app.
if (navigator.mozAudioChannelManager) {
  navigator.mozAudioChannelManager.volumeControlChannel = 'notification';
}
