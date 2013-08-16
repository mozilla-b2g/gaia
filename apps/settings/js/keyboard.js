/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/*
 * The script depends shared/js/keyboard_helper.js. KeyboardHelper helps on the
 * following things:
 * - Get all installed keyboard apps and layouts.
 * - Enable or disable keyboard layouts.
 * - Notify keyboard layout changes via the 'keyboardsrefresh' event.
 */

/*
 * KeyboardContext provides installed keyboard apps and enabled keyboard layouts
 * in terms of ObservableArrays. It listens to the changes of installed apps
 * (not finished yet) and keyboard.enabled-layouts, and update the
 * ObservableArrays.
 */
var KeyboardContext = (function() {
  var _layoutDict = null; // stores layout indexed by appOrigin and layoutName

  var _keyboards = ObservableArray([]);
  var _enabledLayouts = ObservableArray([]);

  var _isReady = false;
  var _callbacks = [];

  var Keyboard = function(name, description, launchPath, layouts, app) {
    return {
      name: name,
      description: description,
      launchPath: launchPath,
      layouts: layouts,
      app: app
    };
  };

  var Layout =
    function(name, appName, appOrigin, description, types, enabled) {
      var _observable = Observable({
        name: name,
        appName: appName,
        description: description,
        types: types,
        enabled: enabled
      });

      // Layout enabled changed.
      _observable.observe('enabled', function(newValue, oldValue) {
        var keyboardSettings = KeyboardHelper.keyboardSettings;
        if (keyboardSettings) {
          for (var i = 0; i < keyboardSettings.length; i++) {
            var layout = keyboardSettings[i];
            if (layout.appOrigin === appOrigin && layout.layoutName === name) {
              if (layout.enabled !== newValue) {
                layout.enabled = newValue;

                KeyboardHelper.setLayoutEnabled(appOrigin, layout.layoutName,
                layout.enabled);
              }
              break;
            }
          }
        }
    });

    return _observable;
  };

  var _refreshEnabledLayout = function() {
    var enabledLayouts = [];
    var keyboardSettings = KeyboardHelper.keyboardSettings;

    if (keyboardSettings) {
      keyboardSettings.forEach(function(rawLayout) {
        var keyboard, layout;

        keyboard = _layoutDict[rawLayout.appOrigin];
        layout = keyboard ? keyboard[rawLayout.layoutName] : null;

        if (layout) {
          if (rawLayout.enabled) {
            enabledLayouts.push(layout);
          }
          layout.enabled = rawLayout.enabled;
        }
      });
    }
    _enabledLayouts.reset(enabledLayouts);
  };

  var _refreshInstalledKeyboards = function(callback) {
    KeyboardHelper.getInstalledKeyboards(function(allKeyboards) {
      _layoutDict = {};

      allKeyboards.forEach(function(rawKeyboard) {
        // get all layouts in a keyboard app
        var keyboardManifest = rawKeyboard.manifest;
        var entryPoints = keyboardManifest.entry_points;
        var layouts = [];

        _layoutDict[rawKeyboard.origin] = {};
        for (var name in entryPoints) {
          var rawLayout = entryPoints[name];
          var launchPath = rawLayout.launch_path;
          if (!entryPoints[name].types) {
            console.warn('the keyboard app did not declare type.');
            continue;
          }
          var layout = Layout(name, keyboardManifest.name,
                              rawKeyboard.origin, rawLayout.description,
                              rawLayout.types, false);
          layouts.push(layout);
          _layoutDict[rawKeyboard.origin][name] = layout;
        }

        _keyboards.push(Keyboard(keyboardManifest.name,
                                 keyboardManifest.description,
                                 keyboardManifest.launch_path,
                                 layouts, rawKeyboard));
      });

      callback();
    });
  };

  var _init = function(callback) {
    window.addEventListener('keyboardsrefresh', function() {
      /*
       * XXX: The event contains information including layout enabled/disabled,
       *      keyboard installed/uninstalled, and keyboard change. We should
       *      have finer events in the future.
       */
      _refreshEnabledLayout();
    });

    _refreshInstalledKeyboards(function() {
      _refreshEnabledLayout();
      callback();
    });
  };

  var _ready = function(callback) {
    if (callback) {
      if (_isReady) {
        callback();
      } else {
        _callbacks.push(callback);
      }
    }
  };

  _init(function() {
    _isReady = true;
    _callbacks.forEach(function(callback) {
      callback();
    });
  });

  return {
    keyboards: function(callback) {
      _ready(function() {
        callback(_keyboards);
      });
    },
    enabledLayouts: function(callback) {
      _ready(function() {
        callback(_enabledLayouts);
      });
    }
  };
})();

