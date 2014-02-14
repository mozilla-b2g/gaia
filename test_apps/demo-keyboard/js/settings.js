(function(exports) {
  'use strict';

  function Settings(definitions) {
    var self = this;
    var dispatcher = this.dispatcher = document.createElement('div');

    // The definitions object maps a setting name to another object.
    // Each of these objects has a 'defaultValue' property that specifies the
    // default value of the setting and a 'key' property that specfies
    // the key used to set and retrieve the setting.
    var settingsNames = Object.keys(definitions);

    // This object holds the current values of each setting.
    var values = {};

    // For each setting in turn
    settingsNames.forEach(function(name) {
      // Initialize to the default value
      values[name] = definitions[name].defaultValue;

      // Define a getter method to return the value
      Object.defineProperty(self, name, {
        configurable: false,
        enumerable: true,
        get: function() { return values[name] }
      });

      var key = definitions[name].key;

      // And observe the setting.
      // We'll broadcast an event any time any setting changes.
      observe(name, key);
    });

    // Query the current value of all of the settings.
    // Broadcast an event when all queries have returned
    query(settingsNames);

    function observe(name, key) {
      navigator.mozSettings.addObserver(key, function(e) {
        values[name] = e.settingValue;
        notify();
      });
    }

    function query(names) {
      var lock = navigator.mozSettings.createLock();
      var numSettings = names.length;
      var numResults = 0;

      names.forEach(function(name) {
        var key = definitions[name].key;
        var request = lock.get(key);
        request.onsuccess = function() {
          recordResult(name, request.result[key]);
        };
        request.onerror = function(e) {
          console.warn('Error querying setting', key, ':', e.error);
          recordResult(name);
        };
      });

      function recordResult(name, value) {
        if (value !== undefined)
          values[name] = value;
        numResults++;

        if (numResults === numSettings) {
          notify();
        }
      }
    }

    function notify() {
      dispatcher.dispatchEvent(new Event('settingschanged'));
    }
  }

  // EventTarget methods
  Settings.prototype.addEventListener = function addEventListener(t, f) {
    this.dispatcher.addEventListener(t, f);
  };

  Settings.prototype.removeEventListener = function removeEventListener(t, f) {
    this.dispatcher.removeEventListener(t, f);
  };

  exports.Settings = Settings;
}(window));
