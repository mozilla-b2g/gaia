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
  keyboardFrameContainer: document.getElementById('keyboards'),

  // The set of installed keyboard layouts grouped by type_group.
  // This is a map from type_group to an object arrays.
  // Each element in the object arrays represents a keyboard layout:
  // {
  //    id: the unique id of the keyboard, the key of entry_point
  //    name: the keyboard layout's name
  //    appName: the keyboard app name
  //    origin: the keyboard's origin
  //    path: the keyboard's launch path
  // }
  keyboardLayouts: {},

  // The set of running keyboards.
  // This is a map from keyboard origin to an object like this:
  // 'keyboard.gaiamobile.org' : {
  //   'English': aIframe
  // }
  inputTypeTable: {},
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

  init: function km_init() {
    var self = this;

    this.notifIMEContainer =
            document.getElementById('keyboard-show-ime-list');

    this.fakenoti = this.notifIMEContainer.querySelector('.fake-notification');
    this.fakenotiMessage = this.fakenoti.querySelector('.message');
    this.fakenotiTip = this.fakenoti.querySelector('.tip');

    this.fakenoti.addEventListener('mousedown', function km_fakenotiAct(evt) {
        evt.preventDefault();
        self.showAll();
    });

    this.keyboardFrameContainer.classList.add('hide');

    // get enabled keyboard from mozSettings, parse their manifest

    // For Bug 812115: hide the keyboard when the app is closed here,
    // since it would take a longer round-trip to receive focuschange
    // Also in Bug 856692 we realise that we need to close the keyboard
    // when an inline activity goes away.
    window.addEventListener('appwillclose', this);
    window.addEventListener('activitywillclose', this);
    window.addEventListener('applicationinstallsuccess', this);
    window.addEventListener('applicationuninstall', this);
    window.addEventListener('keyboardsrefresh', this);

    // To handle keyboard layout switching
    window.addEventListener('mozChromeEvent', function(evt) {
      var type = evt.detail.type;
      switch (type) {
        case 'inputmethod-showall':
          self.showAll();
          break;
        case 'inputmethod-next':
          self.switchToNext();
          break;
        case 'inputmethod-contextchange':
          self.inputFocusChange(evt);
          break;
      }
    });

    window.addEventListener('localized', function(evt) {
      self.updateLayouts(evt);
    });

    // generate typeTable
    this.inputTypeTable =
    Object.keys(TYPE_GROUP_MAPPING).reduce(function(res, curr) {
      var k = TYPE_GROUP_MAPPING[curr];
      res[k] = res[k] || [];
      res[k].push(curr);
      return res;
    }, {});
  },

  getHeight: function kn_getHeight() {
    return this.keyboardHeight;
  },

  updateLayouts: function km_updateLayouts(evt) {
    var self = this;
    function resetLayoutList(apps) {
      self.keyboardLayouts = {};
      // filter out disabled layouts
      self.parseLayoutType(apps);
      self.showingLayout.reset();
      var initType = self.showingLayout.type;
      var initIndex = self.showingLayout.index;
      self.launchLayoutFrame(self.keyboardLayouts[initType][initIndex]);

      // Let chrome know about how many keyboards we have
      // need to expose all input type from inputTypeTable
      var layouts = {};
      Object.keys(self.keyboardLayouts).forEach(function(k) {
        var typeTable = self.inputTypeTable[k];
        for (var i in typeTable) {
          var inputType = typeTable[i];
          layouts[inputType] = self.keyboardLayouts[k].length;
        }
      });

      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('mozContentEvent', true, true, {
        type: 'inputmethod-update-layouts',
        layouts: layouts
      });
      window.dispatchEvent(event);
    }
    KeyboardHelper.getInstalledKeyboards(resetLayoutList);
  },

  parseLayoutType: function km_parseLayoutType(apps) {
    var self = this;
    apps.forEach(function(app) {
      var entryPoints = app.manifest.entry_points;
      var manifest = new ManifestHelper(app.manifest);
      for (var key in entryPoints) {
        var entryPoint = new ManifestHelper(entryPoints[key]);
        if (!entryPoint.types) {
          console.warn('the keyboard app did not declare type.');
          continue;
        }
        var appOrigin = app.origin;
        var layoutId = key;

        if (!KeyboardHelper.getLayoutEnabled(appOrigin, layoutId)) {
          continue;
        }

        var supportTypes = entryPoint.types;
        supportTypes.forEach(function(type) {
          if (!type || !(type in BASE_TYPE))
            return;

          if (!self.keyboardLayouts[type])
            self.keyboardLayouts[type] = [];
            self.keyboardLayouts[type].activeLayout = 0;

          self.keyboardLayouts[type].push({
            'id': key,
            'name': entryPoint.name,
            'appName': manifest.name,
            'origin': app.origin,
            'path': entryPoint.launch_path,
            'index': self.keyboardLayouts[type].length
          });
        });
      }
    });
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
      var group = TYPE_GROUP_MAPPING[type];
      var index = self.showingLayout.index;

      if (type === 'blur') {
        self._debug('get blur event');
        self.hideKeyboard();
        self.hideIMESwitcher();
      } else {
        self._debug('get focus event');
        // by the order in Settings app, we should display
        // if target group (input type) does not exist, use text for default
        if (!self.keyboardLayouts[group])
          group = 'text';
        self.setKeyboardToShow(group, self.keyboardLayouts[group].activeLayout);
        self.showKeyboard();

        // We also want to show the permanent notification
        // in the UtilityTray.
        self.showIMESwitcher();
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
    keyboard.setAttribute('mozbrowser', 'true');
    keyboard.setAttribute('mozpasspointerevents', 'true');
    keyboard.setAttribute('mozapp', manifestURL);
    //keyboard.setAttribute('remote', 'true');

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
      self.keyboardFrameContainer.removeEventListener(
        'transitionend', updateHeight);
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

    if (this.keyboardFrameContainer.classList.contains('hide')) {
      this.showKeyboard();
      this.keyboardFrameContainer.addEventListener(
        'transitionend', updateHeight);
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
      //XXX the following three cases haven't been tested.
      case 'mozbrowsererror': // OOM
        var origin = evt.target.dataset.frameOrigin;
        this.removeKeyboard(origin);
        break;
      case 'applicationinstallsuccess': //app installed
        this.updateLayoutSettings();
        break;
      case 'applicationuninstall': //app uninstalled
        var origin = evt.detail.application.origin;
        this.removeKeyboard(origin);
        this.updateLayoutSettings();
        break;
      case 'keyboardsrefresh': // keyboard settings update
        this.updateLayouts();
        break;
    }
  },

  removeKeyboard: function km_removeKeyboard(origin) {
    if (!this.runningLayouts.hasOwnProperty(origin))
      return;

    if (this.showingLayout.frame.dataset.frameOrigin === origin) {
      this.hideKeyboard();
    }

    for (var id in this.runningLayouts[origin]) {
      var frame = this.runningLayouts[origin][id];
      windows.removeChild(frame);
      delete this.runningLayouts[origin][id];
    }

    delete this.runningLayouts[origin];
  },

  updateLayoutSettings: function km_updateLayoutSettings() {
    //KeyboardHelper.updateKeyboardSettings();
    var temSettings = KeyboardHelper.keyboardSettings;
    KeyboardHelper.getInstalledKeyboards(function(apps) {
      KeyboardHelper.keyboardSettings = [];
      apps.forEach(function(app) {
        var entryPoints = app.manifest.entry_points;
        for (var key in entryPoints) {
          var launchPath = entryPoints[key].launch_path;
          if (!entryPoints[key].types) {
            console.warn('the keyboard app did not declare type.');
            continue;
          }
          // for settings
          KeyboardHelper.keyboardSettings.push({
            layoutId: key,
            appOrigin: app.origin,
            enabled: false
          });
        }
      });

      for (var i in temSettings) {
        if (!temSettings[i].enabled)
          continue;
        var layoutId = temSettings[i].layoutId;
        var layoutOrigin = temSettings[i].appOrigin;
        for (var j in KeyboardHelper.keyboardSettings) {
          if (KeyboardHelper.keyboardSettings[j].layoutId === layoutId &&
            KeyboardHelper.keyboardSettings[j].appOrigin === layoutOrigin) {
            KeyboardHelper.keyboardSettings[j].enabled = true;
          }
        }
      }
      KeyboardHelper.saveToSettings();
    });
  },

  setKeyboardToShow: function km_setKeyboardToShow(group, index) {
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

  showKeyboard: function km_showKeyboard() {
    this.keyboardFrameContainer.classList.remove('hide');

    // XXX Keyboard transition may be affected by window.open event,
    // and thus the keyboard looks like jump into screen.
    // It may because window.open blocks main thread?
    // Monitor transitionend time here.
    var self = this;
    var onTransitionEnd = function km_onTransitionEnd() {
      self.keyboardFrameContainer.removeEventListener('transitionend',
          onTransitionEnd);
      self._debug('keyboard display transitionend');
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
    var _ = navigator.mozL10n.get;

    window.dispatchEvent(new CustomEvent('keyboardimeswitchershow'));

    // Need to make the message in spec: "FirefoxOS - English"...
    var showed = this.showingLayout;
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
      var length = self.keyboardLayouts[showed.type].length;
      var index = (showed.index + 1) % length;
      if (!self.keyboardLayouts[showed.type])
        showed.type = 'text';
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
        var activeLayout = self.keyboardLayouts[showed.type].activeLayout;
        self.setKeyboardToShow(showed.type, activeLayout);
        self.showKeyboard();

        // Hide the tray to show the app directly after
        // user canceled.
        window.dispatchEvent(new CustomEvent('keyboardchangecanceled'));
      });
    }, FOCUS_CHANGE_DELAY);
  },

  setLayoutFrameActive: function km_setLayoutFrameActive(frame, active) {
    frame.setVisible(active);
    if (frame.setInputMethodActive) {
      frame.setInputMethodActive(active);
    }
  }
};

if (Applications.ready) {
  KeyboardManager.init();
  LazyLoader.load('shared/js/keyboard_helper.js');
} else {
  window.addEventListener('applicationready', function mozAppsReady(event) {
    window.removeEventListener('applicationready', mozAppsReady);
    KeyboardManager.init();
    LazyLoader.load('shared/js/keyboard_helper.js');
  });
}
