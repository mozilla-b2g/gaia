(function() {
  // Get the settings, and then show the panel afterwards
  var panel = document.querySelector('#general-settings');
  getSettings(panel, function() {
    panel.style.display = 'block';
  });

  // Until Haida lands this is how users could go back to Settings app
  document.getElementById('back').addEventListener('click', function() {
    var activity = new MozActivity({
      name: 'configure',
      data: {
        target: 'device',
        postback: false
      }
    });

    // Close ourself after the activity transition is completed.
    setTimeout(function() {
      window.close();
    }, 1000);
  });

  /**
   * Gets the settings based on information from the dom
   */
  function getSettings(section, callback) {
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
})();