var Panel = function(url) {
  var _url = url;
  var _panel = Observable({
    visible: (_url === Settings.currentPanel)
  });

  window.addEventListener('panelready', function() {
    _panel.visible = (_url === Settings.currentPanel);
  });

  return _panel;
};

var KeyboardPanel = (function() {
  var _panel = null;
  var _listView = null;
  var _keyboardTemplate = function kl_keyboardTemplate(keyboard, recycled) {
    var container = null;
    var span;
    if (recycled) {
      container = recycled;
      span = container.querySelector('span');
    } else {
      container = document.createElement('li');
      span = document.createElement('span');

      container.classList.add('keyboard-menuItem');
      container.appendChild(span);

      container.addEventListener('click', function() {
        keyboard.app.launch();
      });
    }

    span.textContent = keyboard.name;
    return container;
  };

  var _initAllKeyboardListView = function() {
    KeyboardContext.keyboards(function(keyboards) {
      var ul = document.getElementById('allKeyboardList');
      ul.hidden = (keyboards.length == 0);
      _listView = ListView(ul, keyboards, _keyboardTemplate);
      _listView.enabled = _panel.visible;
    });
  };

  var _visibilityChanged = function(visible) {
    _listView.enabled = visible;
  };

  return {
    init: function kl_init(url) {
      _panel = Panel(url);
      _panel.observe('visible', _visibilityChanged);
      _initAllKeyboardListView();
    }
  };
})();

var EnabledLayoutsPanel = (function() {
  var _panel = null;
  var _listView = null;
  var _layoutTemplate = function ks_layoutTemplate(layout, recycled) {
    var container = null;
    var span;
    if (recycled) {
      container = recycled;
      span = container.querySelector('span');
    } else {
      container = document.createElement('li');
      span = document.createElement('span');
      container.appendChild(span);
    }

    span.textContent = layout.appName + ': ' + layout.name;
    return container;
  };

  var _initEnabledLayoutListView = function() {
    KeyboardContext.enabledLayouts(function(enabledLayouts) {
      var ul = document.getElementById('enabledKeyboardList');
      _listView = ListView(ul, enabledLayouts, _layoutTemplate);
      _listView.enabled = _panel.visible;
    });
  };

  var _visibilityChanged = function(visible) {
    _listView.enabled = visible;
  };

  return {
    init: function ks_init(url) {
      _panel = Panel(url);
      _panel.observe('visible', _visibilityChanged);
      _initEnabledLayoutListView();
    }
  };
})();

var InstalledLayoutsPanel = (function() {
  var _panel = null;
  var _listView = null;
  var _layoutTemplate = function ksa_layoutTemplate(layout, recycled) {
    var container = null;
    var layoutName, checkbox;
    if (recycled) {
      container = recycled;
      checkbox = container.querySelector('input');
      span = container.querySelector('span');
    } else {
      container = document.createElement('li');
      checkbox = document.createElement('input');
      layoutName = document.createElement('a');
      var label = document.createElement('label');
      var span = document.createElement('span');

      label.className = 'pack-checkbox';
      checkbox.type = 'checkbox';

      label.appendChild(checkbox);
      label.appendChild(span);

      container.appendChild(label);
      container.appendChild(layoutName);

      // event handlers
      checkbox.addEventListener('change', function() {
        layout.enabled = this.checked;
      });
    }

    //XXX we should display an unique name here, not just layout name.
    layoutName.textContent = layout.name;
    checkbox.checked = layout.enabled;

    return container;
  };

  var _initInstalledLayoutListView = function() {
    KeyboardContext.keyboards(function(keyboards) {
      var container = document.getElementById('keyboardAppContainer');
      keyboards.forEach(function(keyboard) {
        var header = document.createElement('header');
        var h2 = document.createElement('h2');
        var ul = document.createElement('ul');

        h2.textContent = keyboard.name;
        header.appendChild(h2);
        container.appendChild(header);
        container.appendChild(ul);
        _listView = ListView(ul, keyboard.layouts,
          _layoutTemplate);
        _listView.enabled = _panel.visible;
      });
    });
  };

  var _visibilityChanged = function(visible) {
    _listView.enabled = visible;
  };

  return {
    init: function ksa_init(url) {
      _panel = Panel(url);
      _panel.observe('visible', _visibilityChanged);
      _initInstalledLayoutListView();
    }
  };
})();

navigator.mozL10n.ready(function keyboard_init() {
  KeyboardPanel.init('#keyboard');
  EnabledLayoutsPanel.init('#keyboard-selection');
  InstalledLayoutsPanel.init('#keyboard-selection-addMore');
});
