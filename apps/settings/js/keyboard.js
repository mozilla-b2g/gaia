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
  // stores layout indexed by app manifestURL and layoutId
  var _layoutDict = null;

  var _keyboards = ObservableArray([]);
  var _enabledLayouts = ObservableArray([]);

  var _isReady = false;
  var _parsingApps = false;
  var _callbacks = [];
  var _defaultEnabledCallbacks = [];

  var Keyboard = function(name, description, launchPath, layouts, app) {
    var _observable = Observable({
      name: name,
      description: description,
      launchPath: launchPath,
      layouts: layouts,
      app: app
    });

    return _observable;
  };

  var Layout =
    function(id, appName, appManifestURL, name, description, types, enabled) {
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
        if (!_parsingApps) {
          KeyboardHelper.setLayoutEnabled(appManifestURL, id, newValue);
          // only check the defaults if we disabled a checkbox
          if (!newValue) {
            KeyboardHelper.checkDefaults(notifyDefaultEnabled);
          }
        }
      });

      return _observable;
  };

  var _waitForLayouts;

  function notifyDefaultEnabled(layouts) {
    _defaultEnabledCallbacks.forEach(function withCallbacks(callback) {
      callback(layouts[0]);
    });
  }

  function updateLayouts(layouts, reason) {
    function mapLayout(layout) {
      var app = _layoutDict[layout.app.manifestURL];
      if (!app) {
        app = _layoutDict[layout.app.manifestURL] = {};
      }
      if (app[layout.layoutId]) {
        app[layout.layoutId].enabled = layout.enabled;
        return app[layout.layoutId];
      }
      return app[layout.layoutId] = Layout(layout.layoutId,
        layout.manifest.name, layout.app.manifestURL, layout.inputManifest.name,
        layout.inputManifest.description, layout.inputManifest.types,
        layout.enabled);
    }

    function reduceApps(carry, layout) {
      // if we already found this app, add it to the layouts
      if (!carry.some(function checkApp(app) {
        if (app.app === layout.app) {
          app.layouts.push(mapLayout(layout));
          return true;
        }
      })) {
        carry.push({
          app: layout.app,
          manifest: layout.manifest,
          layouts: [mapLayout(layout)]
        });
      }
      return carry;
    }

    function mapKeyboard(app) {
      return Keyboard(app.manifest.name, app.manifest.description,
        app.manifest.launch_path, app.layouts, app.app);
    }

    _parsingApps = true;

    // if we changed apps
    if (reason.apps) {
      // re parse every layout
      _layoutDict = {};
      var apps = layouts.reduce(reduceApps, []);
      var keyboards = apps.map(mapKeyboard);
      _keyboards.reset(keyboards);
    }
    var enabled = layouts.filter(function filterEnabled(layout) {
      return layout.enabled;
    }).map(mapLayout);
    _enabledLayouts.reset(enabled);

    _parsingApps = false;

    if (_waitForLayouts) {
      _waitForLayouts();
      _waitForLayouts = undefined;
    }
  }

  var _init = function(callback) {
    window.addEventListener('localized', function() {
      // refresh keyboard and layout in _keyboards
      _keyboards.forEach(function(keyboard) {
        var keyboardAppInstance = keyboard.app;
        var keyboardManifest = new ManifestHelper(keyboardAppInstance.manifest);
        var inputs = keyboardManifest.inputs;
        keyboard.name = keyboardManifest.name;
        keyboard.description = keyboardManifest.description;
        keyboard.layouts.forEach(function(layout) {
          var key = layout.id;
          var layoutInstance = inputs[key];
          layout.appName = keyboardManifest.name;
          layout.name = layoutInstance.name;
          layout.description = layoutInstance.description;
        });
      });
    });
    _waitForLayouts = callback;
    KeyboardHelper.stopWatching();
    KeyboardHelper.watchLayouts(updateLayouts);
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


  return {
    init: function(callback) {
      _defaultEnabledCallbacks = [];
      _isReady = false;
      _init(function() {
        _isReady = true;
        _callbacks.forEach(function(callback) {
          callback();
        });
      });
      _ready(callback);
    },
    keyboards: function(callback) {
      _ready(function() {
        callback(_keyboards);
      });
    },
    enabledLayouts: function(callback) {
      _ready(function() {
        callback(_enabledLayouts);
      });
    },
    defaultKeyboardEnabled: function(callback) {
      _defaultEnabledCallbacks.push(callback);
    }
  };
})();

