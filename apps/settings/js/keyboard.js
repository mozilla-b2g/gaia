/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/*
 * The script depends shared/js/keyboard_helper.js. KeyboardHelper helps on the
 * following things:
 * - Get all installed keyboard apps and layouts.
 * - Enable or disable keyboard layouts.
 * - Notify keyboard layout changes via the 'keyboardsrefresh' event.
 *
 * This javascript file defines the following modules:
 * - KeyboardContext
 *   KeyboardContext provides lists of all installed keyboards and enabled
 *   layouts. The lists are kept updated based on the events from
 *   KeyboardHelper. KeyboardContext handles only data and does not involve in
 *   any UI logic.
 *
 * - Panel
 *   Panel is designed to be initialized with a panel ID, and reflects if it is
 *   visible to users via the `visible` property.
 *
 * - KeyboardPanel
 * - EnabledLayoutsPanel
 * - InstalledLayoutsPanel
 *   In the panels we initialize a ListView with the data provided by
 *   KeyboardContext. Templates for generating UI elements are also defined
 *   here. The three panel used Panel for observing the visibility change. Which
 *   is for avoiding unnecessary UI changes when the panels are not visible to
 *   users.
 */

/*
 * KeyboardContext provides installed keyboard apps and enabled keyboard layouts
 * in terms of ObservableArrays. It listens to the changes of installed apps
 * and keyboard.enabled-layouts, and update the ObservableArrays.
 */
var KeyboardContext = (function() {
  var _layoutDict = null; // stores layout indexed by appOrigin and layoutId

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
    function(id, appName, appOrigin, name, description, types, enabled) {
      var _observable = Observable({
        id: id,
        appName: appName,
        name: name,
        description: description,
        types: types,
        enabled: enabled
      });

      // Layout enabled changed.
      _observable.observe('enabled', function(newValue, oldValue) {
        KeyboardHelper.setLayoutEnabled(appOrigin, id, newValue);
      });

      return _observable;
  };

  var _refreshEnabledLayouts = function() {
    var enabledLayouts = [];
    var keyboardSettings = KeyboardHelper.keyboardSettings;

    if (keyboardSettings) {
      keyboardSettings.forEach(function(layoutSetting) {
        var keyboard, layout;

        keyboard = _layoutDict[layoutSetting.appOrigin];
        layout = keyboard ? keyboard[layoutSetting.layoutId] : null;

        if (layout) {
          if (layoutSetting.enabled) {
            enabledLayouts.push(layout);
          }
          layout.enabled = layoutSetting.enabled;
        }
      });
    }
    _enabledLayouts.reset(enabledLayouts);
  };

  var _refreshInstalledKeyboards = function(callback) {
    KeyboardHelper.getInstalledKeyboards(function(allKeyboards) {
      _layoutDict = {};

      allKeyboards.forEach(function(keyboardAppInstance) {
        // get all layouts in a keyboard app
        var keyboardManifest = new ManifestHelper(keyboardAppInstance.manifest);
        var entryPoints = keyboardManifest.entry_points;
        var layouts = [];

        _layoutDict[keyboardAppInstance.origin] = {};
        for (var key in entryPoints) {
          var layoutInstance = new ManifestHelper(entryPoints[key]);
          if (!entryPoints[key].types) {
            console.warn('the keyboard app did not declare type.');
            continue;
          }
          var layout = Layout(key, keyboardManifest.name,
                              keyboardAppInstance.origin, layoutInstance.name,
                              layoutInstance.description,
                              layoutInstance.types, false);
          layouts.push(layout);
          _layoutDict[keyboardAppInstance.origin][key] = layout;
        }

        _keyboards.push(Keyboard(keyboardManifest.name,
                                 keyboardManifest.description,
                                 keyboardManifest.launch_path,
                                 layouts, keyboardAppInstance));
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
      _refreshEnabledLayouts();
    });
    window.addEventListener('localized', function() {
      // refresh keyboard and layout in _keyboards
      _keyboards.forEach(function(keyboard) {
        var keyboardAppInstance = keyboard.app;
        var keyboardManifest = new ManifestHelper(keyboardAppInstance.manifest);
        var entryPoints = keyboardManifest.entry_points;
        keyboard.name = keyboardManifest.name;
        keyboard.description = keyboardManifest.description;
        keyboard.layouts.forEach(function(layout) {
          var key = layout.id;
          var layoutInstance = new ManifestHelper(entryPoints[key]);
          layout.appName = keyboardManifest.name;
          layout.name = layoutInstance.name;
          layout.description = layoutInstance.description;
        });
      });
    });

    _refreshInstalledKeyboards(function() {
      _refreshEnabledLayouts();
      callback();
    });
  };

  var _ready = function(callback) {
    if (!callback)
      return;

    if (_isReady) {
      callback();
    } else {
      _callbacks.push(callback);
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

var Panel = function(id) {
  var _id = id;
  var _panel = Observable({
    visible: (_id === Settings.currentPanel)
  });

  window.addEventListener('panelready', function() {
    _panel.visible = (_id === Settings.currentPanel);
  });

  return _panel;
};

var KeyboardPanel = (function() {
  var _panel = null;
  var _listView = null;

  // A template function for generating an UI element for a keyboard object.
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
    }

    container.onclick = function() {
      keyboard.app.launch();
    };
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
    init: function kl_init(panelID) {
      _panel = Panel(panelID);
      _panel.observe('visible', _visibilityChanged);
      _initAllKeyboardListView();
    }
  };
})();

var EnabledLayoutsPanel = (function() {
  var _panel = null;
  var _listView = null;

  // A template function for generating an UI element for a layout object.
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
    var refreshName = function() {
      span.textContent = layout.appName + ': ' + layout.name;
    };
    refreshName();
    layout.observe('appName', refreshName);
    layout.observe('name', refreshName);
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
    init: function ks_init(panelID) {
      _panel = Panel(panelID);
      _panel.observe('visible', _visibilityChanged);
      _initEnabledLayoutListView();
    }
  };
})();

var InstalledLayoutsPanel = (function() {
  var _panel = null;
  var _listView = null;

  // A template function for generating an UI element for a layout object.
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
    }

    checkbox.onchange = function() {
      layout.enabled = this.checked;
    };

    var refreshName = function() {
      layoutName.textContent = layout.name;
    };
    refreshName();
    layout.observe('name', refreshName);
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
    init: function ksa_init(panelID) {
      _panel = Panel(panelID);
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
