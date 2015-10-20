/* global AudioChannelController */
/* global BaseModule */
'use strict';

(function() {
  /**
   * SystemWindow is a placeholder for the system app's mozbrowser iframe
   * but with no actual UI.
   * We will use mozSystemWindowChromeEvent/mozContentEvent to communicate
   * with shell.js to use the actual mozbrowser iframe of the system app.
   */
  var SystemWindow = function() {};

  SystemWindow.STATES = [
    'getAudioChannels'
  ];

  BaseModule.create(SystemWindow, {
    name: 'SystemWindow',
    EVENT_PREFIX: 'systemwindow',
    DEBUG: false,
    // The fake app window ID of System app.
    instanceID: null,
    // The audio channels belong to System app.
    audioChannels: null,

    /**
     * Initial the module.
     */
    _start: function() {
      this.instanceID = 'systemAppID';
      this.audioChannels = new Map();
      var audioChannelManager = navigator.mozAudioChannelManager;
      // There is no mozAudioChannelManager in b2g desktop client.
      if (audioChannelManager && audioChannelManager.allowedAudioChannels) {
        audioChannelManager.allowedAudioChannels.forEach((audioChannel) => {
          this.audioChannels.set(
            audioChannel.name, new AudioChannelController(this, audioChannel)
          );
        });
        this.publish('audiochannelsregistered');
      }
    },

    getAudioChannels: function() {
      return this.audioChannels;
    }
  });
}());
