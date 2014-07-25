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
  'password': 'text',
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
   */
  keyboardLayouts: {},

  // The set of running keyboards.
  // This is a map from keyboard manifestURL to an object like this:
  // 'keyboard.gaiamobile.org/manifest.webapp' : {
  //   'English': aIframe
  // }
  runningLayouts: {},
  showingLayout: {
    frame: null,
    type: 'text',
    index: 0,
    reset: function() {
      this.frame = null;
      this.type = 'text';
      this.index = 0;
    },
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
    this.imeSwitcher.init(this.showAll.bind(this));

    // get enabled keyboard from mozSettings, parse their manifest

    // For Bug 812115: hide the keyboard when the app is closed here,
    // since it would take a longer round-trip to receive focuschange
    // Also in Bug 856692 we realise that we need to close the keyboard
    // when an inline activity goes away.
    window.addEventListener('activityrequesting', this);
    window.addEventListener('activityopening', this);
    window.addEventListener('activityclosing', this);
    window.addEventListener('attentionscreenshow', this);
    window.addEventListener('mozbrowsererror', this);
    window.addEventListener('applicationsetupdialogshow', this);
    window.addEventListener('mozmemorypressure', this);
    window.addEventListener('sheetstransitionstart', this);
    window.addEventListener('lockscreen-appopened', this);

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

    function reduceLayouts(carry, layout) {
      enabledApps.add(layout.app.manifestURL);
      // add the layout to each type and return the carry
      layout.inputManifest.types.filter(KeyboardHelper.isKeyboardType)
        .forEach(function(type) {
          if (!carry[type]) {
            carry[type] = [];
            carry[type].activeLayout = 0;
          }
          var enabledLayout = {
            id: layout.layoutId,
            origin: layout.app.origin,
            manifestURL: layout.app.manifestURL,
            path: layout.inputManifest.launch_path
          };

          // define properties for name that resolve at display time
          // to the correct language via the ManifestHelper
          Object.defineProperties(enabledLayout, {
            name: {
              get: getName.bind(layout.inputManifest),
              enumerable: true
            },
            appName: {
              get: getName.bind(layout.manifest),
              enumerable: true
            }
          });
          carry[type].push(enabledLayout);
        });

      return carry;
    }

    this.keyboardLayouts = layouts.reduce(reduceLayouts, {});

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
    Object.keys(this.runningLayouts).forEach(function removeApp(manifestURL) {
      if (!enabledApps.has(manifestURL)) {
        this.removeKeyboard(manifestURL);
      }
    }, this);

    if (Object.keys(this.runningLayouts).length) {
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
      if (launchOnBoot && !Object.keys(this.runningLayouts).length) {
        this.setKeyboardToShow('text', undefined, true);
      }
    }).bind(this);
  },

  resizeKeyboard: function km_resizeKeyboard(evt) {
    // Ignore mozbrowserresize event while keyboard Frame is transitioning out.
    var transitionState = this.transitionManager.currentState;
    if (transitionState === this.transitionManager.STATE_TRANSITION_OUT) {
      return;
    }

    var height = evt.detail.height;

    this._debug('resizeKeyboard: ' + height);
    this.showingLayout.height = height;
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

      var previousFrame = self.showingLayout.frame;
      self.setKeyboardToShow(group);

      // We need to reset the previous frame nly when we switch to a new frame
      if (previousFrame && previousFrame != self.showingLayout.frame) {
        self._debug('reset previousFrame.');
        self.resetKeyboardFrame(previousFrame);
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

  launchLayoutFrame: function km_launchLayoutFrame(layout) {
    if (this.isRunningLayout(layout)) {
      this._debug('this layout is running');
      return this.runningLayouts[layout.manifestURL][layout.id];
    }

    var layoutFrame = null;
    // The layout is in a keyboard app that has been launched.
    if (this.isRunningKeyboard(layout)) {
      // Re-use the iframe by changing its src.
      var runningKeybaord = this.runningLayouts[layout.manifestURL];
      for (var name in runningKeybaord) {
        var oldPath = runningKeybaord[name].dataset.framePath;
        var newPath = layout.path;
        if (oldPath.substring(0, oldPath.indexOf('#')) ===
            newPath.substring(0, newPath.indexOf('#'))) {
          layoutFrame = runningKeybaord[name];
          layoutFrame.src = layout.origin + newPath;
          this._debug(name + ' is overwritten: ' + layoutFrame.src);
          delete runningKeybaord[name];
          break;
        }
      }
    }

    // Create a new frame to load this new layout.
    if (!layoutFrame) {
      layoutFrame = this.loadKeyboardLayout(layout);
      // TODO make sure setLayoutFrameActive function is ready
      this.setLayoutFrameActive(layoutFrame, false);
      layoutFrame.classList.add('hide');
      layoutFrame.dataset.frameManifestURL = layout.manifestURL;
    }

    layoutFrame.dataset.frameName = layout.id;
    layoutFrame.dataset.framePath = layout.path;

    if (!(layout.manifestURL in this.runningLayouts)) {
      this.runningLayouts[layout.manifestURL] = {};
    }

    this.runningLayouts[layout.manifestURL][layout.id] = layoutFrame;
    return layoutFrame;
  },

  isRunningKeyboard: function km_isRunningKeyboard(layout) {
    return this.runningLayouts.hasOwnProperty(layout.manifestURL);
  },

  isRunningLayout: function km_isRunningLayout(layout) {
    if (!this.isRunningKeyboard(layout))
      return false;
    return this.runningLayouts[layout.manifestURL].hasOwnProperty(layout.id);
  },

  loadKeyboardLayout: function km_loadKeyboardLayout(layout) {
    // Generate a <iframe mozbrowser> containing the keyboard.
    var keyboard = document.createElement('iframe');
    keyboard.src = layout.origin + layout.path;
    keyboard.setAttribute('mozapptype', 'inputmethod');
    keyboard.setAttribute('mozbrowser', 'true');
    keyboard.setAttribute('mozpasspointerevents', 'true');
    keyboard.setAttribute('mozapp', layout.manifestURL);

    var manifest =
      window.applications.getByManifestURL(layout.manifestURL).manifest;
    var isCertifiedApp = (manifest.type === 'certified');

    // oop is always enabled for non-certified app,
    // and optionally enabled to certified apps if
    // available memory is more than 512MB.
    if (this.isOutOfProcessEnabled &&
        (!isCertifiedApp || this.totalMemory >= 512)) {
      console.log('=== Enable keyboard: ' + layout.origin + ' run as OOP ===');
      keyboard.setAttribute('remote', 'true');
      keyboard.setAttribute('ignoreuserfocus', 'true');
    }

    this.keyboardFrameContainer.appendChild(keyboard);
    return keyboard;
  },

  handleEvent: function km_handleEvent(evt) {
    var self = this;
    switch (evt.type) {
      case 'mozbrowserresize':
        this.resizeKeyboard(evt);

        break;
      case 'attentionscreenshow':
        // If we call hideKeyboardImmediately synchronously,
        // attention screen will not show up.
        setTimeout(function hideKeyboardAsync() {
          self.hideKeyboardImmediately();
        }, 0);
        break;
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
          Object.keys(this.runningLayouts).forEach(this.removeKeyboard, this);
          this.runningLayouts = {};
          this._debug('mozmemorypressure event; keyboard removed');
        }
        break;
      case 'lockscreen-appopened':
        /* falls through */
      case 'sheetstransitionstart':
        if (this.hasActiveKeyboard) {
          // Instead of hideKeyboard(), we should removeFocus() here.
          // (and, removing the focus cause Gecko to ask us to hideKeyboard())
          navigator.mozInputMethod.removeFocus();
        }
        break;
    }
  },

  removeKeyboard: function km_removeKeyboard(manifestURL, handleOOM) {
    var revokeShowedType = null;
    if (!this.runningLayouts.hasOwnProperty(manifestURL)) {
      return;
    }

    if (this.showingLayout.frame &&
      this.showingLayout.frame.dataset.frameManifestURL === manifestURL) {
      revokeShowedType = this.showingLayout.type;
      this.hideKeyboard();
    }

    for (var id in this.runningLayouts[manifestURL]) {
      var frame = this.runningLayouts[manifestURL][id];
      try {
        frame.parentNode.removeChild(frame);
      } catch (e) {
        // if it doesn't work, noone cares
      }
      delete this.runningLayouts[manifestURL][id];
    }

    delete this.runningLayouts[manifestURL];

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
    this.showingLayout.type = group;
    this.showingLayout.index = index;
    var layout = this.keyboardLayouts[group][index];
    this.showingLayout.frame = this.launchLayoutFrame(layout);

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
      this.transitionManager.handleResize(this.showingLayout.height);
    }

    this.showingLayout.frame.classList.remove('hide');
    this.setLayoutFrameActive(this.showingLayout.frame, true);
    this.showingLayout.frame.addEventListener(
         'mozbrowserresize', this, true);
  },

  /**
   * A half-permanent notification should display after the keyboard got
   * activated, and only hides after the keyboard got deactivated.
   */
  showIMESwitcher: function km_showIMESwitcher() {
    var showed = this.showingLayout;
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
    if (!this.showingLayout) {
      return;
    }

    this.resetKeyboardFrame(this.showingLayout.frame);
    this.showingLayout.reset();
  },

  // Reset the specified keyboard frame.
  resetKeyboardFrame: function km_resetKeyboardFrame(frame) {
    if (!frame) {
      return;
    }

    frame.classList.add('hide');
    this.setLayoutFrameActive(frame, false);
    frame.removeEventListener('mozbrowserresize', this, true);
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

  switchToNext: function km_switchToNext() {
    clearTimeout(this.switchChangeTimeout);

    var showed = this.showingLayout;

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
      if (showed.frame.dataset.frameManifestURL !==
          nextLayout.manifestURL) {
        this.resetShowingKeyboard();
      }

      this.setKeyboardToShow(showed.type, index);
    }.bind(this), SWITCH_CHANGE_DELAY);
  },

  // Show the input method menu
  showAll: function km_showAll() {
    clearTimeout(this.switchChangeTimeout);

    var self = this;
    var showed = this.showingLayout;
    var activeLayout = this.keyboardLayouts[showed.type].activeLayout;
    var _ = navigator.mozL10n.get;
    var actionMenuTitle = _('choose-option');

    this.switchChangeTimeout = setTimeout(function keyboardLayoutList() {
      var items = [];
      self.keyboardLayouts[showed.type].forEach(function(layout, index) {
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
        if (!self.keyboardLayouts[showed.type])
          showed.type = 'text';
        self.keyboardLayouts[showed.type].activeLayout = selectedIndex;
        self.setKeyboardToShow(showed.type, selectedIndex);

        // Hide the tray to show the app directly after
        // user selected a new keyboard.
        window.dispatchEvent(new CustomEvent('keyboardchanged'));

        // Refresh the switcher, or the labled type and layout name
        // won't change.
      }, function() {
        var showed = self.showingLayout;
        if (!self.keyboardLayouts[showed.type])
          showed.type = 'text';

        // Mimic the success callback to show the current keyboard
        // when user canceled it.
        self.setKeyboardToShow(showed.type);

        // Hide the tray to show the app directly after
        // user canceled.
        window.dispatchEvent(new CustomEvent('keyboardchangecanceled'));
      });
      menu.start();
    }, SWITCH_CHANGE_DELAY);
  },

  setLayoutFrameActive: function km_setLayoutFrameActive(frame, active) {
    this._debug('setLayoutFrameActive: ' +
                frame.dataset.frameManifestURL +
                frame.dataset.framePath + ', active: ' + active);

    if (frame.setVisible) {
      frame.setVisible(active);
    }
    if (frame.setInputMethodActive) {
      frame.setInputMethodActive(active);
    }
    this.hasActiveKeyboard = active;
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
