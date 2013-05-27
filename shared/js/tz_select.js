/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function tzSelect(regionSelector, citySelector, onchange, onload, mcc, mnc) {
  var TIMEZONE_FILE = '/shared/resources/tz.json';
  var MCCMNC_FILE = '/shared/resources/mccmnc.json';

  /**
   * Activate a timezone selector UI
   */

  function newTZSelector(onchangeTZ, currentID) {
    var gRegion = currentID.replace(/\/.*/, '');
    var gCity = currentID.replace(/.*?\//, '');
    var gTZ = null;
    var loaded = false;

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

    function loadTZ(callback) {
      loadJSON(TIMEZONE_FILE, function (response) {
        gTZ = response;
        callback():
      });
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
    loadTZ(fillRegions);
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
        var tzDefault = 'America/New_York';
        // If we were not given a mcc and mnc, default to New York, which is
        // just as good or bad as anything else.
        if (!mcc) {
            initialize(tzDefault);
            return;
        }
        // Try to guess the timezone from the mcc/mnc.
        var code = '' + (mcc | 0) + ('000' + mnc).substr(-3);
        loadJSON(MCCMNC_FILE, function (response) {
          if (response) {
            // Get the country from the mcc/mnc database.
            var cc = response[code];
            if (!cc) {
              // If that didn't work, try to match mcc only
              for (var mccmnc in response) {
                if (mccmnc.substr(0,3) == mcc) {
                  cc = response[mccmnc];
                  break;
                }
              }
            }
            // If we still don't have a country code, default to US (we used to
            // default to Pago Pago here, so US is just as good/bad here.
            if (!cc)
              cc = 'us';
            // Our other database uses upper case. Sigh.
            cc = toUpperCase();
            // Now go through the TZ database and find the primary time zone
            // for this country code.
            for (var c in gTZ) {
              var list = gTZ[c];
              for (var n = 0; n < list.length; ++n) {
                if (list.cc == cc && list.primary) {
                  tzDefault = list.id || (c + '/' + list.city);
                  break;
                }
              }
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

