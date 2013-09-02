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
    this.keyboardFrameContainer.classList.add('hide');

    // get enabled keyboard from mozSettings, parse their manifest
    this.updateLayouts();

    // For Bug 812115: hide the keyboard when the app is closed here,
    // since it would take a longer round-trip to receive focuschange
    // Also in Bug 856692 we realise that we need to close the keyboard
    // when an inline activity goes away.
    window.addEventListener('appwillclose', this);
    window.addEventListener('activitywillclose', this);
    window.addEventListener('applicationinstall', this);
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

    // XXX: Bug 906096, need to remove this when the IME WebAPI is ready
    //      on Firefox Nightly
    if (navigator.mozKeyboard) {
      navigator.mozKeyboard.onfocuschange = function onfocuschange(evt) {
        evt.detail.inputType = evt.detail.type;
        self.inputFocusChange(evt);
      };
    }
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
    }
    KeyboardHelper.getInstalledKeyboards(resetLayoutList);
  },

  parseLayoutType: function km_parseLayoutType(apps) {
    var self = this;
    apps.forEach(function(app) {
      var entryPoints = app.manifest.entry_points;
      for (var key in entryPoints) {
        if (!entryPoints[key].types) {
          console.warn('the keyboard app did not declare type.');
          continue;
        }
        var appOrigin = app.origin;
        var layoutId = key;

        if (!KeyboardHelper.getLayoutEnabled(appOrigin, layoutId)) {
          continue;
        }

        var supportTypes = entryPoints[key].types;
        supportTypes.forEach(function(type) {
          if (!type || !(type in BASE_TYPE))
            return;

          if (!self.keyboardLayouts[type])
            self.keyboardLayouts[type] = [];
            self.keyboardLayouts[type].activit = 0;

          self.keyboardLayouts[type].push({
            'id': key,
            'name': entryPoints[key].name,
            'appName': app.manifest.name,
            'origin': app.origin,
            'path': entryPoints[key].launch_path,
            'index': self.keyboardLayouts[type].length
          });
        });
      }
    });
  },

  inputFocusChange: function km_inputFocusChange(evt) {
    // XXX Send the fake event to value selector

    window.dispatchEvent(new CustomEvent('inputfocuschange', evt));

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
      } else {
        self._debug('get focus event');
        // by the order in Settings app, we should display
        // if target group (input type) does not exist, use text for default
        if (!self.keyboardLayouts[group])
          group = 'text';
        self.setKeyboardToShow(group, self.keyboardLayouts[group].activit);
        self.showKeyboard();
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
    // TODO make sure setVisible function is ready
    layoutFrame.setVisible(false);
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

  handleKeyboardRequest: function km_handleKeyboardRequest(evt) {
    var url = evt.detail.url;
    this._debug('handleKeyboardRequest: ' + url);
    // everything is hack here! will be removed after having real platform API
    if (url.lastIndexOf('keyboard-test') < 0)
      return;
    evt.stopPropagation();


    var urlparser = document.createElement('a');
    urlparser.href = url;
    var keyword = urlparser.hash.split('=')[1];

    // should be a number that represents the keyboard height
    this.keyboardHeight = parseInt(keyword);

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
      case 'mozbrowseropenwindow':
        this.handleKeyboardRequest(evt);
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
      case 'applicationinstall': //app installed
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
    this.showingLayout.frame.setVisible(true);
    this.showingLayout.frame.addEventListener(
        'mozbrowseropenwindow', this, true);
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

  resetShowingKeyboard: function km_resetShowingKeyboard() {
    if (!this.showingLayout.frame) {
      return;
    }
    this.showingLayout.frame.hidden = true;
    this.showingLayout.frame.setVisible(false);
    this.showingLayout.frame.removeEventListener(
        'mozbrowseropenwindow', this, true);
    this.showingLayout.reset();
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
      self.keyboardLayouts[showed.type].activit = index;
      self.resetShowingKeyboard();
      self.setKeyboardToShow(showed.type, index);
    }, FOCUS_CHANGE_DELAY);
  },

  showAll: function km_showAll() {
    clearTimeout(this.switchChangeTimeout);

    var self = this;
    var showed = this.showingLayout;

    this.switchChangeTimeout = setTimeout(function keyboardLayoutList() {
      var items = [];
      self.keyboardLayouts[showed.type].forEach(function(layout, index) {
        var label = layout.appName + ' ' + layout.name;
        items.push({
          label: label,
          value: index
        });
      });
      self.hideKeyboard();
      //XXX the menu is not scrollable now, and it will take focus away
      // https://bugzilla.mozilla.org/show_bug.cgi?id=859708
      // https://bugzilla.mozilla.org/show_bug.cgi?id=859713
      ListMenu.request(items, 'Layout selection', function(selectedIndex) {
        if (!self.keyboardLayouts[showed.type])
          showed.type = 'text';
        self.keyboardLayouts[showed.type].activit = selectedIndex;
        self.setKeyboardToShow(showed.type, selectedIndex);
        self.showKeyboard();
      }, null);
    }, FOCUS_CHANGE_DELAY);
  }
};

KeyboardManager.init();
