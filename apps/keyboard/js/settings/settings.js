(function() {
  // Get the settings, and then show the panel afterwards
  var panel = document.querySelector('#general-settings');

  getGeneralSettings(panel, function() {
    panel.style.display = 'block';
  });

  var section = document.querySelector('#handwriting-settings');
  getHandwritingSettings(section, function() {
    section.style.display = 'block';
  });

  document.addEventListener('visibilitychange', function() {
    if (document.mozHidden) {
      window.close();
    }
  });

  function goBack() {
    this.removeEventListener('action', goBack);
    var activity = new MozActivity({
      name: 'configure',
      data: {
        target: 'device'
      }
    });
  }

  // Until Haida lands this is how users could go back to Settings app
  document.getElementById('header').addEventListener('action', goBack);

  /**
   * Gets the general settings based on information from the dom
   */
  function getGeneralSettings(section, callback) {
    if (!navigator.mozSettings) {
      return callback();
    }

    var li = section.querySelectorAll('li[data-setting]');
    var lock = navigator.mozSettings.createLock();
    var toCompletion = li.length;

    [].forEach.call(li, function(item) {
      var key = item.dataset.setting;
      var cb = item.querySelector('input[type=checkbox]');

      var getReq = lock.get(key);
      getReq.onsuccess = function() {
        if (getReq.result[key] !== undefined) {
          cb.checked = getReq.result[key];
        }
        if (--toCompletion === 0) {
          callback();
        }
      };
      getReq.onerror = function() {
        // onerror the checked value is the default value
        if (--toCompletion === 0) {
          callback();
        }
      };

      // Toggling checkbox updates the setting
      cb.addEventListener('change', function(e) {
        var setLock = navigator.mozSettings.createLock();
        var obj = {};
        obj[key] = cb.checked;
        setLock.set(obj);
      });
    });
  }

  /**
   * Gets the handwriting settings based on information from the dom
   */
  function getHandwritingSettings(section, callback) {
    if (!navigator.mozSettings) {
      return;
    }

    var keyboardKey = 'keyboard.enabled-layouts';
    var lock = navigator.mozSettings.createLock();

    var req = lock.get(keyboardKey);
    req.onsuccess = function() {
      // Get installed keyboards.
      var keyboards = req.result[keyboardKey];

      // Get built-in keyboard
      var defaultKeyboardManifestURL =
        'app://keyboard.gaiamobile.org/manifest.webapp';
      var defaultKeyboard = keyboards[defaultKeyboardManifestURL];

      // Get enabled layouts in built-in keyboard
      for (var layout in defaultKeyboard) {
        // Check handwriting layout
        var reg = /handwriting/i;
        if (layout.match(reg)) {
          var li = section.querySelectorAll('li[data-setting]');
          var toCompletion = li.length;

          [].forEach.call(li, function(item) {
            var key = item.dataset.setting;
            var range = item.querySelector('input[type=range]');

            var getReq = lock.get(key);
            getReq.onsuccess = function() {
              if (getReq.result[key] !== undefined) {
                range.value = getReq.result[key];
              }
              if (--toCompletion === 0) {
                callback();
              }
            };

            getReq.onerror = function() {
              // onerror the range value is the default value
              if (--toCompletion === 0) {
                callback();
              }
            };

            // Adjusting range slider updates the setting
            range.addEventListener('change', function(e) {
              var setLock = navigator.mozSettings.createLock();
              var obj = {};
              obj[key] = range.valueAsNumber;
              setLock.set(obj);
            });
          });
          return;
        }
      }
    };
    req.onerror = function() {
      console.error('Error occured when getting ' + keyboardKey);
    };
  }
})();
