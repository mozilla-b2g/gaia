/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var StatusBar = {
  init: function sb_init() {
    var touchables = [
      document.getElementById('notifications-screen'),
      document.getElementById('statusbar')
    ];
    NotificationScreen.init(touchables);

    window.addEventListener('screenchange', this);

    this.refresh();
  },

  handleEvent: function sb_handleEvent(evt) {
    this.refresh();
  },

  refresh: function sb_refresh() {
    updateClock();
    updateBattery();
    updateConnection();
  }
};

// Update the clock and schedule a new update if appropriate
function updateClock() {
  if (!ScreenManager.screenEnabled)
    return;

  var now = new Date();
  var match = document.getElementsByClassName('time');
  for (var n = 0; n < match.length; ++n) {
    var element = match[n];
    element.textContent = now.toLocaleFormat(element.dataset.format);
  }

  // Schedule another clock update when a new minute rolls around
  var now = new Date();
  var sec = now.getSeconds();
  window.setTimeout(updateClock, (59 - sec) * 1000);
}

function updateBattery() {
  var battery = window.navigator.mozBattery;
  if (!battery)
    return;

  // If the display is off, there is nothing to do here
  if (!ScreenManager.screenEnabled) {
    battery.removeEventListener('chargingchange', updateBattery);
    battery.removeEventListener('levelchange', updateBattery);
    battery.removeEventListener('statuschange', updateBattery);
    return;
  }

  var elements = document.getElementsByClassName('battery');
  for (var n = 0; n < elements.length; ++n) {
    var element = elements[n];
    var fuel = element.children[0];
    var level = battery.level * 100;

    var charging = element.children[1];
    if (battery.charging) {
      charging.hidden = false;
      fuel.className = 'charging';
      fuel.style.minWidth = (level / 5.88) + 'px';
    } else {
      charging.hidden = true;

      fuel.style.minWidth = fuel.style.width = (level / 5.88) + 'px';
      if (level <= 10)
        fuel.className = 'critical';
      else if (level <= 30)
        fuel.className = 'low';
      else
        fuel.className = '';
    }
  }

  // Make sure we will be called for any changes to the battery status
  battery.addEventListener('chargingchange', updateBattery);
  battery.addEventListener('levelchange', updateBattery);
  battery.addEventListener('statuschange', updateBattery);
}

function updateConnection(event) {
  var _ = document.mozL10n.get;

  var conn = window.navigator.mozMobileConnection;
  if (!conn) {
    return;
  }
  var voice = conn.voice;
  if (!voice) {
    return;
  }

  var airplaneMode = false;
  var settings = window.navigator.mozSettings;
  if (settings) {
    var settingName = 'ril.radio.disabled';
    var req = settings.getLock().get(settingName);
    req.onsuccess = function() {
      airplaneMode = req.result[settingName];
      if (airplaneMode) {
        document.getElementById('titlebar').textContent = _('airplane');
      }
    }
  }

  if (!ScreenManager.screenEnabled) {
    conn.removeEventListener('cardstatechange', updateConnection);
    conn.removeEventListener('voicechange', updateConnection);
    conn.removeEventListener('datachange', updateConnection);
    return;
  }

  // Update the operator name / SIM status.
  var title = '';
  if (conn.cardState == 'absent') {
    title = _('noSimCard');
  } else if (conn.cardState == 'pin_required') {
    title = _('pinCodeRequired');
  } else if (conn.cardState == 'puk_required') {
    title = _('pukCodeRequired');
  } else if (conn.cardState == 'network_locked') {
    title = _('networkLocked');
  } else if (!voice.connected) {
    if (voice.emergencyCallsOnly) {
      title = _('emergencyCallsOnly');
    } else {
      title = _('searching');
    }
  } else {
    if (voice.roaming) {
      title = _('roaming', { operator: (voice.operator || '') });
    } else {
      title = voice.operator || '';
    }
  }
  document.getElementById('titlebar').textContent = title;

  // Update the 3G/data status.
  var dataType = conn.data.connected ? conn.data.type : '';
  document.getElementById('data').textContent = dataType;

  // Update the signal strength bars.
  var signalElements = document.querySelectorAll('#signal > span');
  for (var i = 0; i < 4; i++) {
    var haveSignal = (i < voice.relSignalStrength / 25);
    var el = signalElements[i];
    if (haveSignal) {
      el.classList.add('haveSignal');
    } else {
      el.classList.remove('haveSignal');
    }
  }

  conn.addEventListener('cardstatechange', updateConnection);
  conn.addEventListener('voicechange', updateConnection);
  conn.addEventListener('datachange', updateConnection);
}

if ('mozWifiManager' in window.navigator) {
  window.addEventListener('DOMContentLoaded', function() {
    var wifiIndicator = document.getElementById('wifi');
    window.navigator.mozWifiManager.connectionInfoUpdate = function(event) {
      // relSignalStrength should be between 0 and 100
      var level = Math.min(Math.floor(event.relSignalStrength / 20), 4);
      wifiIndicator.className = 'signal-level' + level;
    };
  });
}

