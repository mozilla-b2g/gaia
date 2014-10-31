(function() {
  'use strict';

  // Get the handwriting settings, and then show the panel afterwards
  var section = document.querySelector('#handwriting-settings');

  getHandwritingSettings(section, function() {
    section.style.display = 'block';
  });

  /**
   * Gets the handwriting settings based on information from the dom
   */
  function getHandwritingSettings(section, callback) {
    if (!navigator.mozSettings) {
      return;
    }

    var li = section.querySelectorAll('li[data-setting]');
    var lock = navigator.mozSettings.createLock();
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
  }
})();
