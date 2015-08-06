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

// How long to wait for more focuschange events before processing
const BLUR_CHANGE_DELAY = 100;
const SWITCH_CHANGE_DELAY = 20;

var KeyboardManager = {
  inputTypeTable: {},
  keyboardFrameContainer: null,

  /**
   *
   * The set of installed keyboard layouts grouped by type_group.
   * This is a map from type_group to an object arrays.
   *
   * i.e:
   * {
   *   text: [ {...}, {...} ],
   *   number: [ {...}, {...} ]
   * }
   *
   * Each element in the arrays represents a keyboard layout:
   * {
   *    id: the unique id of the keyboard, the key of inputs
   *    name: the keyboard layout's name
   *    appName: the keyboard app name
   *    manifestURL: the keyboard's manifestURL
   *    path: the keyboard's launch path
   * }
   *
   * Additionally, each array has an |activeLayout|, which is the index, in that
   * array, of the the currently-activated layout of the group.
   */
  keyboardLayouts: {},

  /*
   * This is the reverse mapping from layout (manifestURL+id) to
   * an array of {group: , index: }, indicating the groups that are supported
   * by the layout.
   * index is the index of the layout in the group in keyboardLayouts.
   */
  layoutToGroupMapping: {},

  // this info keeps the current keyboard layout's information,
  // including its type, its index in the type array,
  // its occupying height and its "layout" as kept in "keyboardLayouts"
  showingLayoutInfo: {
    type: 'text',
    index: 0,
    layout: null,
    height: 0
  },

  focusChangeTimeout: 0,
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
    // generate typeTable
    this.inputTypeTable =
    Object.keys(TYPE_GROUP_MAPPING).reduce(function(res, curr) {
      var k = TYPE_GROUP_MAPPING[curr];
      res[k] = res[k] || [];
      res[k].push(curr);
      return res;
    }, {});

    // 3rd-party keyboard apps must be run out-of-process.
    SettingsCache.observe('keyboard.3rd-party-app.enabled', true,
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
    this.imeSwitcher.ontap = this.showAll.bind(this);
    this.imeSwitcher.start();

    // get enabled keyboard from mozSettings, parse their manifest

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
    window.addEventListener('mozChromeEvent', function(evt) {
      var type = evt.detail.type;
      switch (type) {
        case 'inputmethod-showall':
          this.showAll();
          break;
        case 'inputmethod-next':
          this.switchToNext();
          break;
        case 'inputmethod-contextchange':
          this.inputFocusChange(evt);
          break;
      }
    }.bind(this));

    this.transitionManager = new InputAppsTransitionManager();
    this.transitionManager.onstatechange = (function statechanged() {
      if (this.transitionManager.currentState ===
          this.transitionManager.STATE_HIDDEN) {
        this.resetShowingKeyboard();
      }
    }).bind(this);
    this.transitionManager.start();

    this.inputFrameManager = new InputFrameManager(this);
    this.inputFrameManager.start();

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

  updateLayouts: function km_updateLayouts(layouts) {
    var enabledApps = new Set();

    // tiny helper - bound to the manifests
    function getName() {
      return this.name;
    }

    function transformLayout(layout) {
      var transformedLayout = {
        id: layout.layoutId,
        origin: layout.app.origin,
        manifestURL: layout.app.manifestURL,
        path: layout.inputManifest.launch_path
      };

      // define properties for name that resolve at display time
      // to the correct language via the ManifestHelper
      Object.defineProperties(transformedLayout, {
        name: {
          get: getName.bind(layout.inputManifest),
          enumerable: true
        },
        appName: {
          get: getName.bind(layout.manifest),
          enumerable: true
        }
      });

      return transformedLayout;
    }

    function insertLayout(object, type, layout) {
      if (!object[type]) {
        object[type] = [];
        object[type].activeLayout = 0;
      }

      object[type].push(layout);
    }

    function reduceLayouts(carry, layout) {
      enabledApps.add(layout.app.manifestURL);
      // add the layout to each type and return the carry
      layout.inputManifest.types.filter(KeyboardHelper.isKeyboardType)
        .forEach(function(type) {
          insertLayout(carry, type, transformLayout(layout));
        });

      return carry;
    }

    this.keyboardLayouts = layouts.reduce(reduceLayouts, {});

    // bug 1035117:
    // at this moment, if the 'fallback' groups (managed by KeyboardHelper)
    // doesn't have any layouts, inject the fallback layout into it.
    // (for example, user enables only CJKV IMEs, and for 'password'
    //  we need to enable 'en')
    for (var group in KeyboardHelper.fallbackLayouts) {
      if (!(group in this.keyboardLayouts)) {
        var layout = KeyboardHelper.fallbackLayouts[group];

        enabledApps.add(layout.app.manifestURL);
        insertLayout(this.keyboardLayouts, group, transformLayout(layout));
      }
    }

    for (var group in this.keyboardLayouts) {
      this.keyboardLayouts[group].forEach(function(layout, index) {
        var key = layout.manifestURL + '/' + layout.id;
        this.layoutToGroupMapping[key] = this.layoutToGroupMapping[key] || [];
        this.layoutToGroupMapping[key].push({
          group: group,
          index: index
        });
      }, this);
    }

    // Let chrome know about how many keyboards we have
    // need to expose all input type from inputTypeTable
    var countLayouts = {};
    Object.keys(this.keyboardLayouts).forEach(function(k) {
      var typeTable = this.inputTypeTable[k];
      for (var i in typeTable) {
        var inputType = typeTable[i];
        countLayouts[inputType] = this.keyboardLayouts[k].length;
      }
    }, this);

    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('mozContentEvent', true, true, {
      type: 'inputmethod-update-layouts',
      layouts: countLayouts
    });
    window.dispatchEvent(event);

    // Remove apps that are no longer enabled to clean up.
    Object.keys(this.inputFrameManager.runningLayouts).forEach(
      function removeApp(manifestURL) {
      if (!enabledApps.has(manifestURL)) {
        this.removeKeyboard(manifestURL);
      }
    }, this);

    if (Object.keys(this.inputFrameManager.runningLayouts).length) {
      // There are already keyboard(s) being launched. We don't really care
      // if a default keyboard should be launch-on-boot.
      return;
    }

    SettingsCache.get('keyboard.launch-on-boot', (function(value) {
      // If the value is not set or it is set to true,
      // launch the keyboad in background
      var launchOnBoot = value;
      if (typeof launchOnBoot !== 'boolean')
          launchOnBoot = true;

      // if there are still no keyboards running at this point -
      // set text to show, but don't bring it to the foreground.
      if (launchOnBoot &&
          !Object.keys(this.inputFrameManager.runningLayouts).length) {
        this.setKeyboardToShow('text', undefined, true);
      }
    }).bind(this));
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

  inputFocusChange: function km_inputFocusChange(evt) {
    var type = evt.detail.inputType;

    // Skip the <select> element and inputs with type of date/time,
    // handled in system app for now
    if (!type || type in IGNORED_INPUT_TYPES) {
      return this.hideKeyboard();
    }

    var self = this;
    // Before a new focus event we get a blur event
    // So if that's the case, wait a bit and see if a focus comes in
    clearTimeout(this.focusChangeTimeout);

    // Set one of the keyboard layout for the specific group as active.
    function activateKeyboard() {
      // if we already have layouts for the group, no need to check default
      if (!self.keyboardLayouts[group]) {
        KeyboardHelper.checkDefaults(function changedDefaults() {
            KeyboardHelper.getLayouts({ enabled: true },
              self.updateLayouts.bind(self));
            KeyboardHelper.saveToSettings();
        });
      }
      // if there are still no keyboards to use
      if (!self.keyboardLayouts[group]) {
        group = 'text';
      }

      var previousLayout = self.showingLayoutInfo.layout;
      self.setKeyboardToShow(group);

      // We need to reset the previous frame nly when we switch to a new frame
      // this "frame" is decided by layout properties
      if (previousLayout &&
          (previousLayout.manifestURL !==
           self.showingLayoutInfo.layout.manifestURL ||
           previousLayout.id !== self.showingLayoutInfo.layout.id)
         ) {
        self._debug('reset previousFrame.');
        self.inputFrameManager.resetFrame(previousLayout);
      }
    }

    if (type === 'blur') {
      this.focusChangeTimeout = setTimeout(function keyboardFocusChanged() {
        self._debug('get blur event');
        self.hideKeyboard();
        self.imeSwitcher.hide();
      }, BLUR_CHANGE_DELAY);
    }
    else {
      var group = TYPE_GROUP_MAPPING[type];
      self._debug('get focus event ' + type);
      // by the order in Settings app, we should display
      // if target group (input type) does not exist, use text for default
      if (!self.keyboardLayouts[group]) {
        // ensure the helper has apps and settings data first:
        KeyboardHelper.getLayouts(activateKeyboard);
      } else {
        activateKeyboard();
      }
    }
  },

  handleEvent: function km_handleEvent(evt) {
    var self = this;
    switch (evt.type) {
      case 'attentionrequestopen':
      case 'attentionrecovering':
      case 'attentionopening':
      case 'attentionclosing':
      case 'attentionopened':
      case 'attentionclosed':
        self.hideKeyboardImmediately();
        break;
      case 'applicationsetupdialogshow':
      case 'activityrequesting':
      case 'activityopening':
      case 'activityclosing':
        this.hideKeyboardImmediately();
        break;
      case 'screenchange':
        if (!evt.detail.screenEnabled && window.lockScreenWindowManager &&
            window.lockScreenWindowManager.states.enabled) {
          navigator.mozInputMethod.removeFocus();
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
        if (!this.isOutOfProcessEnabled && !this.hasActiveKeyboard) {
          Object.keys(this.inputFrameManager.runningLayouts)
                .forEach(this.removeKeyboard, this);
          this.inputFrameManager.runningLayouts = {};
          this._debug('mozmemorypressure event; keyboard removed');
        }
        break;
      case 'lockscreen-appopened':
        navigator.mozInputMethod.removeFocus();
        break;
      case 'sheets-gesture-begin':
        if (this.hasActiveKeyboard) {
          navigator.mozInputMethod.removeFocus();
        }
        break;
    }
  },

  removeKeyboard: function km_removeKeyboard(manifestURL, handleOOM) {
    var revokeShowedType = null;
    if (!this.inputFrameManager.runningLayouts.hasOwnProperty(manifestURL)) {
      return;
    }

    if (this.showingLayoutInfo.layout &&
      this.showingLayoutInfo.layout.manifestURL === manifestURL) {
      revokeShowedType = this.showingLayoutInfo.type;
      this.hideKeyboard();
    }

    this.inputFrameManager.removeKeyboard(manifestURL);

    this.resetShowingLayoutInfo();

    if (handleOOM && revokeShowedType !== null) {
      this.setKeyboardToShow(revokeShowedType);
    }
  },

  setKeyboardToShow: function km_setKeyboardToShow(group, index, launchOnly) {
    if (!this.keyboardLayouts[group]) {
      console.warn('trying to set a layout group to show that doesnt exist');
      return;
    }
    if (index === undefined) {
      index = this.keyboardLayouts[group].activeLayout;
    }
    this._debug('set layout to display: type=' + group + ' index=' + index);
    var layout = this.keyboardLayouts[group][index];
    this.inputFrameManager.launchFrame(layout, launchOnly);
    this.setShowingLayoutInfo(group, index, layout);

    this.layoutToGroupMapping[layout.manifestURL + '/' + layout.id].forEach(
      function(groupInfo) {
      this.keyboardLayouts[groupInfo.group].activeLayout = groupInfo.index;
    }, this);

    // By setting launchOnly to true, we load the keyboard frame w/o bringing it
    // to the backgorund; this is convenient to call
    // setKeyboardToShow() and call resetShowingKeyboard() in one atcion.
    if (launchOnly) {
      this.resetShowingKeyboard();
      return;
    }
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
    if (!this.keyboardLayouts[showed.type]) {
      return;
    }

    // Need to make the message in spec: "FirefoxOS - English"...
    var current = this.keyboardLayouts[showed.type][showed.index];

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

  hideKeyboardImmediately: function km_hideImmediately() {
    this.transitionManager.hideImmediately();
  },

  setHasActiveKeyboard: function km_setHasActiveKeyboard(active) {
    this.hasActiveKeyboard = active;
  },

  resetShowingLayoutInfo: function km_resetShowingLayoutInfo() {
    this.showingLayoutInfo.type = 'text';
    this.showingLayoutInfo.index = 0;
    this.showingLayoutInfo.layout = null;
  },

  setShowingLayoutInfo: function km_setShowingLayoutInfo(type, index, layout) {
    this.showingLayoutInfo.type = type;
    this.showingLayoutInfo.index = index;
    this.showingLayoutInfo.layout = layout;
  },

  switchToNext: function km_switchToNext() {
    clearTimeout(this.switchChangeTimeout);

    var showed = this.showingLayoutInfo;
    var oldLayout = showed.layout;

    this.switchChangeTimeout = setTimeout(function keyboardSwitchLayout() {
      if (!this.keyboardLayouts[showed.type]) {
        showed.type = 'text';
      }
      var length = this.keyboardLayouts[showed.type].length;
      var index = (showed.index + 1) % length;
      this.keyboardLayouts[showed.type].activeLayout = index;

      var nextLayout = this.keyboardLayouts[showed.type][index];
      // Only resetShowingKeyboard() if the running layout is not the same app
      // to prevent flash of black when switching.
      if (oldLayout.manifestURL !== nextLayout.manifestURL) {
        this.resetShowingKeyboard();
      }

      this.setKeyboardToShow(showed.type, index);
    }.bind(this), SWITCH_CHANGE_DELAY);
  },

  // Show the input method menu
  showAll: function km_showAll() {
    clearTimeout(this.switchChangeTimeout);

    var self = this;
    var showedType = this.showingLayoutInfo.type;
    var activeLayout = this.keyboardLayouts[showedType].activeLayout;
    var _ = navigator.mozL10n.get;
    var actionMenuTitle = _('choose-option');

    this.switchChangeTimeout = setTimeout(function keyboardLayoutList() {
      var items = [];
      self.keyboardLayouts[showedType].forEach(function(layout, index) {
        var item = {
          layoutName: layout.name,
          appName: layout.appName,
          value: index,
          selected: (index === activeLayout)
        };
        items.push(item);
      });
      self.hideKeyboard();

      var menu = new ImeMenu(items, actionMenuTitle,
        function(selectedIndex) {
        if (!self.keyboardLayouts[showedType]) {
          showedType = 'text';
        }
        self.keyboardLayouts[showedType].activeLayout = selectedIndex;
        self.setKeyboardToShow(showedType, selectedIndex);

        // Hide the tray to show the app directly after
        // user selected a new keyboard.
        window.dispatchEvent(new CustomEvent('keyboardchanged'));

        // Refresh the switcher, or the labled type and layout name
        // won't change.
      }, function() {
        if (!self.keyboardLayouts[showedType]) {
          showedType = 'text';
        }

        // Mimic the success callback to show the current keyboard
        // when user canceled it.
        self.setKeyboardToShow(showedType);

        // Hide the tray to show the app directly after
        // user canceled.
        window.dispatchEvent(new CustomEvent('keyboardchangecanceled'));
      });
      menu.start();
    }, SWITCH_CHANGE_DELAY);
  }
};
