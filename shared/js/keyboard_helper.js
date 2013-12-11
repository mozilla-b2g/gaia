/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Helper object to find all installed keyboard apps and layouts.
 *
 * (Need mozApps.mgmt and settings permission)
 */

(function(exports) {

/**
 * The set of "basic keyboard" types
 */
var BASE_TYPES = new Set([
  'text', 'url', 'email', 'password', 'number', 'option'
]);

/**
 * The keys stored in the settings database
 */
var SETTINGS_KEYS = {
  ENABLED: 'keyboard.enabled-layouts',
  DEFAULT: 'keyboard.default-layouts',
  THIRD_PARTY_APP_ENABLED: 'keyboard.3rd-party-app.enabled'
};

var DEPRECATE_KEYBOARD_SETTINGS = {
  en: 'keyboard.layouts.english',
  'en-Dvorak': 'keyboard.layouts.dvorak',
  cs: 'keyboard.layouts.czech',
  fr: 'keyboard.layouts.french',
  de: 'keyboard.layouts.german',
  hu: 'keyboard.layouts.hungarian',
  nb: 'keyboard.layouts.norwegian',
  my: 'keyboard.layouts.myanmar',
  sl: 'keyboard.layouts.slovak',
  tr: 'keyboard.layouts.turkish',
  ro: 'keyboard.layouts.romanian',
  ru: 'keyboard.layouts.russian',
  ar: 'keyboard.layouts.arabic',
  he: 'keyboard.layouts.hebrew',
  'zh-Hant-Zhuyin': 'keyboard.layouts.zhuyin',
  'zh-Hans-Pinyin': 'keyboard.layouts.pinyin',
  el: 'keyboard.layouts.greek',
  'jp-kanji': 'keyboard.layouts.japanese',
  pl: 'keyboard.layouts.polish',
  'pt-BR': 'keyboard.layouts.portuguese',
  sr: 'keyboard.layouts.serbian',
  es: 'keyboard.layouts.spanish',
  ca: 'keyboard.layouts.catalan'
};

var MULTI_LAYOUT_MAP = {
  sr: ['sr-Cyrl', 'sr-Latn']
};

// In order to provide default defaults, we need to know the default keyboard
var defaultKeyboardManifestURL =
  'app://keyboard.gaiamobile.org/manifest.webapp';
// support http:// version as well
if (location.protocol === 'http:') {
  defaultKeyboardManifestURL =
    'http://keyboard.gaiamobile.org:8080/manifest.webapp';
}

// Stores a local copy of whatever is in the settings database
var currentSettings = {
  defaultLayouts: {}
};

// until we read otherwise, asssume the default keyboards are en and number
currentSettings.defaultLayouts[defaultKeyboardManifestURL] = {
  en: true,
  number: true
};

// and also assume that the defaults are the enabled
currentSettings.enabledLayouts = map2dClone(currentSettings.defaultLayouts);

// Switch to allow/disallow 3rd-party keyboard apps to be enabled.
var enable3rdPartyKeyboardApps = false;
var regExpGaiaKeyboardAppsManifestURL =
  /^(app|http):\/\/[\w\-]+\.gaiamobile.org(:\d+)?\/manifest\.webapp$/;

/**
 * helper function for reading a value in one of the currentSettings
 */
function map2dIs(manifestURL, layoutId) {
  // force boolean true or false
  return !!(this[manifestURL] && this[manifestURL][layoutId]);
}

/**
 * helper function for setting a value to true in one of the currentSettings
 */
function map2dSet(manifestURL, layoutId) {
  if (!this[manifestURL]) {
    this[manifestURL] = {};
  }
  this[manifestURL][layoutId] = true;
}

/**
 * helper function for setting a value to false in one of the currentSettings
 * deletes the appropriate keys
 */
function map2dUnset(manifestURL, layoutId) {
  if (!this[manifestURL]) {
    return;
  }
  delete this[manifestURL][layoutId];
  if (!Object.keys(this[manifestURL]).length) {
    delete this[manifestURL];
  }
}

/**
 * helper function for cloning one of the currentSettings
 */
function map2dClone(obj) {
  var result = {};
  for (var key1 in obj) {
    result[key1] = {};
    for (var key2 in obj[key1]) {
      result[key1][key2] = obj[key1][key2];
    }
  }
  return result;
}

// callbacks when something changes
var watchQueries = [];

// holds the last result from getApps until something changes
var currentApps;

// holds the result of keyboard_layouts.json
var defaultLayoutConfig;

/**
 * Sends any watchers the result of their query.
 */
function kh_updateWatchers(reason) {
  if (watchQueries.length) {

    // we do a getApps in order to make sure that we have the most recent
    // app data before calling getLayouts
    KeyboardHelper.getApps(function withApps() {
      watchQueries.forEach(function eachWatchQuery(watch) {
        KeyboardHelper.getLayouts(watch.query, function withLayouts(layouts) {
          watch.callback(layouts, reason);
        });
      });
    });
  }
}

// callbacks waiting to know when settings are loaded
var waitingForSettings = [];
var loadedSettings = new Set();

/**
 * Tracks the number of settings loaded and calls the callbacks
 */
function kh_loadedSetting(setting) {
  loadedSettings.add(setting);
  if (loadedSettings.size >= Object.keys(SETTINGS_KEYS).length) {
    waitingForSettings.forEach(function(callback) {
      callback();
    });
    waitingForSettings = [];
    kh_updateWatchers({ settings: true });
  }
}

/**
 * Call a callback when the settings have loaded, or immediately if already
 * loaded.
 */
function kh_withSettings(callback) {
  if (loadedSettings.size >= Object.keys(SETTINGS_KEYS).length) {
    callback();
  } else {
    waitingForSettings.push(callback);
  }
}

/**
 * Internal helper to read the settings again
 */
function kh_getSettings() {
  loadedSettings = new Set();
  var lock = window.navigator.mozSettings.createLock();
  lock.get(SETTINGS_KEYS.DEFAULT).onsuccess = kh_parseDefault;
  lock.get(SETTINGS_KEYS.ENABLED).onsuccess = kh_parseEnabled;
  lock.get(SETTINGS_KEYS.THIRD_PARTY_APP_ENABLED).onsuccess =
    kh_parse3rdPartyAppEnabled;
}

/**
 * Parse the result from the settings query for enabling 3rd-party keyboards
 */
function kh_parse3rdPartyAppEnabled() {
  var value = this.result[SETTINGS_KEYS.THIRD_PARTY_APP_ENABLED];
  if (typeof value === 'boolean') {
    enable3rdPartyKeyboardApps = value;
  } else {
    enable3rdPartyKeyboardApps = false;
  }
  kh_loadedSetting(SETTINGS_KEYS.THIRD_PARTY_APP_ENABLED);
}

/**
 * Parse the result from the settings query for default layouts
 */
function kh_parseDefault() {
  var value = this.result[SETTINGS_KEYS.DEFAULT];
  if (value) {
    currentSettings.defaultLayouts = value;
  }
  kh_loadedSetting(SETTINGS_KEYS.DEFAULT);
}

/**
 * Parse the result from the settings query for enabled layouts
 */
function kh_parseEnabled() {
  var value = this.result[SETTINGS_KEYS.ENABLED];
  var needsSave = false;
  if (!value) {
    currentSettings.enabledLayouts = map2dClone(currentSettings.defaultLayouts);
    needsSave = true;
  } else {
    var type = typeof value;

    // deal with the old string format - might be able to be removed once test
    // devices have been living with this new format for a bit.
    if (type === 'string') {
      try {
        currentSettings.enabledLayouts = {};
        var oldSettings = JSON.parse(value);
        oldSettings.forEach(function(layout) {
          if (layout.enabled) {
            var manifestURL = layout.manifestURL;
            if (!manifestURL)
              manifestURL = layout.appOrigin + '/manifest.webapp';
            map2dSet.call(currentSettings.enabledLayouts, manifestURL,
              layout.layoutId);
          }
        });
      } catch (e) {
        currentSettings.enabledLayouts =
          map2dClone(currentSettings.defaultLayouts);
        needsSave = true;
      }
    } else {
      // if it wasn't a string, assume its our object
      currentSettings.enabledLayouts = value;
    }
  }

  kh_loadedSetting(SETTINGS_KEYS.ENABLED);

  if (needsSave) {
    KeyboardHelper.saveToSettings();
  }
}

/**
 * Parse and migrate the result for the deprecated settings (v1.1) for enabled
 * layouts.
 */
function kh_migrateDeprecatedSettings(deprecatedSettings) {
  var settingEntry = DEPRECATE_KEYBOARD_SETTINGS['en'];

  // No need to do migration if the deprecated settings are not available
  if (deprecatedSettings[settingEntry] == undefined) {
    return;
  }

  // reset the enabled layouts
  currentSettings.enabledLayouts[defaultKeyboardManifestURL] = {
    number: true
  };

  var hasEnabledLayout = false;
  for (var key in DEPRECATE_KEYBOARD_SETTINGS) {
    settingEntry = DEPRECATE_KEYBOARD_SETTINGS[key];
    // this layout was set as enabled in the old settings
    if (deprecatedSettings[settingEntry]) {
      hasEnabledLayout = true;

      if (key in MULTI_LAYOUT_MAP) {
        MULTI_LAYOUT_MAP[key].forEach(function enableLayout(layoutId) {
          map2dSet.call(currentSettings.enabledLayouts,
                        defaultKeyboardManifestURL, layoutId);
        });
      } else {
        map2dSet.call(currentSettings.enabledLayouts,
                      defaultKeyboardManifestURL, key);
      }
    }
  }

  // None of the layouts has been set enabled, so enable English by default
  if (!hasEnabledLayout) {
    map2dSet.call(currentSettings.enabledLayouts,
                  defaultKeyboardManifestURL, 'en');
  }

  // Clean up all the deprecated settings
  var deprecatedSettingsQuery = {};
  for (var key in DEPRECATE_KEYBOARD_SETTINGS) {
    // the deprecated setting entry, e.g. keyboard.layout.english
    settingEntry = DEPRECATE_KEYBOARD_SETTINGS[key];

    // Set the default value for each entry
    deprecatedSettingsQuery[settingEntry] = null;
  }
  window.navigator.mozSettings.createLock().set(deprecatedSettingsQuery);

  KeyboardHelper.saveToSettings();
}

/**
 * JSON loader
 */
function kh_loadJSON(href, callback) {
  if (!callback)
    return;
  var xhr = new XMLHttpRequest();
  xhr.onerror = function() {
    console.error('Failed to fetch file: ' + href, xhr.statusText);
  };
  xhr.onload = function() {
    callback(xhr.response);
  };
  xhr.open('GET', href, true); // async
  xhr.responseType = 'json';
  xhr.send();
}

//
// getSettings: Query the value of multiple settings at once.
//
// settings is an object whose property names are the settings to query
// and whose property values are the default values to use if no such
// setting is found.  This function will create a setting lock and
// request the value of each of the specified settings.  Once it receives
// a response to all of the queries, it passes all the settings values to
// the specified callback function.  The argument to the callback function
// is an object just like the settings object, where the property name is
// the setting name and the property value is the setting value (or the
// default value if the setting was not found).
//
function kh_getMultiSettings(settings, callback) {
  var results = {};
  try {
    var lock = navigator.mozSettings.createLock();
  }
  catch (e) {
    // If settings is broken, just return the default values
    console.warn('Exception in mozSettings.createLock():', e,
                 '\nUsing default values');
    for (var p in settings)
      results[p] = settings[p];
    callback(results);
  }
  var settingNames = Object.keys(settings);
  var numSettings = settingNames.length;
  var numResults = 0;

  for (var i = 0; i < numSettings; i++) {
    requestSetting(settingNames[i]);
  }

  function requestSetting(name) {
    try {
      var request = lock.get(name);
    }
    catch (e) {
      console.warn('Exception querying setting', name, ':', e,
                   '\nUsing default value');
      recordResult(name, settings[name]);
      return;
    }
    request.onsuccess = function() {
      var value = request.result[name];
      if (value === undefined) {
        value = settings[name]; // Use the default value
      }
      recordResult(name, value);
    };
    request.onerror = function(evt) {
      console.warn('Error querying setting', name, ':', evt.error);
      recordResult(name, settings[name]);
    };
  }

  function recordResult(name, value) {
    results[name] = value;
    numResults++;
    if (numResults === numSettings) {
      callback(results);
    }
  }
}

/**
 * Creates an object that describes a keyboard layout.  The objects prototype
 * will give it accessors for 'default' and 'enabled' that will read or change
 * the proper setting from currentSettings.
 *
 * @constructor
 */
function KeyboardLayout(options) {
  for (var key in options) {
    this[key] = options[key];
  }
}

Object.defineProperties(KeyboardLayout.prototype, {
  'default': {
    get: function kh_getLayoutIsDefault() {
      return map2dIs.call(
        currentSettings.defaultLayouts, this.app.manifestURL, this.layoutId
      );
    }
  },
  enabled: {
    get: function kh_getLayoutIsEnabled() {
      return map2dIs.call(
        currentSettings.enabledLayouts, this.app.manifestURL, this.layoutId
      );
    },
    set: function kh_setLayoutIsDefault(value) {
      var method = value ? map2dSet : map2dUnset;
      method.call(currentSettings.enabledLayouts,
        this.app.manifestURL, this.layoutId);
    }
  }
});

/**
 * Exposed as KeyboardHelper.settings this gives us a fairly safe way to read
 * and write to the settings data structures directly.
 */
var kh_SettingsHelper = {};
Object.defineProperties(kh_SettingsHelper, {
  'default': {
    get: function() {
      return map2dClone(currentSettings.defaultLayouts);
    },
    set: function(value) {
      currentSettings.defaultLayouts = map2dClone(value);
    },
    enumerable: true
  },
  'enabled': {
    get: function() {
      return map2dClone(currentSettings.enabledLayouts);
    },
    set: function(value) {
      currentSettings.enabledLayouts = map2dClone(value);
    },
    enumerable: true
  }
});

var KeyboardHelper = exports.KeyboardHelper = {
  settings: kh_SettingsHelper,

  /**
   * Listen for changes in settings or apps and read the deafault settings
   */
  init: function kh_init() {
    watchQueries = [];
    currentApps = undefined;

    // load the current settings, and watch for changes to settings
    var settings = window.navigator.mozSettings;
    if (settings) {
      kh_getSettings();
      settings.addObserver(SETTINGS_KEYS.ENABLED, kh_getSettings);
      settings.addObserver(SETTINGS_KEYS.DEFAULT, kh_getSettings);

      // read deprecated settings
      var deprecatedSettingsQuery = {};
      for (var key in DEPRECATE_KEYBOARD_SETTINGS) {
        // the deprecated setting entry, e.g. keyboard.layout.english
        var settingEntry = DEPRECATE_KEYBOARD_SETTINGS[key];

        // Set the default value for each entry
        deprecatedSettingsQuery[settingEntry] = undefined;
      }
      kh_getMultiSettings(deprecatedSettingsQuery,
                          kh_migrateDeprecatedSettings);
    }

    window.addEventListener('applicationinstallsuccess', this);
    window.addEventListener('applicationuninstall', this);
  },

  /**
   * Handles the application changed events.  Clears the cache and updates
   * any listening watchers.
   */
  handleEvent: function(event) {
    currentApps = undefined;
    kh_updateWatchers({ apps: true });
  },

  /**
   * If this is a basic keyboard type
   */
  isKeyboardType: function kh_isKeyboardType(type) {
    return BASE_TYPES.has(type);
  },

  /**
   * Enables or disables a layout based on manifest URL and layoutId
   */
  setLayoutEnabled: function kh_setLayoutEnabled(manifestURL, layoutId,
                                                 enabled) {
    var method = enabled ? map2dSet : map2dUnset;
    method.call(currentSettings.enabledLayouts, manifestURL, layoutId);
  },

  /**
   * Returns true if the layout specified by manifest URL and layoutId is
   * enabled.
   */
  getLayoutEnabled: function kh_getLayoutEnabled(manifestURL, layoutId) {
    return map2dIs.call(currentSettings.enabledLayouts, manifestURL, layoutId);
  },

  /**
   * set/unset a layout as default based on manifest URL and layoutId
   */
  setLayoutIsDefault: function kh_setLayoutIsDefault(manifestURL, layoutId,
                                                     enabled) {
    var method = enabled ? map2dSet : map2dUnset;
    method.call(currentSettings.defaultLayouts, manifestURL, layoutId);
  },

  /**
   * Returns true if the layout specified by manifest URL and layoutId
   * is default.
   */
  getLayoutIsDefault: function kh_getLayoutIsDefault(manifestURL, layoutId) {
    return map2dIs.call(currentSettings.defaultLayouts, manifestURL, layoutId);
  },

  /**
   * Checks the currently enabled layouts to ensure there is at least one
   * 'text', 'url' and 'number' keyboard enabled.  If there is not, it will
   * enable the corresponding default keyboard.
   *
   * Only calls the callback if a default was enabled, and passes an array
   * of layouts that were enabled.
   */
  checkDefaults: function kh_checkDefaults(callback) {
    var layoutsEnabled = [];
    ['text', 'url', 'number'].forEach(function eachType(type) {
      // getLayouts is sync when we already have data
      var enabled;
      this.getLayouts({ type: type, enabled: true }, function(layouts) {
        enabled = layouts.length;
      });
      if (!enabled) {
        this.getLayouts({ type: type, 'default': true }, function(layouts) {
          if (layouts[0]) {
            layouts[0].enabled = true;
            layoutsEnabled.push(layouts[0]);
          }
        });
      }
    }, this);

    if (layoutsEnabled.length) {
      if (callback) {
        callback(layoutsEnabled);
      }
    }
  },

  /**
   * Saves the current state to settings.  None of the changes made will be
   * saved automatically by KeyboardHelper.  This allows someone to batch
   * whatever settings changes are nessecary, then call save.
   */
  saveToSettings: function ke_saveToSettings() {
    var toSet = {};
    toSet[SETTINGS_KEYS.ENABLED] = currentSettings.enabledLayouts;
    toSet[SETTINGS_KEYS.DEFAULT] = currentSettings.defaultLayouts;
    window.navigator.mozSettings.createLock().set(toSet);
  },

  /**
   * Get a list of current keyboard applications.  Will call callback
   * immediately if the data is already cached locally.  Will not call callback
   * if for some reason no apps are found.
   */
  getApps: function kh_getApps(callback) {
    if (!navigator.mozApps || !navigator.mozApps.mgmt) {
      return;
    }

    if (currentApps) {
      return callback(currentApps);
    }

    navigator.mozApps.mgmt.getAll().onsuccess = function onsuccess(event) {
      var keyboardApps = event.target.result.filter(function filterApps(app) {
        // keyboard apps will set role as 'input'
        // https://wiki.mozilla.org/WebAPI/KeboardIME#Proposed_Manifest_of_a_3rd-Party_IME
        if (!app.manifest || 'input' !== app.manifest.role) {
          return;
        }

        // Check app type
        if (app.manifest.type !== 'certified' &&
            app.manifest.type !== 'privileged') {
          return;
        }

        // Check permission
        if (app.manifest.permissions &&
            !('input' in app.manifest.permissions)) {
          return;
        }

        if (!enable3rdPartyKeyboardApps &&
          !regExpGaiaKeyboardAppsManifestURL.test(app.manifestURL)) {
          console.error('A 3rd-party keyboard app is installed but ' +
            'the feature is not enabled in this build. ' +
            'Manifest URL: ' + app.manifestURL);
          return;
        }

        //XXX remove this hard code check if one day system app no longer
        //    use mozKeyboard API
        if (app.origin === 'app://system.gaiamobile.org') {
          return;
        }
        // all keyboard apps should define its layout(s) in "inputs" section
        if (!app.manifest.inputs) {
          return;
        }
        return true;
      });


      if (keyboardApps.length) {
        // every time we get a list of apps, clean up the settings
        Object.keys(currentSettings.enabledLayouts)
          .concat(Object.keys(currentSettings.defaultLayouts))
          .forEach(function(manifestURL) {
            // if the manifestURL doesn't exist in the list of apps, delete it
            // from the settings maps
            if (!keyboardApps.some(function(app) {
              return app.manifestURL === manifestURL;
            })) {
              delete currentSettings.enabledLayouts[manifestURL];
              delete currentSettings.defaultLayouts[manifestURL];
            }
          });
        currentApps = keyboardApps;
        callback(keyboardApps);
      }
    };
  },

  /**
   * Requests an array of layouts matching an optional set of search params.
   * Calls the callback when data is received, or immediately if already
   * cached locally.
   *
   * options.default - When true, only default layouts are returned.
   * options.enabled - When true, only enabled layouts are returned.
   * options.type - A string, or array of strings.  Layouts filtered to type.
   */
  getLayouts: function kh_getLayouts(options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    function withApps(apps) {
      var layouts = apps.reduce(function eachApp(result, app) {

        var manifest = new ManifestHelper(app.manifest);
        for (var layoutId in manifest.inputs) {
          var inputManifest = manifest.inputs[layoutId];
          if (!inputManifest.types) {
            console.warn(app.manifestURL, layoutId, 'did not declare type.');
            continue;
          }

          var layout = new KeyboardLayout({
            app: app,
            manifest: manifest,
            inputManifest: inputManifest,
            layoutId: layoutId
          });

          if (options['default'] && !layout['default']) {
            continue;
          }

          if (options.enabled && !layout.enabled) {
            continue;
          }

          if (options.type) {
            options.type = [].concat(options.type);
            // check for any type in our options to be any type in the layout
            if (!options.type.some(function(type) {
              return inputManifest.types.indexOf(type) !== -1;
            })) {
              continue;
            }
          }

          result.push(layout);
        }

        // sort the default query by most specific keyboard
        if (options['default']) {
          result.sort(function(a, b) {
            return a.inputManifest.types.length - b.inputManifest.types.length;
          });
        }
        return result;
      }, []);

      kh_withSettings(callback.bind(null, layouts));
    }

    this.getApps(withApps);
  },

  /**
   * Clears all watch queries
   */
  stopWatching: function() {
    watchQueries = [];
  },

  /**
   * Calls the callback whenever settings or apps are changed. The query is
   * passed onto getLayouts. The callback will be called as soon as the current
   * settings and apps are loaded as well.
   *
   * The callback will be passed an array of layouts, and a reason object.
   * I.E. function callback(layouts, reason) {}
   * reason.apps will be true when apps have changed, and reason.settings
   * will be true if settings changed.  Both will be true on the first
   * callback.
   */
  watchLayouts: function(query, callback) {
    if (typeof query === 'function') {
      callback = query;
      query = {};
    }

    var watch = {
      query: query,
      callback: callback
    };
    watchQueries.push(watch);

    this.getLayouts(query, function initialCall(layouts) {
      watch.layouts = layouts;
      callback(layouts, { apps: true, settings: true });
    });
  },

  // Read keyboard_layouts for language -> layouts mapping
  getDefaultLayoutConfig: function kh_getDefaultLayoutConfig(callback) {
    if (!callback) {
      return;
    }

    if (defaultLayoutConfig) {
      callback(defaultLayoutConfig);
    } else {
      var KEYBOARDS = '/shared/resources/keyboard_layouts.json';
      kh_loadJSON(KEYBOARDS, function loadKeyboardLayouts(data) {
        if (data) {
          defaultLayoutConfig = data;
          callback(defaultLayoutConfig);
        }
      });
    }
  },

  // Change the default layouts set according to the language
  // language: the current system language, used to look up the mapping table
  // reset: if set as true, will reset the current enabled layouts
  changeDefaultLayouts: function kh_changeDefaultLayouts(language, reset) {
    this.getDefaultLayoutConfig(function gotDefaultLayouts(keyboards) {
      var newKbLayouts = keyboards.layout[language];

      // XXX: change this so that it could support multiple built-in
      // keyboard apps
      var kbManifestURL = defaultKeyboardManifestURL;

      // reset the set of default layouts
      currentSettings.defaultLayouts = {};

      // set the language-independent default layouts
      var langIndependentLayouts = keyboards.langIndependentLayouts;
      for (var i = langIndependentLayouts.length - 1; i >= 0; i--) {
        this.setLayoutIsDefault(kbManifestURL,
                                langIndependentLayouts[i].layoutId,
                                true);
      }

      if (reset) {
        // reset the set of default layouts
        currentSettings.enabledLayouts =
          map2dClone(currentSettings.defaultLayouts);
      }

      // Enable the language specific keyboard layout group
      for (i = newKbLayouts.length - 1; i >= 0; i--) {
        this.setLayoutIsDefault(kbManifestURL, newKbLayouts[i].layoutId, true);
        this.setLayoutEnabled(kbManifestURL, newKbLayouts[i].layoutId, true);
      }

      this.saveToSettings(); // save changes to settings
    }.bind(this));
  }
};

KeyboardHelper.init();

}(window));
