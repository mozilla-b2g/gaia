'use strict';
/* global Applications, Base, KeyEvent, Settings, SharedUtils,
          SettingsGroup, SetupGroupList, SettingsList */

(function(exports) {

  var mozSettings = window.navigator.mozSettings;

  function $(id) {
    return document.getElementById(id);
  }

  function Settings() {
    this.bindSelf();
    this.panels = {};
    this.settingsGroup = $('settings-group');
    this.settingsDetail = $('settings-detail');
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
    Applications.init();
    var self = this;
    this.settingsGroup.addEventListener('transitionend',
                                        this.handleTransitionEnd);
    this.settingsDetail.addEventListener('transitionend',
                                         this.handleTransitionEnd);
    this.group = new SettingsGroup();
    // We don't need to bind again, because SettingsGroup had already auto bound
    // self.
    this.group.on('groupChoosed', this.switchGroup);
    this.group.init(this.settingsGroup, 'main-menu');
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
      case 'option-menu':
        this.activeDetail.move(key);
        break;
      default:
        this.group.move(key);
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

  proto.changeState = function st_changeState(state) {
    this.transitionRunning = true;
    // we use dataset to keep the active state
    document.body.dataset.active = state;
  };

  proto.confirmSelection = function st_confirmSelection(key) {
    if (this.transitionRunning) {
      // If transition is running, we don't need to accept any confirm or exit
      // command.
      return;
    }
    switch(document.body.dataset.active) {
      case 'group':
        this.changeState('list');
        document.body.dataset.activeGroup = this.selectedGroup;
        // set activate state to tell panel to show selection border.
        this.activateGroup(this.selectedGroup);
        break;
      case 'list':
        // Let active panel to handle the confirm command. The active panel may
        // use event to tell us to show other panels or enter other state.
        this.activePanel.confirmSelection(key);
        break;
      case 'option-menu':
        this.activeDetail.confirmSelection(key);
        this.changeState('list');
        this.activeDetail.stop();
        this.activeDetail = null;
        break;
    }
  };

  proto.exitPanel = function st_exitPanel(key) {
    if (this.transitionRunning) {
      // If transition is running, we don't need to accept any confirm or exit
      // command.
      return;
    }
    switch(document.body.dataset.active) {
      case 'list':
        this.changeState('group');
        document.body.dataset.activeGroup = '';
        this.group.setActive(true);
        this.activateGroup(null);
        break;
      case 'option-menu':
        this.changeState('list');
        this.activeDetail.stop();
        this.activeDetail = null;
        break;
    }
  };

  proto.handleTransitionEnd = function st_handleTransitionEnd(evt) {
    // We had transitions on few properties. So, we may receive multiple
    // transitionend events. But we should only use one, which is 'width', as
    // to be the ending of transition.
    if (evt.propertyName !== 'width') {
      return;
    }

    this.transitionRunning = false;
    switch(document.body.dataset.active) {
      case 'group':
        this.group.setActive(false);
        break;
      case 'list':
        this.group.setActive(false);
        this.activePanel.setActive(true);
        break;
      case 'option-menu':
        this.activePanel.setActive(false);
        this.activeDetail.start();
        break;
    }
  };

  proto.handleItemChoosed = function st_handleItemChoosed(data) {
    if (data.type) {
      this.settingsDetail.dataset.type = data.type;
    } else {
      delete this.settingsDetail.dataset.type;
    }
  };

  proto.handleKeyDown = function st_handleKeyDown(evt) {
    // XXX : It's better to use KeyEvent.Key and use "ArrowUp", "ArrowDown",
    // "ArrowLeft", "ArrowRight" for switching after Gecko synced with W3C
    // KeyboardEvent.Key standard. Here we still use KeyCode and customized
    // string of "up", "down", "left", "right" for the moment.
    var key = this.convertKeyToString(evt);
    switch (key) {
      case 'up':
      case 'down':
        this.pumpMoveEvent(key);
        break;
      case 'enter':
      case 'right':
        this.confirmSelection(key);
        break;
      case 'back':
      case 'left':
        this.exitPanel(key);
        break;
    }
  };

  proto.convertKeyToString = function st_convertKeyToString(evt) {
    if (SharedUtils.isBackKey(evt)) {
      return 'back';
    }

    switch (evt.keyCode) {
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
      default:// we don't consume other keys.
        return null;
    }
  };

  proto.switchGroup = function st_switchGroup(id) {
    if (!this.panels[id]) {
      this.panels[id] = new this.groupClassMap[id]();
      this.panels[id].init($(id + '-section'));
      this.panels[id].on('itemChoosed', this.handleItemChoosed);
      this.panels[id].on('showOptionMenu', this.showOptionMenu);
      this.panels[id].on('updateSettings', this.updateSettings);
    }

    for (var key in this.panels) {
      this.panels[key].setVisible(id === key);
    }
    this.selectedGroup = id;
    this.itemTitleElement.setAttribute('data-l10n-id', id);
  };

  proto.showOptionMenu = function st_showOptionMenu(optionMenu) {
    if (this.transitionRunning) {
      // If transition is running, we don't need to accept any confirm or exit
      // command.
      return;
    }
    this.changeState('option-menu');
    optionMenu.renderAt($('option-menu-list'));
    this.activeDetail = optionMenu;
  };

  proto.updateSettings = function st_updateSettings(data) {
    mozSettings.createLock().set(data);
  };

  exports.Settings = Settings;
}(window));

window.settings = new Settings();
window.settings.init();
