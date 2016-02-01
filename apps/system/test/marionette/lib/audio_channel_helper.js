'use strict';

function AudioChannelHelper(client) {
  this.client = client;
}

module.exports = AudioChannelHelper;

AudioChannelHelper.prototype = {
  /**
   * Check the audio channel is playing or not.
   *
   * @param {String} url The App URL.
   * @param {String} audioChannel An audio channel type.
   * @param {Boolean} isPlaying Expect audio channel is playing or not.
   */
  isPlaying: function(url, audioChannel, isPlaying) {
    var client = this.client;
    client.switchToFrame();
    client.waitFor(function() {
      return isPlaying === client.executeScript(function(url, audioChannel) {
        return window.wrappedJSObject.core.appCore.appWindowManager
          .getApp(url).audioChannels.get(audioChannel).isPlaying();
      }, [url, audioChannel]);
    });
  },

  /**
   * Check the audio channel is fading out or not.
   *
   * @param {String} url The App URL.
   * @param {String} audioChannel An audio channel type.
   * @param {Boolean} isFadingOut Expect audio channel is fading out or not.
   */
  isFadingOut: function(url, audioChannel, isFadingOut) {
    var client = this.client;
    client.switchToFrame();
    client.waitFor(function() {
      return isFadingOut === client.executeScript(function(url, audioChannel) {
        return window.wrappedJSObject.core.appCore.appWindowManager
          .getApp(url).audioChannels.get(audioChannel).isFadingOut();
      }, [url, audioChannel]);
    });
  },

  /**
   * Check the audio channel is vibrating out or not.
   *
   * @param {String} url The App URL.
   * @param {String} audioChannel An audio channel type.
   * @param {Boolean} isVibrating Expect audio channel is vibrating or not.
   */
  isVibrating: function(url, audioChannel, isVibrating) {
    var client = this.client;
    client.switchToFrame();
    client.waitFor(function() {
      return isVibrating === client.executeScript(function(url, audioChannel) {
        return window.wrappedJSObject.core.appCore.appWindowManager
          .getApp(url).audioChannels.get(audioChannel).isVibrating();
      }, [url, audioChannel]);
    });
  }
};