// only initialize imediately when KeyboardHelper is preset
// during the unit tests this is not nessecarily the case
if (window.KeyboardHelper) {
  KeyboardContext.init();
}

var Panel = function(id) {
  var _id = id;
  var _panel = Observable({
    visible: (_id === Settings.currentPanel)
  });

  var _refreshVisibility = function() {
    _panel.visible = !document.hidden && (_id === Settings.currentPanel);
  };

  window.addEventListener('panelready', _refreshVisibility);
  document.addEventListener('visibilitychange', _refreshVisibility);

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
  var _listViews = [];

  // A template function for generating an UI element for a layout object.
  var _layoutTemplate = function ksa_layoutTemplate(layout, recycled) {
    var container = null;
    var span, checkbox;
    if (recycled) {
      container = recycled;
      checkbox = container.querySelector('input');
      span = container.querySelector('span');
    } else {
      container = document.createElement('li');
      checkbox = document.createElement('input');
      var label = document.createElement('label');
      span = document.createElement('span');

      label.className = 'pack-checkbox';
      checkbox.type = 'checkbox';

      label.appendChild(checkbox);
      label.appendChild(span);

      container.appendChild(label);
    }

    checkbox.onchange = function() {
      layout.enabled = this.checked;
    };

    var refreshName = function() {
      span.textContent = layout.name;
    };
    var refreshCheckbox = function() {
      checkbox.checked = layout.enabled;
    };
    refreshCheckbox();
    refreshName();
    layout.observe('name', refreshName);
    layout.observe('enabled', refreshCheckbox);

    return container;
  };

  var _initInstalledLayoutListView = function() {
    KeyboardContext.keyboards(function(keyboards) {
      var container = document.getElementById('keyboardAppContainer');
      keyboards.forEach(function(keyboard) {
        var header = document.createElement('header');
        var h2 = document.createElement('h2');
        var ul = document.createElement('ul');

        var refreshName = function() {
          h2.textContent = keyboard.name;
        };
        keyboard.observe('name', refreshName);
        refreshName();

        header.appendChild(h2);
        container.appendChild(header);
        container.appendChild(ul);
        var listView = ListView(ul, keyboard.layouts,
          _layoutTemplate);
        listView.enabled = _panel.visible;
        _listViews.push(listView);
      });
    });
  };

  var _visibilityChanged = function(visible) {
    _listViews.forEach(function(listView) {
      listView.enabled = visible;
    });

    if (!visible) {
      KeyboardHelper.saveToSettings(); // save changes to settings
    }
  };

  return {
    init: function ksa_init(panelID) {
      _panel = Panel(panelID);
      _panel.observe('visible', _visibilityChanged);
      _initInstalledLayoutListView();
    }
  };
})();

var DefaultKeyboardEnabledDialog = (function() {
  function showDialog(layout) {
    var l10n = navigator.mozL10n;
    l10n.localize(
      document.getElementById('keyboard-default-title'),
      'mustHaveOneKeyboard',
      {
        type: l10n.get('keyboardType-' +
          layout.inputManifest.types.sort()[0])
      }
    );
    l10n.localize(
      document.getElementById('keyboard-default-text'),
      'defaultKeyboardEnabled',
      {
        layoutName: layout.inputManifest.name,
        appName: layout.manifest.name
      }
    );
    openDialog('keyboard-enabled-default');
  }

  return {
    init: function() {
      KeyboardContext.defaultKeyboardEnabled(showDialog);
    },
    show: showDialog
  };
})();

navigator.mozL10n.ready(function keyboard_init() {
  KeyboardPanel.init('#keyboard');
  EnabledLayoutsPanel.init('#keyboard-selection');
  DefaultKeyboardEnabledDialog.init();
  InstalledLayoutsPanel.init('#keyboard-selection-addMore');
});
