'use strict';

/* global IMESwitcher, ImeMenu, KeyboardHelper, inputWindowManager,
          InputLayouts, LazyLoader, DynamicInputRegistry */

/**
 * For some flow diagrams related to input management, please refer to
 * https://wiki.mozilla.org/Gaia/System/InputManagement#Flow_Diagrams .
 */

// If we get a inputmethod-contextchange chrome event for an element with
// one of these types, we'll just ignore it.
// XXX we won't skip these types in the future when we move value selector
// to an app.
const IGNORED_INPUT_TYPES = {
  'select-one': true,
  'select-multiple': true,
  'date': true,
  'time': true,
  'datetime': true,
  'datetime-local': true
};

const TYPE_GROUP_MAPPING = {
  // text
  'text': 'text',
  'textarea': 'text',
  'url': 'url',
  'email': 'email',
  'password': 'password',
  'search': 'text',
  // number
  'number': 'number',
  'tel': 'number',
  // option
  'select-one': 'option',
  'select-multiple': 'option',
  'time': 'option',
  'week': 'option',
  'month': 'option',
  'date': 'option',
  'datetime': 'option',
  'datetime-local': 'option',
  'color': 'option'
};

// How long to wait before we actually switch layouts
const SWITCH_CHANGE_DELAY = 20;

