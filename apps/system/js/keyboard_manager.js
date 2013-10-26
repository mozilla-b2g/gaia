'use strict';

// If we get a focuschange event from mozKeyboard for an element with
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
const FOCUS_CHANGE_DELAY = 20;

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
   *    id: the unique id of the keyboard, the key of entry_point
   *    name: the keyboard layout's name
   *    appName: the keyboard app name
   *    origin: the keyboard's origin
   *    path: the keyboard's launch path
   * }
   */
  keyboardLayouts: {},

  // The set of running keyboards.
  // This is a map from keyboard origin to an object like this:
  // 'keyboard.gaiamobile.org' : {
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
    }
  },

  focusChangeTimeout: 0,
  switchChangeTimeout: 0,
  _onDebug: false,
  _debug: function km_debug(msg) {
    if (this._onDebug)
      console.log('[Keyboard Manager] ' + msg);
  },
  keyboardHeight: 0,
  isOutOfProcessEnabled: false,

  init: function km_init() {
    // generate typeTable
    this.inputTypeTable =
    Object.keys(TYPE_GROUP_MAPPING).reduce(function(res, curr) {
      var k = TYPE_GROUP_MAPPING[curr];
      res[k] = res[k] || [];
      res[k].push(curr);
      return res;
    }, {});

    SettingsListener.observe('debug.keyboard-oop.enabled', false,
      function(value) {
        this.isOutOfProcessEnabled = value;
      }.bind(this));

    this.keyboardFrameContainer = document.getElementById('keyboards');

    this.notifIMEContainer =
            document.getElementById('keyboard-show-ime-list');

    this.fakenoti = this.notifIMEContainer.querySelector('.fake-notification');
    this.fakenotiMessage = this.fakenoti.querySelector('.message');
    this.fakenotiTip = this.fakenoti.querySelector('.tip');

    this.fakenoti.addEventListener('mousedown', function km_fakenotiAct(evt) {
        evt.preventDefault();
        this.showAll();
    }.bind(this));

    this.keyboardFrameContainer.classList.add('hide');

    // get enabled keyboard from mozSettings, parse their manifest

    // For Bug 812115: hide the keyboard when the app is closed here,
    // since it would take a longer round-trip to receive focuschange
    // Also in Bug 856692 we realise that we need to close the keyboard
    // when an inline activity goes away.
    window.addEventListener('appwillclose', this);
    window.addEventListener('activitywillclose', this);

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

    LazyLoader.load([
      'shared/js/keyboard_helper.js'
    ], function() {
      KeyboardHelper.watchLayouts(
        { enabled: true }, this.updateLayouts.bind(this)
      );
    }.bind(this));
  },

  getHeight: function kn_getHeight() {
    return this.keyboardHeight;
  },

  updateLayouts: function km_updateLayouts(layouts) {
    var enabledApps = new Set();

    // tiny helper - bound to the manifests
    function getName() {
      return this.name;
    }

    function reduceLayouts(carry, layout) {
      enabledApps.add(layout.app.origin);
      // add the layout to each type and return the carry
      layout.entryPoint.types.filter(KeyboardHelper.isKeyboardType)
        .forEach(function(type) {
          if (!carry[type]) {
            carry[type] = [];
            carry[type].activeLayout = 0;
          }
          var enabledLayout = {
            id: layout.layoutId,
            origin: layout.app.origin,
            path: layout.entryPoint.launch_path
          };

          // define properties for name that resolve at display time
          // to the correct language via the ManifestHelper
          Object.defineProperties(enabledLayout, {
            name: {
              get: getName.bind(layout.entryPoint),
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
    Object.keys(this.runningLayouts).forEach(function withRunningApps(origin) {
      if (!enabledApps.has(origin)) {
        this.removeKeyboard(origin);
      }
    }, this);

    // if there are no keyboards running - set text to show
    if (!Object.keys(this.runningLayouts).length) {
      this.setKeyboardToShow('text');
    }
  },

  inputFocusChange: function km_inputFocusChange(evt) {
    var type = evt.detail.inputType;

    // Skip the <select> element and inputs with type of date/time,
    // handled in system app for now
    if (!type || type in IGNORED_INPUT_TYPES)
      return;

    var self = this;
    // We can get multiple focuschange events in rapid succession
    // so wait a bit before responding to see if we get another.
    clearTimeout(this.focusChangeTimeout);
    this.focusChangeTimeout = setTimeout(function keyboardFocusChanged() {
      function showKeyboard() {
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
        self.setKeyboardToShow(group);
        self.showKeyboard();

        // We also want to show the permanent notification
        // in the UtilityTray.
        self.showIMESwitcher();
      }

      var group = TYPE_GROUP_MAPPING[type];
      var index = (self.showingLayout.type === type) ?
        self.showingLayout.index : 0;

      if (type === 'blur') {
        self._debug('get blur event');
        self.hideKeyboard();
        self.hideIMESwitcher();
      } else {
        self._debug('get focus event');
        // by the order in Settings app, we should display
        // if target group (input type) does not exist, use text for default
        if (!self.keyboardLayouts[group]) {
          // ensure the helper has apps and settings data first:
          KeyboardHelper.getLayouts(showKeyboard);
        } else {
          showKeyboard();
        }


      }
    }, FOCUS_CHANGE_DELAY);
  },

  launchLayoutFrame: function km_launchLayoutFrame(layout) {
    if (this.isRunningLayout(layout)) {
      this._debug('this layout is running');
      return this.runningLayouts[layout.origin][layout.id];
    }
    var layoutFrame = null;
    if (this.isRunningKeyboard(layout)) {
      var runningKeybaord = this.runningLayouts[layout.origin];
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
    if (!layoutFrame)
      layoutFrame = this.loadKeyboardLayout(layout);
    // TODO make sure setLayoutFrameActive function is ready
    this.setLayoutFrameActive(layoutFrame, false);
    layoutFrame.hidden = true;
    layoutFrame.dataset.frameName = layout.id;
    layoutFrame.dataset.frameOrigin = layout.origin;
    layoutFrame.dataset.framePath = layout.path;
    if (!(layout.origin in this.runningLayouts))
      this.runningLayouts[layout.origin] = {};

    this.runningLayouts[layout.origin][layout.id] = layoutFrame;
    return layoutFrame;
  },

  isRunningKeyboard: function km_isRunningKeyboard(layout) {
    return this.runningLayouts.hasOwnProperty(layout.origin);
  },

  isRunningLayout: function km_isRunningLayout(layout) {
    if (!this.isRunningKeyboard(layout))
      return false;
    return this.runningLayouts[layout.origin].hasOwnProperty(layout.id);
  },

  loadKeyboardLayout: function km_loadKeyboardLayout(layout) {
    // Generate a <iframe mozbrowser> containing the keyboard.
    var keyboardURL = layout.origin + layout.path;
    var manifestURL = layout.origin + '/manifest.webapp';
    var keyboard = document.createElement('iframe');
    keyboard.src = keyboardURL;
    keyboard.setAttribute('mozapptype', 'inputmethod');
    keyboard.setAttribute('mozbrowser', 'true');
    keyboard.setAttribute('mozpasspointerevents', 'true');
    keyboard.setAttribute('mozapp', manifestURL);

    if (this.isOutOfProcessEnabled) {
      console.log('=== Enable keyboard run as OOP ===');
      keyboard.setAttribute('remote', 'true');
      keyboard.classList.add('ignore-focus');
    }

    this.keyboardFrameContainer.appendChild(keyboard);
    return keyboard;
  },

  resizeKeyboard: function km_resizeKeyboard(evt) {
    this.keyboardHeight = parseInt(evt.detail.height);
    this._debug('resizeKeyboard: ' + this.keyboardHeight);
    if (this.keyboardHeight <= 0)
       return;
    evt.stopPropagation();

    var self = this;
    var updateHeight = function km_updateHeight() {
      self._debug('updateHeight: ' + self.keyboardHeight);
      if (self.keyboardFrameContainer.classList.contains('hide')) {
        // The keyboard has been closed already, let's not resize the
        // application and ends up with half apps.
        return;
      }
      // to do
      var detail = {
        'detail': {
          'height': self.keyboardHeight
        }
      };
      window.dispatchEvent(new CustomEvent('keyboardchange', detail));
    };

    // If the keyboard is hidden, or when transitioning is not finished
    if (this.keyboardFrameContainer.classList.contains('hide') ||
        this.keyboardFrameContainer.dataset.transitionIn === 'true') {
      this.showKeyboard(updateHeight);
    } else {
      updateHeight();
    }
  },

  handleEvent: function km_handleEvent(evt) {
    switch (evt.type) {
      case 'mozbrowserresize':
        this.resizeKeyboard(evt);
        break;
      case 'activitywillclose':
      case 'appwillclose':
        this.hideKeyboard();
        break;
      //XXX the following case hasn't been tested.
      case 'mozbrowsererror': // OOM
        var origin = evt.target.dataset.frameOrigin;
        this.removeKeyboard(origin);
        break;
    }
  },

  removeKeyboard: function km_removeKeyboard(origin) {
    if (!this.runningLayouts.hasOwnProperty(origin)) {
      return;
    }

    if (this.showingLayout.frame &&
      this.showingLayout.frame.dataset.frameOrigin === origin) {
      this.hideKeyboard();
    }

    for (var id in this.runningLayouts[origin]) {
      var frame = this.runningLayouts[origin][id];
      try {
        windows.removeChild(frame);
      } catch (e) {
        // if it doesn't work, noone cares
      }
      delete this.runningLayouts[origin][id];
    }

    delete this.runningLayouts[origin];
  },

  setKeyboardToShow: function km_setKeyboardToShow(group, index) {
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
    this.showingLayout.frame.hidden = false;
    this.setLayoutFrameActive(this.showingLayout.frame, true);
    this.showingLayout.frame.addEventListener(
         'mozbrowserresize', this, true);
  },

  showKeyboard: function km_showKeyboard(callback) {
    // Are we already shown and not currently in a transition? Continue.
    if (!this.keyboardFrameContainer.classList.contains('hide') &&
        this.keyboardFrameContainer.dataset.transitionIn !== 'true') {
      if (callback) {
        callback();
      }
      return;
    }

    this.keyboardFrameContainer.classList.remove('hide');
    this.keyboardFrameContainer.dataset.transitionIn = 'true';

    // XXX Keyboard transition may be affected by window.open event,
    // and thus the keyboard looks like jump into screen.
    // It may because window.open blocks main thread?
    // Monitor transitionend time here.
    var self = this;
    var onTransitionEnd = function(evt) {
      if (evt.propertyName !== 'transform') {
        return;
      }

      self.keyboardFrameContainer.removeEventListener('transitionend',
          onTransitionEnd);

      delete self.keyboardFrameContainer.dataset.transitionIn;
      self._debug('keyboard display transitionend');

      if (callback) {
        callback();
      }
    };
    this.keyboardFrameContainer.addEventListener('transitionend',
        onTransitionEnd);
  },

  /**
   * A half-permanent notification should display after the keyboard got
   * activated, and only hides after the keyboard got deactivated.
   *
   * @this
   */
  showIMESwitcher: function km_showIMESwitcher() {
    var showed = this.showingLayout;
    if (!this.keyboardLayouts[showed.type]) {
      return;
    }

    var _ = navigator.mozL10n.get;

    window.dispatchEvent(new CustomEvent('keyboardimeswitchershow'));

    // Need to make the message in spec: "FirefoxOS - English"...
    var current = this.keyboardLayouts[showed.type][showed.index];

    this.fakenotiMessage.textContent = current.appName + ':' + current.name;
    this.fakenotiTip.textContent = _('ime-switching-tip');

    // Instead of create DOM element dynamically, we can just turn the message
    // on/off and add message as we need. This save the time to create and
    // append element.
    this.fakenoti.classList.add('activated');
  },

  resetShowingKeyboard: function km_resetShowingKeyboard() {
    if (!this.showingLayout.frame) {
      return;
    }
    this.showingLayout.frame.hidden = true;
    this.setLayoutFrameActive(this.showingLayout.frame, false);
    this.showingLayout.frame.removeEventListener(
        'mozbrowserresize', this, true);
    this.showingLayout.reset();
  },

  hideIMESwitcher: function km_hideIMESwitcher() {
    this.fakenoti.classList.remove('activated');
    window.dispatchEvent(new CustomEvent('keyboardimeswitcherhide'));
  },

  hideKeyboard: function km_hideKeyboard() {
    this.resetShowingKeyboard();
    this.keyboardHeight = 0;
    window.dispatchEvent(new CustomEvent('keyboardhide'));
    this.keyboardFrameContainer.classList.add('hide');
  },

  switchToNext: function km_switchToNext() {
    clearTimeout(this.switchChangeTimeout);

    var self = this;
    var showed = this.showingLayout;

    this.switchChangeTimeout = setTimeout(function keyboardSwitchLayout() {
      if (!self.keyboardLayouts[showed.type]) {
        showed.type = 'text';
      }
      var length = self.keyboardLayouts[showed.type].length;
      var index = (showed.index + 1) % length;
      self.keyboardLayouts[showed.type].activeLayout = index;
      self.resetShowingKeyboard();
      self.setKeyboardToShow(showed.type, index);
    }, FOCUS_CHANGE_DELAY);
  },

  showAll: function km_showAll() {
    clearTimeout(this.switchChangeTimeout);

    var self = this;
    var showed = this.showingLayout;
    var activeLayout = this.keyboardLayouts[showed.type].activeLayout;

    this.switchChangeTimeout = setTimeout(function keyboardLayoutList() {
      var items = [];
      self.keyboardLayouts[showed.type].forEach(function(layout, index) {
        var label = layout.appName + ' ' + layout.name;
        var item = {
          label: label,
          value: index
        };
        if (index === activeLayout) {
          item.iconClass = 'tail-icon';
          item.icon = 'style/icons/checkmark.png';
        }
        items.push(item);
      });
      self.hideKeyboard();

      ActionMenu.open(items, 'Layout selection', function(selectedIndex) {
        if (!self.keyboardLayouts[showed.type])
          showed.type = 'text';
        self.keyboardLayouts[showed.type].activeLayout = selectedIndex;
        self.setKeyboardToShow(showed.type, selectedIndex);
        self.showKeyboard();

        // Hide the tray to show the app directly after
        // user selected a new keyboard.
        window.dispatchEvent(new CustomEvent('keyboardchanged'));

        // Refresh the switcher, or the labled type and layout name
        // won't change.
        self.showIMESwitcher();
      }, function() {
        var showed = self.showingLayout;
        if (!self.keyboardLayouts[showed.type])
          showed.type = 'text';

        // Mimic the success callback to show the current keyboard
        // when user canceled it.
        self.setKeyboardToShow(showed.type);
        self.showKeyboard();

        // Hide the tray to show the app directly after
        // user canceled.
        window.dispatchEvent(new CustomEvent('keyboardchangecanceled'));
      });
    }, FOCUS_CHANGE_DELAY);
  },

  setLayoutFrameActive: function km_setLayoutFrameActive(frame, active) {
    if (frame.setVisible) {
      frame.setVisible(active);
    }
    if (frame.setInputMethodActive) {
      frame.setInputMethodActive(active);
    }
  }
};

if (Applications.ready) {
  KeyboardManager.init();
} else {
  window.addEventListener('applicationready', function mozAppsReady(event) {
    window.removeEventListener('applicationready', mozAppsReady);
    KeyboardManager.init();
  });
}
