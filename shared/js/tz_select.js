/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function tzSelect(regionSelector, citySelector, onchange, onload) {
  var TIMEZONE_FILE = '/shared/resources/tz.json';
  var APN_TZ_FILE = '/shared/resources/apn_tz.json';

  function loadJSON(name, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', name, true);
    xhr.responseType = 'json';
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        var response = null;
        if (xhr.status == 200 || xhr.status === 0) {
          response = xhr.response;
        }
        callback(response);
      }
    };
    xhr.send();
  }

  /**
   * Activate a timezone selector UI
   */

  function newTZSelector(onchangeTZ, currentID) {
    var gRegion = currentID.replace(/\/.*/, '');
    var gCity = currentID.replace(/.*?\//, '');
    var gTZ = null;
    var loaded = false;

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
      fillCities();
    }

    function fillCities() {
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

      if (loaded) {
        setTimezone();
      } else {
        if (onload) {
          onload(getTZInfo());
        }
        loaded = true;
      }
    }

    function setTimezone() {
      onchangeTZ(getTZInfo());
    }

    function getTZInfo() {
      var res = gTZ[gRegion][citySelector.value];
      gCity = res.city;
      var offset = res.offset.split(',');
      return {
        id: res.id || gRegion + '/' + res.city,
        region: getSelectedText(regionSelector),
        city: getSelectedText(citySelector),
        cc: res.cc,
        utcOffset: offset[0],
        dstOffset: offset[1]
      };
    }

    regionSelector.onchange = fillCities;
    citySelector.onchange = setTimezone;
    loadJSON(TIMEZONE_FILE, function loadTZ(response) {
      gTZ = response;
      fillRegions();
    });
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

    function initialize(initialValue) {
      // initialize the timezone selector with the initial TZ setting
      newTZSelector(function updateTZ(tz) {
        var req = settings.createLock().set({'time.timezone': tz.id});
        if (onchange) {
          req.onsuccess = function updateTZ_callback() {
            // Store the user manually selected timezone separately
            settings.createLock().set({'time.timezone.user-selected': tz.id});

            // Wait until the timezone is actually set
            // before calling the callback.
            window.addEventListener('moztimechange', function timeChanged() {
              window.removeEventListener('moztimechange', timeChanged);
              onchange(tz);
            });
          };
        }
      }, initialValue);
    }

    var reqTimezone = settings.createLock().get('time.timezone');
    reqTimezone.onsuccess = function dt_getStatusSuccess() {
      // Load the time zone the user manually selected last time
      var reqUserTZ = settings.createLock().get('time.timezone.user-selected');
      reqUserTZ.onsuccess = function dt_getUserTimezoneSuccess() {
        var userSelTimezone = reqUserTZ.result['time.timezone.user-selected'];
        if (userSelTimezone) {
          initialize(userSelTimezone);
          return;
        }

        /**
         * Try to guess the current timezone from the MCC/MNC tuple.
         * Worst case scenario: default to New York (which is just as good or
         * bad as anything else -- we used to default to Pago Pago)
         */
        var tzDefault = 'America/New_York';

        // retrieve MCC/MNC
        var mcc, mnc;
        var conn = navigator.mozMobileConnection;
        if (conn) {
          // Default to the SIM codes, but we actually prefer the current
          // network codes.
          if (conn.iccInfo) {
            mcc = conn.iccInfo.mcc;
            mnc = conn.iccInfo.mnc;
          }
          if (conn.voice && conn.voice.network) {
            mcc = conn.voice.network.mcc;
            mnc = conn.voice.network.mnc;
          }
        }
        if (!mcc) {
          initialize(tzDefault);
          return;
        }

        // most MCC values only match one country (hence one timezone);
        // for the few MCC values that match several countries, rely on MNC.
        loadJSON(APN_TZ_FILE, function(response) {
          if (response) {
            var tz = response[mcc];
            if (typeof(tz) == 'string') {
              tzDefault = tz;
            } else if (mnc in tz) {
              tzDefault = tz[mnc];
            }
          }
          initialize(tzDefault);
        });
      };
    };

    function setTimezoneDescription(timezoneID) {
      regionSelector.value = timezoneID.replace(/\/.*/, '');
      citySelector.value = timezoneID.replace(/.*?\//, '');
    }
  }


  /**
   * Startup -- make sure webL10n is ready before using tzSelect()
   */

  newTZObserver();
}

