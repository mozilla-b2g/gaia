/* globals IccHelper */
/* exported tzSelect */
'use strict';

function tzSelect(regionSelector, citySelector, onchange, onload) {
  const TIMEZONE_FILE = '/shared/resources/tz.json';
  const APN_TZ_FILE = '/shared/resources/apn_tz.json';

  const TIMEZONE_NONE = 'NONE';
  const TIMEZONE_NETWORK = 'NETWORK';
  const TIMEZONE_SIM = 'SIM';
  const TIMEZONE_USER = 'USER';
  const TIMEZONE_PREVIOUS_SETTING = 'PREVIOUS_SETTING';

  function loadJSON(href, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', href, true);
    xhr.responseType = 'json';
    xhr.onerror = callback;
    xhr.onload = function() {
      callback(xhr.response);
    };
    xhr.onerror = function() {
     console.error('Error getting file');
     callback(xhr.response);
    };
    xhr.send();
  }


  /**
   * Guess the current timezone from the MCC/MNC tuple
   */
  function getDefaultTimezoneID(callback) {
    if (!callback) {
      return;
    }

    // Worst case scenario: default to New York (which is just as good or
    // bad as anything else -- we used to default to Pago Pago)
    var tzDefault = 'America/New_York';
    var source = TIMEZONE_NONE;

    // retrieve MCC/MNC: use the current network codes when available,
    // default to the SIM codes if necessary.
    var mcc, mnc;

    var connections = window.navigator.mozMobileConnections || [];

    for (var i = 0; i < connections.length; ++i) {
      var conn = connections[i];
      if (conn && conn.voice && conn.voice.network && conn.voice.connected) {
        // we have connection available, so we use it
        mcc = conn.voice.network.mcc;
        mnc = conn.voice.network.mnc;
        source = TIMEZONE_NETWORK;
        break;
      }
    }

    if (!mcc && IccHelper && IccHelper.iccInfo) {
      // we don't have connection available, we rely on the SIM
      mcc = IccHelper.iccInfo.mcc;
      mnc = IccHelper.iccInfo.mnc;
      source = TIMEZONE_SIM;
      // if SIM is not available, mcc and mnc are null,
      // so we wait for a future event where we have access to the SIM.
      if (IccHelper.cardState !== 'ready') {
        IccHelper.addEventListener('iccinfochange', function simReady() {
          if (IccHelper.iccInfo.mcc) {
            IccHelper.removeEventListener('iccinfochange', simReady);
          }
          getDefaultTimezoneID(callback);
        });
      }
    }

    if (!mcc) {
      callback(tzDefault, TIMEZONE_NONE);
      return;
    }

    // most MCC values only match one country (hence one timezone);
    // for the few MCC values that match several countries, rely on MNC.
    loadJSON(APN_TZ_FILE, function(response) {
      if (response) {
        var tz = response[mcc];
        if (typeof(tz) === 'string') {
          callback(tz, source);
          return;
        } else if (tz && (mnc in tz)) {
          callback(tz[mnc], source);
          return;
        }
      }
      callback(tzDefault, TIMEZONE_NONE);
    });
  }


  /**
   * Activate a timezone selector UI
   */
  function newTZSelector(onchangeTZ, currentID, source) {
    // for region, we use whatever is BEFORE the /
    var gRegion = currentID.replace(/\/.*/, '');
    // for city, we use whatever is AFTER the /
    var gCity = currentID.replace(/.*?\//, '');
    var gTZ = null;

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
          selected: (c === gRegion)
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
          selected: (list[i].city === gCity)
        });
      }
      fillSelectElement(citySelector, options);
      setTimezone();
    }

    function setTimezone() {
      if (source === TIMEZONE_PREVIOUS_SETTING) {
        onload && onload(getTZInfo(), true);
        return;
      }
      onchangeTZ(getTZInfo(), {
        'changedByUser': source === TIMEZONE_USER,
        'needsConfirmation': source !== TIMEZONE_USER &&
                             source !== TIMEZONE_NETWORK});
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

    regionSelector.onchange = function() {
      source = TIMEZONE_USER;
      fillCities();
    };
    citySelector.onchange = function() {
      source = TIMEZONE_USER;
      setTimezone();
    };

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
    if (!settings) {
      return;
    }

    settings.addObserver('time.timezone', function(event) {
      setTimezoneDescription(event.settingValue);
    });

    var systemTimeChanged = function() {
      onchange(systemTimeChanged.tz, systemTimeChanged.needsConfirmation);
    };

    function updateTZ(tz, options) {
      // Update data for our callback.
      systemTimeChanged.tz = tz;
      systemTimeChanged.needsConfirmation = options.needsConfirmation;
      // Set the timezone in the settings (this causes system time to change).
      var req = settings.createLock().set({'time.timezone': tz.id});
      req.onsuccess = function updateTZ_callback() {
        // Store the user manually selected timezone separately
        if (options.changedByUser) {
          settings.createLock().set({'time.timezone.user-selected': tz.id});
        } else {
          onload && onload(tz, options.needsConfirmation);
        }
     };
    }

    function initSelector(initialValue, source) {
      // Wait until the timezone is actually set before calling the callback.
      // Only register this once!
      onchange && window.addEventListener('moztimechange', systemTimeChanged);
      // Get rid of our listener when we unload.
      onchange && window.addEventListener('unload', function() {
        window.removeEventListener('moztimechange', systemTimeChanged);
      });

      // initialize the timezone selector with the initial TZ setting
      newTZSelector(updateTZ, initialValue, source);
    }

    var reqTimezone = settings.createLock().get('time.timezone');
    reqTimezone.onsuccess = function dt_getStatusSuccess() {
      // load the timezone the user manually selected last time,
      // or get the default timezone for the current carrier
      var reqUserTZ = settings.createLock().get('time.timezone.user-selected');
      reqUserTZ.onsuccess = function dt_getUserTimezoneSuccess() {
        var userSelTimezone = reqUserTZ.result['time.timezone.user-selected'];
        if (userSelTimezone) {
          initSelector(userSelTimezone, TIMEZONE_PREVIOUS_SETTING);
        } else {
          getDefaultTimezoneID(initSelector);
        }
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

