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
   * @return {Boolean} The audio channel is playing or not.
   */
  isPlaying: function(url, audioChannel) {
    var client = this.client;
    client.switchToFrame();
    return client.executeScript(function(url, audioChannel) {
      return window.wrappedJSObject.core.appCore.appWindowManager
        .getApp(url).audioChannels.get(audioChannel).isPlaying();
    }, [url, audioChannel]);
  },

  /**
   * Check the audio channel is fading out or not.
   *
   * @param {String} url The App URL.
   * @param {String} audioChannel An audio channel type.
   * @return {Boolean} The audio channel is fading out or not.
   */
  isFadingOut: function(url, audioChannel) {
    var client = this.client;
    client.switchToFrame();
    return client.executeScript(function(url, audioChannel) {
      return window.wrappedJSObject.core.appCore.appWindowManager
        .getApp(url).audioChannels.get(audioChannel).isFadingOut();
    }, [url, audioChannel]);
  },

  /**
   * Check the audio channel is vibrating out or not.
   *
   * @param {String} url The App URL.
   * @param {String} audioChannel An audio channel type.
   * @return {Boolean} The audio channel is fading out or not.
   */
  isVibrating: function(url, audioChannel) {
    var client = this.client;
    client.switchToFrame();
    return client.executeScript(function(url, audioChannel) {
      return window.wrappedJSObject.core.appCore.appWindowManager
        .getApp(url).audioChannels.get(audioChannel).isVibrating();
    }, [url, audioChannel]);
  }
};
