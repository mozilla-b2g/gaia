'use strict';

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
  keyboardFrameContainer: null,

  // this info keeps the current keyboard layout's information,
  // including its group, its index in the group array in InputLayouts.layouts,
  // its occupying height and its "layout" as kept in InputLayouts.layouts
  showingLayoutInfo: {
    group: 'text',
    index: 0,
    layout: null,
    height: 0
  },

  switchChangeTimeout: 0,
  _onDebug: false,
  _debug: function km_debug(msg) {
    if (this._onDebug)
      console.log('[Keyboard Manager] ' + msg);
  },
  hasActiveKeyboard: false,
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

    this.keyboardFrameContainer = document.getElementById('keyboards');

    this.imeSwitcher = new IMESwitcher();
    this.imeSwitcher.ontap = this.showImeMenu.bind(this);
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

    // To handle keyboard layout switching
    window.addEventListener('mozChromeEvent', this);

    this.transitionManager = new InputAppsTransitionManager();
    this.transitionManager.onstatechange =
      this.onTransitionStateChange.bind(this);
    this.transitionManager.start();

    this.inputFrameManager = new InputFrameManager(this);
    this.inputFrameManager.start();

    this.inputLayouts = new InputLayouts(this, TYPE_GROUP_MAPPING);
    this.inputLayouts.start();

    // get enabled keyboard from mozSettings, parse their manifest
    LazyLoader.load([
      'shared/js/keyboard_helper.js'
    ], function() {
      KeyboardHelper.watchLayouts(
        { enabled: true }, this.updateLayouts.bind(this)
      );
    }.bind(this));
  },

  getHeight: function kn_getHeight() {
    return this.transitionManager.occupyingHeight;
  },

  tryLaunchOnBoot: function km_launchOnBoot() {
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
      if (typeof launchOnBoot !== 'boolean')
        launchOnBoot = true;

      // if there are still no keyboards running at this point -
      // set text to show, but don't bring it to the foreground.
      if (launchOnBoot &&
          !Object.keys(this.inputFrameManager.runningLayouts).length) {
        this.setKeyboardToShow('text', undefined, true);
      }
    }).bind(this);
  },

  updateLayouts: function km_updateLayouts(layouts) {
    var enabledApps = this.inputLayouts.processLayouts(layouts);

    // Remove apps that are no longer enabled to clean up.
    Object.keys(this.inputFrameManager.runningLayouts).forEach(
      function removeApp(manifestURL) {
      if (!enabledApps.has(manifestURL)) {
        this.removeKeyboard(manifestURL);
      }
    }, this);

    this.tryLaunchOnBoot();
  },

  resizeKeyboard: function km_resizeKeyboard(evt) {
    // Ignore mozbrowserresize event while keyboard Frame is transitioning out.
    var transitionState = this.transitionManager.currentState;
    if (transitionState === this.transitionManager.STATE_TRANSITION_OUT) {
      return;
    }

    var height = evt.detail.height;

    this._debug('resizeKeyboard: ' + height);
    this.showingLayoutInfo.height = height;
    this.transitionManager.handleResize(height);

    evt.stopPropagation();

    this.showIMESwitcher();
  },

  // Decide the keyboard layout for the specific group and show it
  activateKeyboard: function km_activateKeyboard(group) {
    // if we already have layouts for the group, no need to check default
    if (!this.inputLayouts.layouts[group]) {
      KeyboardHelper.checkDefaults(function changedDefaults() {
          KeyboardHelper.getLayouts({ enabled: true },
            this.updateLayouts.bind(this));
          KeyboardHelper.saveToSettings();
      }.bind(this));
    }
    // if there are still no keyboards to use, use text
    if (!this.inputLayouts.layouts[group]) {
      group = 'text';
    }

      var previousLayout = this.showingLayoutInfo.layout;

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

      this.setKeyboardToShow(group, currentActiveLayoutIdx);

    // We need to reset the previous frame only when we switch to a new frame
    // this "frame" is decided by layout properties
    if (previousLayout &&
        (previousLayout.manifestURL !==
         this.showingLayoutInfo.layout.manifestURL ||
         previousLayout.id !== this.showingLayoutInfo.layout.id)
       ) {
      this._debug('reset previousFrame.');
      this.inputFrameManager.resetFrame(previousLayout);
    }
  },

  inputFocusChange: function km_inputFocusChange(evt) {
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
      this.activateKeyboard(group);
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
      case 'mozbrowsererror': // OOM
        this.removeKeyboard(evt.target.dataset.frameManifestURL, true);
        break;
      case 'mozmemorypressure':
        // Memory pressure event. If a keyboard is loaded but not opened,
        // get rid of it.
        // We only do that when we don't run keyboards OOP.
        this._debug('mozmemorypressure event');
        if (!this.isOutOfProcessEnabled && !this.hasActiveKeyboard) {
          Object.keys(this.inputFrameManager.runningLayouts)
                .forEach(this.removeKeyboard, this);
          this.inputFrameManager.runningLayouts = {};
          this._debug('mozmemorypressure event; keyboard removed');
        }
        break;
      case 'lockscreen-appopened':
        /* falls through */
      case 'sheets-gesture-begin':
        if (this.hasActiveKeyboard) {
          // Instead of hideKeyboard(), we should removeFocus() here.
          // (and, removing the focus cause Gecko to ask us to hideKeyboard())
          navigator.mozInputMethod.removeFocus();
        }
        break;
      case 'mozChromeEvent':
        switch (evt.detail.type) {
          case 'inputmethod-showall':
            this.showImeMenu();
            break;
          case 'inputmethod-next':
            this.switchToNext();
            break;
          case 'inputmethod-contextchange':
            this.inputFocusChange(evt);
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

    if (this.showingLayoutInfo.layout &&
      this.showingLayoutInfo.layout.manifestURL === manifestURL) {
      revokeShowedGroup = this.showingLayoutInfo.group;
      this.hideKeyboard();
    }

    this.inputFrameManager.removeKeyboard(manifestURL);

    this.resetShowingLayoutInfo();

    if (handleOOM && revokeShowedGroup !== null) {
      this.setKeyboardToShow(revokeShowedGroup);
    }
  },

  setKeyboardToShow: function km_setKeyboardToShow(group, index, launchOnly) {
    if (!this.inputLayouts.layouts[group]) {
      console.warn('trying to set a layout group to show that doesnt exist');
      return;
    }
    if (undefined === index) {
      index = this.inputLayouts.layouts[group].activeLayout;
    }
    this._debug('set layout to display: group=' + group + ' index=' + index);
    var layout = this.inputLayouts.layouts[group][index];
    this.inputFrameManager.launchFrame(layout, launchOnly);
    this.setShowingLayoutInfo(group, index, layout);

    this.inputLayouts.setGroupsActiveLayout(layout);

    // By setting launchOnly to true, we load the keyboard frame w/o bringing it
    // to the backgorund; this is convenient to call
    // setKeyboardToShow() and call resetShowingKeyboard() in one atcion.
    if (launchOnly) {
      this.resetShowingKeyboard();
      return;
    }

    this.inputLayouts.layouts[group].activeLayout = index;
    KeyboardHelper.saveCurrentActiveLayout(group,
      layout.id, layout.manifestURL);

    // Make sure we are not in the transition out state
    // while user foucus quickly again.
    if (this.transitionManager.currentState ===
        this.transitionManager.STATE_TRANSITION_OUT) {
      this.transitionManager.handleResize(this.showingLayoutInfo.height);
    }

    this.inputFrameManager.setupFrame(layout);
  },

  /**
   * A half-permanent notification should display after the keyboard got
   * activated, and only hides after the keyboard got deactivated.
   */
  showIMESwitcher: function km_showIMESwitcher() {
    var showed = this.showingLayoutInfo;
    if (!this.inputLayouts.layouts[showed.group]) {
      return;
    }

    // Need to make the message in spec: "FirefoxOS - English"...
    var current = this.inputLayouts.layouts[showed.group][showed.index];

    this.imeSwitcher.show(current.appName, current.name);
  },

  // Reset the current keyboard frame
  resetShowingKeyboard: function km_resetShowingKeyboard() {
    this._debug('resetShowingKeyboard');

    this.inputFrameManager.resetFrame(this.showingLayoutInfo.layout);

    this.resetShowingLayoutInfo();
  },

  hideKeyboard: function km_hideKeyboard() {
    // prevent hidekeyboard trigger again while 'appwillclose' is fired.
    var transitionState = this.transitionManager.currentState;
    if ((transitionState === this.transitionManager.STATE_HIDDEN) ||
        (transitionState === this.transitionManager.STATE_TRANSITION_OUT)) {
      // Bug 963377. Also reset yet-to-show keyboards.
      this.resetShowingKeyboard();
      return;
    }

    this.transitionManager.hide();
  },

  onTransitionStateChange: function km_onTransitionStateChange() {
    if (this.transitionManager.currentState ===
        this.transitionManager.STATE_HIDDEN) {
      this.resetShowingKeyboard();
    }
  },

  hideKeyboardImmediately: function km_hideImmediately() {
    this.transitionManager.hideImmediately();
  },

  setHasActiveKeyboard: function km_setHasActiveKeyboard(active) {
    this.hasActiveKeyboard = active;
  },

  resetShowingLayoutInfo: function km_resetShowingLayoutInfo() {
    this.showingLayoutInfo.group = 'text';
    this.showingLayoutInfo.index = 0;
    this.showingLayoutInfo.layout = null;
  },

  setShowingLayoutInfo: function km_setShowingLayoutInfo(group, index, layout) {
    this.showingLayoutInfo.group = group;
    this.showingLayoutInfo.index = index;
    this.showingLayoutInfo.layout = layout;
  },

  /* A small helper function for maintaining timeouts */
  waitForSwitchTimeout: function km_waitForSwitchTimeout(callback) {
    clearTimeout(this.switchChangeTimeout);

    this.switchChangeTimeout = setTimeout(callback, SWITCH_CHANGE_DELAY);
  },

  switchToNext: function km_switchToNext() {
    var showed = this.showingLayoutInfo;
    var oldLayout = showed.layout;

    this.waitForSwitchTimeout(function keyboardSwitchLayout() {
      if (!this.inputLayouts.layouts[showed.group]) {
        showed.group = 'text';
      }
      var length = this.inputLayouts.layouts[showed.group].length;
      var index = (showed.index + 1) % length;
      this.inputLayouts.layouts[showed.group].activeLayout = index;

      var nextLayout = this.inputLayouts.layouts[showed.group][index];

      // Only resetShowingKeyboard() if the running layout is not the same app
      // to prevent flash of black when switching.
      if (oldLayout.manifestURL !== nextLayout.manifestURL) {
        this.resetShowingKeyboard();
      }

      this.setKeyboardToShow(showed.group, index);
    }.bind(this));
  },

  /*
   * Callback for ImeMenu.
   * If selectedIndex is defined, then some item of imeMenu was selected;
   * if it's not, then it was canceled.
   * The showedGroup param is bind()'ed by showImeMenu
   * (resulting in a partial func)
   */
  imeMenuCallback: function km_imeMenuCallback(showedGroup, selectedIndex) {
    if (typeof selectedIndex === 'number') {
      // success: show the new keyboard
      this.inputLayouts.layouts[showedGroup].activeLayout = selectedIndex;
      this.setKeyboardToShow(showedGroup, selectedIndex);

      // Hide the tray to show the app directly after user selected a new kb.
      window.dispatchEvent(new CustomEvent('keyboardchanged'));
    } else {
      // cancel: mimic the success callback to show the current keyboard.
      this.setKeyboardToShow(showedGroup);

      // Hide the tray to show the app directly after user canceled.
      window.dispatchEvent(new CustomEvent('keyboardchangecanceled'));
    }
  },

  // Show the input method menu
  showImeMenu: function km_showImeMenu() {
    var showedGroup = this.showingLayoutInfo.group;
    var activeLayout = this.inputLayouts.layouts[showedGroup].activeLayout;
    var actionMenuTitle = navigator.mozL10n.get('choose-option');

    this.waitForSwitchTimeout(function listLayouts() {
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
        this.imeMenuCallback.bind(this, showedGroup),
        this.imeMenuCallback.bind(this, showedGroup));

      menu.start();

    }.bind(this));
  }
};

if (applications.ready) {
  KeyboardManager.init();
} else {
  window.addEventListener('applicationready', function mozAppsReady(event) {
    window.removeEventListener('applicationready', mozAppsReady);
    KeyboardManager.init();
  });
}