window.KeyboardManager = {
  // this info keeps the current keyboard layout's information,
  // including its group, its index in the group array in InputLayouts.layouts,
  // and its "layout" as kept in InputLayouts.layouts
  _showingLayoutInfo: {
    group: 'text',
    index: 0,
    layout: null
  },

  _switchChangeTimeout: 0,
  _onDebug: false,
  _debug: function km_debug(msg) {
    if (this._onDebug) {
      console.log('[Keyboard Manager] ' + msg);
    }
  },

  init: function km_init() {
    this.imeSwitcher = new IMESwitcher();
    this.imeSwitcher.ontap = this._showImeMenu.bind(this);
    this.imeSwitcher.start();

    window.addEventListener('keyboardhide', this);

    // To handle keyboard layout switching
    window.addEventListener('mozChromeEvent', this);

    this.inputLayouts = new InputLayouts(this, TYPE_GROUP_MAPPING);
    this.inputLayouts.start();

    // get enabled keyboard from mozSettings, parse their manifest
    LazyLoader.load([
      'js/dynamic_input_registry.js',
      'shared/js/input_mgmt/input_app_list.js',
      'shared/js/keyboard_helper.js'
    ], function() {
      // Defer the loading of DynamicInputRegistry only after
      // KeyboardHelper is present. Not that is possible we could miss some
      // mozChromeEvent because of this but let's not deal with that kind of
      // extreme case.
      this.dynamicInputRegistry = new DynamicInputRegistry();
      this.dynamicInputRegistry.start();

      KeyboardHelper.watchLayouts(
        { enabled: true }, this._updateLayouts.bind(this)
      );
    }.bind(this));
  },

  _tryLaunchOnBoot: function km_launchOnBoot() {
    if (inputWindowManager.getLoadedManifestURLs().length) {
      // There are already keyboard(s) being launched. We don't really care
      // if a default keyboard should be launch-on-boot.
      return;
    }

    var LAUNCH_ON_BOOT_KEY = 'keyboard.launch-on-boot';
    var req = navigator.mozSettings.createLock().get(LAUNCH_ON_BOOT_KEY);
    req.onsuccess = req.onerror = (function() {
      // If the value is not set or it is set to true,
      // launch the keyboad in background
      var launchOnBoot = req.result && req.result[LAUNCH_ON_BOOT_KEY];
      if (typeof launchOnBoot !== 'boolean') {
        launchOnBoot = true;
      }

      // if there are still no keyboards running at this point -
      // set text to show, but don't bring it to the foreground.
      if (launchOnBoot &&
          !inputWindowManager.getLoadedManifestURLs().length) {
        this._setKeyboardToShow('text', undefined, true);
      }
    }).bind(this);
  },

  _updateLayouts: function km_updateLayouts(layouts) {
    var enabledApps = this.inputLayouts.processLayouts(layouts);

    var manifestURLsToRemove =
      inputWindowManager.getLoadedManifestURLs().filter(
        manifestURL => !enabledApps.has(manifestURL)
      );

    inputWindowManager._onInputLayoutsRemoved(manifestURLsToRemove);

    manifestURLsToRemove.forEach(manifestURL => {
      if (this._showingLayoutInfo.layout &&
          this._showingLayoutInfo.layout.manifestURL === manifestURL) {
        this._resetShowingLayoutInfo();
      }
    });

    this._tryLaunchOnBoot();
  },

  // a showing keyboard instance was OOM-killed. we need to relaunch something.
  _onKeyboardKilled: function km_onKeyboardKilled(manifestURL) {
    var revokeShowedGroup = this._showingLayoutInfo.group;
    this._setKeyboardToShow(revokeShowedGroup);
  },

  _onKeyboardReady: function km_onKeyboardReady() {
    this._showIMESwitcher();
  },

  // Decide the keyboard layout for the specific group and show it
  _activateKeyboard: function km_activateKeyboard(group) {
    // if we already have layouts for the group, no need to check default
    if (!this.inputLayouts.layouts[group]) {
      KeyboardHelper.checkDefaults(function changedDefaults() {
          KeyboardHelper.getLayouts({ enabled: true },
            this._updateLayouts.bind(this));
          KeyboardHelper.saveToSettings();
      }.bind(this));
    }
    // if there are still no keyboards to use, use text
    if (!this.inputLayouts.layouts[group]) {
      group = 'text';
    }

    // Get the last keyboard the user used for this group
    var currentActiveLayout = KeyboardHelper.getCurrentActiveLayout(group);
    var currentActiveLayoutIdx;
    if (currentActiveLayout && this.inputLayouts.layouts[group]) {
      for (var i = 0; i < this.inputLayouts.layouts[group].length; i++) {
        // See if we still have that keyboard in our current layouts
        var layout = this.inputLayouts.layouts[group][i];
        if (layout.manifestURL === currentActiveLayout.manifestURL &&
            layout.id === currentActiveLayout.id) {
          // If so, default to that, saving the users choice
          currentActiveLayoutIdx = i;
          break;
        }
      }
    }

    this._setKeyboardToShow(group, currentActiveLayoutIdx);
  },

  _inputFocusChange: function km_inputFocusChange(evt) {
    var type = evt.detail.inputType;

    // Skip the <select> element and inputs with type of date/time,
    // handled in system app for now
    if (!type || type in IGNORED_INPUT_TYPES) {
      inputWindowManager.hideInputWindow();
      return;
    }

    if ('blur' === type) {
      this._debug('get blur event');
      inputWindowManager.hideInputWindow();
      this.imeSwitcher.hide();
    } else {
      // display the keyboard for that group decided by input type
      // fallback to text for default if no group is found
      var group = TYPE_GROUP_MAPPING[type];
      this._debug('get focus event ' + type);
      this._activateKeyboard(group);
    }
  },

  handleEvent: function km_handleEvent(evt) {
    switch (evt.type) {
      case 'mozChromeEvent':
        switch (evt.detail.type) {
          case 'inputmethod-showall':
            this._showImeMenu();
            break;
          case 'inputmethod-next':
            this._switchToNext();
            break;
          case 'inputmethod-contextchange':
            this._inputFocusChange(evt);
            break;
        }
        break;
      case 'keyboardhide':
        this._resetShowingLayoutInfo();
        break;
    }
  },

  _setKeyboardToShow: function km_setKeyboardToShow(group, index, launchOnly) {
    if (!this.inputLayouts.layouts[group]) {
      console.warn('trying to set a layout group to show that doesnt exist');
      return;
    }

    if (undefined === index) {
      index = this.inputLayouts.layouts[group].activeLayout;
    }
    this._debug('set layout to display: group=' + group + ' index=' + index);
    var layout = this.inputLayouts.layouts[group][index];

    if (launchOnly) {
      inputWindowManager.preloadInputWindow(layout);
    } else {
      inputWindowManager.showInputWindow(layout);

      this.inputLayouts.layouts[group].activeLayout = index;
      KeyboardHelper.saveCurrentActiveLayout(group,
        layout.id, layout.manifestURL);
    }

    this._setShowingLayoutInfo(group, index, layout);

    this.inputLayouts.setGroupsActiveLayout(layout);
  },

  /**
   * A half-permanent notification should display after the keyboard got
   * activated, and only hides after the keyboard got deactivated.
   */
  _showIMESwitcher: function km_showIMESwitcher() {
    var showed = this._showingLayoutInfo;
    if (!this.inputLayouts.layouts[showed.group]) {
      return;
    }

    // Need to make the message in spec: "FirefoxOS - English"...
    var current = this.inputLayouts.layouts[showed.group][showed.index];

    this.imeSwitcher.show(current.appName, current.name);
  },

  _resetShowingLayoutInfo: function km_resetShowingLayoutInfo() {
    this._showingLayoutInfo.group = 'text';
    this._showingLayoutInfo.index = 0;
    this._showingLayoutInfo.layout = null;
  },

  _setShowingLayoutInfo: function km_setShowingLayoutInfo(group, index, layout){
    this._showingLayoutInfo.group = group;
    this._showingLayoutInfo.index = index;
    this._showingLayoutInfo.layout = layout;
  },

  /* A small helper function for maintaining timeouts */
  _waitForSwitchTimeout: function km_waitForSwitchTimeout(callback) {
    clearTimeout(this._switchChangeTimeout);

    this._switchChangeTimeout = setTimeout(callback, SWITCH_CHANGE_DELAY);
  },

  _switchToNext: function km_switchToNext() {
    var showed = this._showingLayoutInfo;

    this._waitForSwitchTimeout(function keyboardSwitchLayout() {
      if (!this.inputLayouts.layouts[showed.group]) {
        showed.group = 'text';
      }
      var length = this.inputLayouts.layouts[showed.group].length;
      var index = (showed.index + 1) % length;
      this.inputLayouts.layouts[showed.group].activeLayout = index;

      this._setKeyboardToShow(showed.group, index);
    }.bind(this));
  },

  /*
   * Callback for ImeMenu.
   * If selectedIndex is defined, then some item of imeMenu was selected;
   * if it's not, then it was canceled.
   * The showedGroup param is bind()'ed by _showImeMenu
   * (resulting in a partial func)
   */
  _imeMenuCallback: function km_imeMenuCallback(showedGroup, selectedIndex) {
    if (typeof selectedIndex === 'number') {
      // success: show the new keyboard
      this.inputLayouts.layouts[showedGroup].activeLayout = selectedIndex;
      this._setKeyboardToShow(showedGroup, selectedIndex);

      // Hide the tray to show the app directly after user selected a new kb.
      window.dispatchEvent(new CustomEvent('keyboardchanged'));
    } else {
      // cancel: mimic the success callback to show the current keyboard.
      this._setKeyboardToShow(showedGroup);

      // Hide the tray to show the app directly after user canceled.
      window.dispatchEvent(new CustomEvent('keyboardchangecanceled'));
    }
  },

  // Show the input method menu
  _showImeMenu: function km_showImeMenu() {
    var showedGroup = this._showingLayoutInfo.group;
    var activeLayout = this.inputLayouts.layouts[showedGroup].activeLayout;
    var actionMenuTitle = navigator.mozL10n.get('choose-option');

    this._waitForSwitchTimeout(function listLayouts() {
      var items = this.inputLayouts.layouts[showedGroup].map(
        function(layout, index) {
          return {
            layoutName: layout.name,
            appName: layout.appName,
            value: index,
            selected: (index === activeLayout)
          };
        });

      inputWindowManager.hideInputWindow();

      var menu = new ImeMenu(items, actionMenuTitle,
        this._imeMenuCallback.bind(this, showedGroup),
        this._imeMenuCallback.bind(this, showedGroup));

      menu.start();

    }.bind(this));
  }
};
