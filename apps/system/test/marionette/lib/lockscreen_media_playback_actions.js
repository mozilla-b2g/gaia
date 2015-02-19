'use strict';
(function(module) {

  var LockScreenMediaPlaybackActions = function() {};

  /**
   * Start to perform actions.
   */
  LockScreenMediaPlaybackActions.prototype.start =
  function(client) {
    this.Ensure = require('./ensure.js');
    this.LockScreen = require('./lockscreen.js');
    this.FakeMusic = require('./media_playback_fake_music.js');
    this.client = client;
    this.musicAppInfo = new this.FakeMusic();
    this.lockscreen = (new this.LockScreen()).start(client);
    this.lockscreen.relock();
    return this;
  };

  LockScreenMediaPlaybackActions.prototype.ensure =
  function() {
    var ensure = (new this.Ensure()).start(this.client);
    return ensure;
  };

  LockScreenMediaPlaybackActions.prototype.openMusicApp =
  function() {
    this.ensure().launch(this.musicAppInfo.origin);
    return this;
  };

  LockScreenMediaPlaybackActions.prototype.switchToMusicApp =
  function() {
    this.ensure()
      .frame(this.musicAppInfo.origin);
    return this;
  };

  LockScreenMediaPlaybackActions.prototype.playAlbumOne =
  function() {
    this.ensure()
      .frame(this.musicAppInfo.origin)
      .element(this.client.findElement(
        this.musicAppInfo.selector.albumOneElement))
      .displayed()
      .actions()
        .tap()
        .perform();
    return this;
  };

  LockScreenMediaPlaybackActions.prototype.stopPlay =
  function() {
    this.ensure()
      .frame(this.musicAppInfo.origin)
      .element(this.client.findElement(
        this.musicAppInfo.selector.stopElement))
      .displayed()
      .actions()
        .tap()
        .perform();
    return this;
  };

  LockScreenMediaPlaybackActions.prototype.togglePausePlay =
  function() {
    this.ensure()
      .frame(this.musicAppInfo.origin)
      .element(this.client.findElement(
        this.musicAppInfo.selector.playPauseElement))
      .displayed()
      .actions()
        .tap()
        .perform();
    return this;
  };

  LockScreenMediaPlaybackActions.prototype.killMusicApp =
  function() {
    try {
      this.ensure()
        .close(this.musicAppInfo.origin);
    } catch(e) {}
    return this;
  };

  LockScreenMediaPlaybackActions.prototype.interruptMusic =
  function() {
    this.ensure()
      .frame(this.musicAppInfo.origin)
      .element(this.client.findElement(
        this.musicAppInfo.selector.interruptElement))
      .displayed()
      .actions()
        .tap()
        .perform();
    return this;
  };

  LockScreenMediaPlaybackActions.prototype.lockScreen =
  function() {
    this.lockscreen.lock();
    return this;
  };

  LockScreenMediaPlaybackActions.prototype.unlockScreen =
  function() {
    this.lockscreen.unlock();
    return this;
  };

  module.exports = LockScreenMediaPlaybackActions;
})(module);
