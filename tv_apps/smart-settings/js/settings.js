'use strict';
/* global Base, SettingsGroup */

(function(exports) {

  function $(id) {
    return document.getElementById(id);
  }

  function Settings() {
    this.bindSelf();
    this.panels = {};
    this.settingsGroup = $('settings-group');
    this.itemTitleElement = $('items-panel-title');
  }

  var proto = Settings.prototype = new Base();

  proto.groupClassMap = {
    'picture': SettingsList,
    'sound': SettingsList,
    'network': SettingsList,
    'timer': SettingsList,
    'setup': SetupGroupList,
    'help': SettingsList
  };

  proto.init = function st_init() {
    var self = this;
    this.settingsGroup.addEventListener('transitionend',
                                        this.handleTransitionEnd);
    this.group = new SettingsGroup(this.settingsGroup, 'main-menu');
    // We don't need to bind again, because SettingsGroup had already auto bound
    // self.
    this.group.on('groupChoosed', this.switchGroup);
    window.addEventListener('keydown', this.handleKeyDown);
    document.body.dataset.active = 'group';
    this.group.on('ready', function groupReady() {
      self.group.setVisible(true);
      self.group.setActive(true);
    });
  };

  proto.pumpMoveEvent = function st_pumpMoveEvent(key) {
    switch(document.body.dataset.active) {
      case 'list':
        this.activePanel.move(key);
        break;
      default:
        this.group.move(key);
        break;
    }
  };

  proto.confirmSelection = function st_confirmSelection(key) {
    if (this.stateTransitioning) {
      // If it is transitioning, we don't need to accept any confirm or exit
      // command.
      return;
    }
    switch(document.body.dataset.active) {
      case 'group':
        this.stateTransitioning = true;
        document.body.dataset.active = 'list';
        document.body.dataset.activeGroup = this.selectedGroup;
        // set activate state to tell panel to show selection border.
        this.activateGroup(this.selectedGroup);
        break;
      case 'list':
        this.activePanel.confirmSelection(key);
        break;
    }
  };

  proto.activateGroup = function st_activateGroup(group) {
    if (this.activePanel) {
      this.activePanel.setActive(false);
    }
    this.activePanel = this.panels[group];
    if (this.activePanel) {
      this.activePanel.setActive(true);
    }
  };

  proto.exitPanel = function st_exitPanel(key) {
    if (this.stateTransitioning) {
      // If it is transitioning, we don't need to accept any confirm or exit
      // command.
      return;
    }
    switch(document.body.dataset.active) {
      case 'list':
        this.stateTransitioning = true;
        document.body.dataset.active = 'group';
        document.body.dataset.activeGroup = '';
        this.group.setActive(true);
        this.activateGroup(null);
        break;
    }
  };

  proto.handleTransitionEnd = function st_handleTransitionEnd(evt) {
    this.stateTransitioning = false;
    if (evt.currentTarget === this.settingsGroup) {
      switch(document.body.dataset.active) {
        case 'group':
        case 'list':
          this.group.setActive(false);
          break;
      }
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
        this.pumpMoveEvent(key);
        break;
      case 'enter':
      case 'right':
        this.confirmSelection(key);
        break;
      case 'esc':
      case 'left':
        this.exitPanel(key);
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
    if (!this.panels[id]) {
      this.panels[id] = new this.groupClassMap[id]();
      this.panels[id].init($(id + '-section'));
    }

    for (var key in this.panels) {
      this.panels[key].setVisible(id === key);
    }
    this.selectedGroup = id;
    this.itemTitleElement.setAttribute('data-l10n-id', id);
  };

  exports.Settings = Settings;
}(window));

window.settings = new Settings();
window.settings.init();
