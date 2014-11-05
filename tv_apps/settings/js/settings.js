'use strict';
/* global Base, SettingsGroup */

(function(exports) {

  function $(id) {
    return document.getElementById(id);
  }

  function Settings() {
    this.bindSelf();
  }

  var proto = Settings.prototype = new Base();

  proto.init = function st_init() {
    var self = this;
    this.group = new SettingsGroup($('settings-group'), 'main-menu');
    // We don't need to bind again, because SettingsGroup had already auto bound
    // self.
    this.group.on('ready', this.group.init);
    this.group.on('itemChoosed', this.switchGroup);
    window.addEventListener('keydown', this.handleKeyDown);
    document.body.dataset.active = 'group';
  };

  proto.pumpKeyEvent = function st_pumpKeyEvent(key) {
    switch(document.body.dataset.active) {
      default:
        this.group.move(key);
        break;
    }
  };

  proto.handleKeyDown = function st_handleKeyDown(evt) {
    // XXX : It's better to use KeyEvent.Key and use "ArrowUp", "ArrowDown",
    // "ArrowLeft", "ArrowRight" for switching after Gecko synced with W3C
    // KeyboardEvent.Key standard. Here we still use KeyCode and customized
    // string of "up", "down", "left", "right" for the moment.
    var key = this.convertKeyToString(evt.keyCode);
    switch (key) {
      case 'up':
      case 'down':
        this.pumpKeyEvent(key);
        break;
      case 'left':
      case 'right':
        break;
    }
  };

  proto.convertKeyToString = function st_convertKeyToString(keyCode) {
    switch (keyCode) {
      case KeyEvent.DOM_VK_UP:
        return 'up';
      case KeyEvent.DOM_VK_RIGHT:
        return 'right';
      case KeyEvent.DOM_VK_DOWN:
        return 'down';
      case KeyEvent.DOM_VK_LEFT:
        return 'left';
      case KeyEvent.DOM_VK_RETURN:
        return 'enter';
      case KeyEvent.DOM_VK_ESCAPE:
        return 'esc';
      case KeyEvent.DOM_VK_BACK_SPACE:
        return 'esc';
      default:// we don't consume other keys.
        return null;
    }
  };

  proto.switchGroup = function st_switchGroup(id) {
    console.log('group id: ' + id);
  };

  exports.Settings = Settings;
}(window));

window.settings = new Settings();
window.settings.init();
