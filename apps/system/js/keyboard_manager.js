'use strict';

/* global SettingsListener, IMESwitcher, ImeMenu, KeyboardHelper,
          InputFrameManager, InputLayouts, LazyLoader */

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

var KeyboardManager = {
  // this info keeps the current keyboard layout's information,
  // including its group, its index in the group array in InputLayouts.layouts,
  // its occupying height and its "layout" as kept in InputLayouts.layouts
  _showingLayoutInfo: {
    group: 'text',
    index: 0,
    layout: null,
    height: 0
  },

  _switchChangeTimeout: 0,
  _onDebug: false,
  _debug: function km_debug(msg) {
    if (this._onDebug) {
      console.log('[Keyboard Manager] ' + msg);
    }
  },
  isOutOfProcessEnabled: false,
  totalMemory: 0,

  init: function km_init() {
    // 3rd-party keyboard apps must be run out-of-process.
    SettingsListener.observe('keyboard.3rd-party-app.enabled', true,
      function(value) {
        this.isOutOfProcessEnabled = value;
      }.bind(this));

    if ('getFeature' in navigator) {
      navigator.getFeature('hardware.memory').then(function(mem) {
        this.totalMemory = mem;
      }.bind(this), function() {
        console.error('KeyboardManager: ' +
          'Failed to retrive total memory of the device.');
      });
    }

    this.imeSwitcher = new IMESwitcher();
    this.imeSwitcher.ontap = this._showImeMenu.bind(this);
    this.imeSwitcher.start();

    // For Bug 812115: hide the keyboard when the app is closed here,
    // since it would take a longer round-trip to receive focuschange
    // Also in Bug 856692 we realise that we need to close the keyboard
    // when an inline activity goes away.
    window.addEventListener('activityrequesting', this);
    window.addEventListener('activityopening', this);
    window.addEventListener('activityclosing', this);
    window.addEventListener('attentionrequestopen', this);
    window.addEventListener('attentionrecovering', this);
    window.addEventListener('attentionopening', this);
    window.addEventListener('attentionopened', this);
    window.addEventListener('attentionclosing', this);
    window.addEventListener('attentionclosed', this);
    window.addEventListener('mozbrowsererror', this);
    window.addEventListener('applicationsetupdialogshow', this);
    window.addEventListener('mozmemorypressure', this);
    window.addEventListener('sheets-gesture-begin', this);
    window.addEventListener('lockscreen-appopened', this);
    window.addEventListener('screenchange', this);

    // To handle keyboard layout switching
    window.addEventListener('mozChromeEvent', this);

    this.inputFrameManager = new InputFrameManager(this);
    this.inputFrameManager.start();

    this.inputLayouts = new InputLayouts(this, TYPE_GROUP_MAPPING);
    this.inputLayouts.start();

    // get enabled keyboard from mozSettings, parse their manifest
    LazyLoader.load([
      'shared/js/keyboard_helper.js'
    ], function() {
      KeyboardHelper.watchLayouts(
        { enabled: true }, this._updateLayouts.bind(this)
      );
    }.bind(this));
  },

  getHeight: function kn_getHeight() {
    var ret =
      this.inputFrameManager.getOccupyingHeight(
        this._showingLayoutInfo.layout.manifestURL,
        this._showingLayoutInfo.layout.id
      );
    return ret;
  },

  _tryLaunchOnBoot: function km_launchOnBoot() {
    if (Object.keys(this.inputFrameManager.runningLayouts).length) {
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
          !Object.keys(this.inputFrameManager.runningLayouts).length) {
        this._setKeyboardToShow('text', undefined, true);
      }
    }).bind(this);
  },

  _updateLayouts: function km_updateLayouts(layouts) {
    var enabledApps = this.inputLayouts.processLayouts(layouts);

    // Remove apps that are no longer enabled to clean up.
    Object.keys(this.inputFrameManager.runningLayouts).forEach(
      function removeApp(manifestURL) {
      if (!enabledApps.has(manifestURL)) {
        this.removeKeyboard(manifestURL);
      }
    }, this);

    this._tryLaunchOnBoot();
  },

  _onKeyboardLaunched: function km_onKeyboardLaunched(height) {
    this._debug('onKeyboardLaunched: ' + height);
    this._showingLayoutInfo.height = height;

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

      var previousLayout = this._showingLayoutInfo.layout;

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

    // We need to reset the previous frame only when we switch to a new frame
    // this "frame" is decided by layout properties
    if (previousLayout &&
        (previousLayout.manifestURL !==
         this._showingLayoutInfo.layout.manifestURL ||
         previousLayout.id !== this._showingLayoutInfo.layout.id)
       ) {
      this._debug('reset previousFrame.');
      this.inputFrameManager.resetInputWindow(previousLayout);
    }
  },

  _inputFocusChange: function km_inputFocusChange(evt) {
    var type = evt.detail.inputType;

    // Skip the <select> element and inputs with type of date/time,
    // handled in system app for now
    if (!type || type in IGNORED_INPUT_TYPES) {
      this.hideKeyboard();
      return;
    }

    if ('blur' === type) {
      this._debug('get blur event');
      this.hideKeyboard();
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
      case 'attentionrequestopen':
      case 'attentionrecovering':
      case 'attentionopening':
      case 'attentionclosing':
      case 'attentionopened':
      case 'attentionclosed':
      case 'applicationsetupdialogshow':
      case 'activityrequesting':
      case 'activityopening':
      case 'activityclosing':
        this.hideKeyboardImmediately();
        break;
      case 'screenchange':
        if (!evt.detail.screenEnabled) {
          this.hideKeyboardImmediately();
        }
        break;
      case 'mozbrowsererror': // OOM
        this.removeKeyboard(evt.target.dataset.frameManifestURL, true);
        break;
      case 'mozmemorypressure':
        // Memory pressure event. If a keyboard is loaded but not opened,
        // get rid of it.
        // We only do that when we don't run keyboards OOP.
        this._debug('mozmemorypressure event');
        if (!this.isOutOfProcessEnabled &&
            !this.inputFrameManager.hasActiveKeyboard()) {
          Object.keys(this.inputFrameManager.runningLayouts)
                .forEach(this.removeKeyboard, this);
          this.inputFrameManager.runningLayouts = {};
          this._debug('mozmemorypressure event; keyboard removed');
        }
        break;
      case 'lockscreen-appopened':
        /* falls through */
      case 'sheets-gesture-begin':
        if (this.inputFrameManager.hasActiveKeyboard()) {
          // Instead of hideKeyboard(), we should removeFocus() here.
          // (and, removing the focus cause Gecko to ask us to hideKeyboard())
          navigator.mozInputMethod.removeFocus();
        }
        break;
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
    }
  },

  removeKeyboard: function km_removeKeyboard(manifestURL, handleOOM) {
    var revokeShowedGroup = null;
    if (!this.inputFrameManager.runningLayouts.hasOwnProperty(manifestURL)) {
      return;
    }

    if (this._showingLayoutInfo.layout &&
      this._showingLayoutInfo.layout.manifestURL === manifestURL) {
      revokeShowedGroup = this._showingLayoutInfo.group;
      this.hideKeyboard();
    }

    this.inputFrameManager.removeKeyboard(manifestURL);

    this._resetShowingLayoutInfo();

    if (handleOOM && revokeShowedGroup !== null) {
      this._setKeyboardToShow(revokeShowedGroup);
    }
  },

  _setKeyboardToShow:
    function km_setKeyboardToShow(group, index, launchOnly,
                                  showImmediately, showedCallback) {
    if (!this.inputLayouts.layouts[group]) {
      console.warn('trying to set a layout group to show that doesnt exist');
      return;
    }
    if (undefined === index) {
      index = this.inputLayouts.layouts[group].activeLayout;
    }
    this._debug('set layout to display: group=' + group + ' index=' + index);
    var layout = this.inputLayouts.layouts[group][index];
    this.inputFrameManager.launchInputWindow(layout, launchOnly,
                                             showImmediately, showedCallback);
    this._setShowingLayoutInfo(group, index, layout);

    this.inputLayouts.setGroupsActiveLayout(layout);

    // By setting launchOnly to true, we load the keyboard frame w/o bringing it
    // to the backgorund; this is convenient to call
    // setKeyboardToShow() and call resetShowingKeyboard() in one atcion.
    if (launchOnly) {
      this._resetShowingKeyboard();
      return;
    }

    this.inputLayouts.layouts[group].activeLayout = index;
    KeyboardHelper.saveCurrentActiveLayout(group,
      layout.id, layout.manifestURL);

    // Make sure we are not in the transition out state
    // while user foucus quickly again.

    if (this.inputFrameManager.getInputWindowState(
          this._showingLayoutInfo.layout.manifestURL, 
          this._showingLayoutInfo.layout.id) === 'closing') {
      this.inputFrameManager.beginOpen(
        this._showingLayoutInfo.layout.manifestURL,
        this._showingLayoutInfo.layout.id,
        this._showingLayoutInfo.height
      );
    }

    this.inputFrameManager.setupInputWindow(layout);
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

  // Reset the current keyboard frame
  _resetShowingKeyboard: function km_resetShowingKeyboard() {
    this._debug('resetShowingKeyboard');

    this.inputFrameManager.resetInputWindow(this._showingLayoutInfo.layout);

    this._resetShowingLayoutInfo();
  },

  hideKeyboard: function km_hideKeyboard() {
    if(!this._showingLayoutInfo.layout){
      return;
    }
    // prevent hidekeyboard trigger again while 'appwillclose' is fired.
    var transitionState =
      this.inputFrameManager.getInputWindowState(
        this._showingLayoutInfo.layout.manifestURL,
        this._showingLayoutInfo.layout.id
      );
    if ((transitionState === 'closed') ||
        (transitionState === 'closing')) {
      // Bug 963377. Also reset yet-to-show keyboards.
      this._resetShowingKeyboard();
      return;
    }

    this.inputFrameManager.hideInputWindow(
      this._showingLayoutInfo.layout.manifestURL,
      this._showingLayoutInfo.layout.id
    );
  },

  hideKeyboardImmediately: function km_hideImmediately() {
    if (!this._showingLayoutInfo.layout){
      return;
    }
    this.inputFrameManager.hideInputWindowImmediately(
      this._showingLayoutInfo.layout.manifestURL,
      this._showingLayoutInfo.layout.id
    );
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
    var oldLayout = showed.layout;

    this._waitForSwitchTimeout(function keyboardSwitchLayout() {
      if (!this.inputLayouts.layouts[showed.group]) {
        showed.group = 'text';
      }
      var length = this.inputLayouts.layouts[showed.group].length;
      var index = (showed.index + 1) % length;
      this.inputLayouts.layouts[showed.group].activeLayout = index;

      var nextLayout = this.inputLayouts.layouts[showed.group][index];

      var hideOldKeyboard;
      // Only resetShowingKeyboard() if the running layout is not the same app
      // to prevent flash of black when switching.
      if (oldLayout.manifestURL !== nextLayout.manifestURL) {
        this._resetShowingKeyboard();

        hideOldKeyboard = function (){
          this.inputFrameManager.hideInputWindowImmediately(
            oldLayout.manifestURL,
            oldLayout.id
          );
        }.bind(this);          
      }

      this._setKeyboardToShow(
        showed.group, index, false, true, hideOldKeyboard
      );
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

      this.hideKeyboard();

      var menu = new ImeMenu(items, actionMenuTitle,
        this._imeMenuCallback.bind(this, showedGroup),
        this._imeMenuCallback.bind(this, showedGroup));

      menu.start();

    }.bind(this));
  }
};

if (window.applications.ready) {
  KeyboardManager.init();
} else {
  window.addEventListener('applicationready', function mozAppsReady(event) {
    window.removeEventListener('applicationready', mozAppsReady);
    KeyboardManager.init();
  });
}
