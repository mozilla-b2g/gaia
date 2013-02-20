/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function tzSelect(regionSelector, citySelector, onchange, resetTimezoneOnStartup) {
  var TIMEZONE_FILE = '/shared/resources/tz.json';


  /**
   * Activate a timezone selector UI
   */

  function newTZSelector(onchangeTZ, currentID) {
    console.log('# New TZselector - ' + currentID);
    var gRegion = currentID.replace(/\/.*/, '');
    var gCity = currentID.replace(/.*?\//, '');
    var gTZ = null;

    function loadTZ(callback) {
      console.log('-- loading TimeZones...');
      var xhr = new XMLHttpRequest();
      xhr.open('GET', TIMEZONE_FILE, true);
      xhr.responseType = 'json';
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
          if (xhr.status == 200 || xhr.status === 0) {
            gTZ = xhr.response;
          }
          console.log('++ TimeZones loaded...');
          callback();
        }
      };
      xhr.send();
    }

    function fillSelectElement(selector, options) {
      selector.innerHTML = '';
      options.sort(function(a, b) {
        return (a.text > b.text);
      });
      for (var i = 0; i < options.length; i++) {
        var option = document.createElement('option');
        option.textContent = options[i].text;
        option.selected = options[i].selected;
        option.value = options[i].value;
        selector.appendChild(option);
      }
    }

    function getSelectedText(selector) {
      var options = selector.querySelectorAll('option');
      return options[selector.selectedIndex].textContent;
    }

    function fillRegions() {
      console.log('-- loading regions...');
      var _ = navigator.mozL10n.get;
      var options = [];
      for (var c in gTZ) {
        options.push({
          text: _('tzRegion-' + c) || c,
          value: c,
          selected: (c == gRegion)
        });
      }
      fillSelectElement(regionSelector, options);
      console.log('++ regions loaded.');
      fillCities();
    }

    function fillCities() {
      console.log('-- loading cities...');
      gRegion = regionSelector.value;
      var list = gTZ[gRegion];
      var options = [];
      for (var i = 0; i < list.length; i++) {
        options.push({
          text: list[i].name || list[i].city.replace(/_/g, ' '),
          value: i,
          selected: (list[i].city == gCity)
        });
      }
      fillSelectElement(citySelector, options);
      console.log('++ Cities loaded.');
      console.log('ResetTimeZone = ' + resetTimezoneOnStartup);
      if (resetTimezoneOnStartup) {
        console.log('... reseteamos timezone');
        setTimezone();
      }
    }

    function setTimezone() {
      console.log('-- setting TimeZones...');
      var res = gTZ[gRegion][citySelector.value];
      gCity = res.city;
      var offset = res.offset.split(',');
      console.log('++ TimeZone set, callback time...');
      onchangeTZ({
        id: res.id || gRegion + '/' + res.city,
        region: getSelectedText(regionSelector),
        city: getSelectedText(citySelector),
        cc: res.cc,
        utcOffset: offset[0],
        dstOffset: offset[1]
      });
    }

    regionSelector.onchange = fillCities;
    citySelector.onchange = setTimezone;
    loadTZ(fillRegions);
  }


  /**
   * Monitor time.timezone changes
   */

  function newTZObserver() {
    console.log('# New TZobserver');
    var settings = window.navigator.mozSettings;
    if (!settings)
      return;

    settings.addObserver('time.timezone', function(event) {
      setTimezoneDescription(event.settingValue);
    });

    var reqTimezone = settings.createLock().get('time.timezone');
    reqTimezone.onsuccess = function dt_getStatusSuccess() {
      console.log('-- read setting time.timezone = ' + reqTimezone.result['time.timezone']);
      var lastMozSettingValue = reqTimezone.result['time.timezone'];
      if (!lastMozSettingValue) {
        lastMozSettingValue = 'Pacific/Pago_Pago';
      }

      setTimezoneDescription(lastMozSettingValue);

      // initialize the timezone selector with the initial TZ setting
      newTZSelector(function updateTZ(tz) {
        console.log('# Updating TZ');
        var req = settings.createLock().set({ 'time.timezone': tz.id });
        if (onchange) {
          req.onsuccess = function updateTZ_callback() {
            console.log('-- modified time.timezone to ' + tz.id);
            // Wait until the timezone is actually set
            // before calling the callback.
            window.addEventListener('moztimechange', function timeChanged() {
              console.log('-- triggered moztimechange by ' + tz.id);
              window.removeEventListener('moztimechange', timeChanged);
              onchange(tz);
            });
          }
        }
      }, lastMozSettingValue);

      console.log('Initial TZ value: ' + lastMozSettingValue);
    };

    function setTimezoneDescription(timezoneID) {
      console.log('# Set TimeZone Description with ' + timezoneID);
      regionSelector.value = timezoneID.replace(/\/.*/, '');
      citySelector.value = timezoneID.replace(/.*?\//, '');
    }
  }


  /**
   * Startup -- make sure webL10n is ready before using tzSelect()
   */

  newTZObserver();
}

