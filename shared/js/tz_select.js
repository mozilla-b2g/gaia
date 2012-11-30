/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function tzSelect(contSelector, citySelector, onchange) {
  var TIMEZONE_FILE = '/shared/resources/tz.json';


  /**
   * Activate a timezone selector UI
   */

  function newTZSelector(onchangeTZ, currentID) {
    var gContinent = currentID.replace(/\/.*/, '');
    var gCity = currentID.replace(/.*?\//, '');
    var gTZ = null;

    function loadTZ(callback) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', TIMEZONE_FILE, true);
      xhr.responseType = 'json';
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
          if (xhr.status == 200 || xhr.status === 0) {
            gTZ = xhr.response;
          }
          callback();
        }
      };
      xhr.send();
    }

    function fillContinents() {
      var _ = navigator.mozL10n.get;
      contSelector.innerHTML = '';
      for (var c in gTZ) {
        var option = document.createElement('option');
        option.textContent = _('tz-' + c) || c;
        option.selected = (c == gContinent);
        contSelector.appendChild(option);
      }
      fillCities();
    }

    function fillCities() {
      gContinent = contSelector.value;
      citySelector.innerHTML = '';
      var list = gTZ[gContinent];
      for (var i = 0; i < list.length; i++) {
        var option = document.createElement('option');
        option.value = i;
        option.textContent = list[i].name || list[i].city.replace(/_/g, ' ');
        option.selected = (list[i].city == gCity);
        citySelector.appendChild(option);
      }
      setTimezone();
    }

    function setTimezone() {
      var res = gTZ[gContinent][citySelector.value];
      gCity = res.city;
      var offset = res.offset.split(',');
      onchangeTZ({
        id: res.id || gContinent + '/' + res.city,
        city: res.name || res.city.replace(/_/g, ' '),
        cc: res.cc,
        utcOffset: offset[0],
        dstOffset: offset[1]
      });
    }

    contSelector.onchange = fillCities;
    citySelector.onchange = setTimezone;
    loadTZ(fillContinents);
  }


  /**
   * Monitor time.timezone changes
   */

  function newTZObserver() {
    var settings = window.navigator.mozSettings;
    if (!settings)
      return;

    settings.addObserver('time.timezone', function(event) {
      setTimezoneDescription(event.settingValue);
    });

    var reqTimezone = settings.createLock().get('time.timezone');
    reqTimezone.onsuccess = function dt_getStatusSuccess() {
      var lastMozSettingValue = reqTimezone.result['time.timezone'];
      if (!lastMozSettingValue) {
        lastMozSettingValue = 'Pacific/Pago_Pago';
      }

      setTimezoneDescription(lastMozSettingValue);

      // initialize the timezone selector with the initial TZ setting
      newTZSelector(function updateTZ(tz) {
        var req = settings.createLock().set({ 'time.timezone': tz.id });
        if (onchange) {
          req.onsuccess = function updateTZ_callback() {
            onchange(tz);
          }
        }
      }, lastMozSettingValue);

      console.log('Initial TZ value: ' + lastMozSettingValue);
    };

    function setTimezoneDescription(timezoneID) {
      contSelector.value = timezoneID.replace(/\/.*/, '');
      citySelector.value = timezoneID.replace(/.*?\//, '');
    }
  }


  /**
   * Startup -- make sure webL10n is ready before using tzSelect()
   */

  newTZObserver();
}

