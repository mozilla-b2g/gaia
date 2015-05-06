'use strict';
(function(module) {

  var MediaPlaybackActions = function() {};

  /**
   * Start to perform actions.
   */
  MediaPlaybackActions.prototype.start =
  function(client) {
    this.Ensure = require('./ensure.js');
    this.FakeMusic = require('./media_playback_fake_music.js');
    this.client = client;
    this.selector = {
      trayHandler: '#top-panel',
      grippy: '#utility-tray-grippy'
    };
    this.musicAppInfo = new this.FakeMusic();
    // Block until System is ready.
    this.ensure().frame().systemReady();
    return this;
  };

  MediaPlaybackActions.prototype.ensure =
  function(condition, name) {
    var ensure = (new this.Ensure()).start(this.client);
    return ensure;
  };

  MediaPlaybackActions.prototype.pullDownTray =
  function() {
    this.ensure()
      .frame()
      .element(this.client.findElement(this.selector.trayHandler))
      .displayed()
      .actions()
        .pull(0, 400)
        .perform()
      .element(this.client.findElement(this.selector.grippy))
      .located()
      .must(function(elements) {
        return elements.current.location().y > 400;
      });
    return this;
  };

  MediaPlaybackActions.prototype.pullUpTray =
  function() {
    this.ensure()
      .frame()
      .element(this.client.findElement(this.selector.grippy))
      .displayed()
      .must(function(elements) {
        return elements.current.location().y > 400;
      })
      .actions()
        .pull(0, -400)
        .perform()
      .located()
      .element(this.client.findElement(this.selector.grippy))
      .must(function(elements) {
        return elements.current.location().y < 30;
      });
    return this;
  };

  MediaPlaybackActions.prototype.openMusicApp =
  function() {
    this.ensure().launch(this.musicAppInfo.origin);
    return this;
  };

  MediaPlaybackActions.prototype.switchToMusicApp =
  function() {
    this.ensure()
      .frame(this.musicAppInfo.origin);
    return this;
  };

  MediaPlaybackActions.prototype.playAlbumOne =
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

  MediaPlaybackActions.prototype.stopPlay =
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

  MediaPlaybackActions.prototype.togglePausePlay =
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

  MediaPlaybackActions.prototype.killMusicApp =
  function() {
    try {
      this.ensure()
        .close(this.musicAppInfo.origin);
    } catch(e) {}
    return this;
  };

  MediaPlaybackActions.prototype.interruptMusic =
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

  module.exports = MediaPlaybackActions;
})(module);
