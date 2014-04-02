/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var About = {
  init: function about_init() {
    document.getElementById('check-update-now').onclick = this.checkForUpdates;
    this.loadHardwareInfo();
    this.loadLastUpdated();
    this.networkStatus();
  },

  networkStatus: function about_networkStatus() {
    var button = document.getElementById('check-update-now');
    var status = {
      offline: function() { button.disabled = true; },
      online: function() { button.disabled = false; }
    };
    window.addEventListener('offline', status.offline);
    window.addEventListener('online', status.online);
    status[(window.navigator.onLine ? 'online' : 'offline')]();
  },

  loadLastUpdated: function about_loadLastUpdated() {
    var settings = Settings.mozSettings;
    if (!settings)
      return;

    var lastUpdateDate = document.getElementById('last-update-date');
    var lock = settings.createLock();
    var key = 'deviceinfo.last_updated';
    var request = lock.get(key);
    request.onsuccess = function() {
      var lastUpdated = request.result[key];
      if (!lastUpdated) {
        return;
      }

      var f = new navigator.mozL10n.DateTimeFormat();
      var _ = navigator.mozL10n.get;
      lastUpdateDate.textContent =
          f.localeFormat(new Date(lastUpdated), _('shortDateTimeFormat'));
    };
  },

  loadHardwareInfo: function about_loadHardwareInfo() {
    var deviceInfoPhoneNum = document.getElementById('deviceinfo-phone-num');
    var deviceInfoMsisdns = document.getElementById('deviceInfo-msisdns');
    var conns = navigator.mozMobileConnections;

    if (!conns) {
      deviceInfoPhoneNum.hidden = true;
      return;
    }

    var multiSim = conns.length > 1;
    // Only show the list item when there are valid iccinfos.
    var showListItem = false;

    // update msisdns
    while (deviceInfoMsisdns.hasChildNodes()) {
      deviceInfoMsisdns.removeChild(deviceInfoMsisdns.lastChild);
    }

    Array.prototype.forEach.call(conns, function(conn, index) {
      var iccId = conn.iccId;
      if (!iccId) {
        return;
      }
      var iccObj = navigator.mozIccManager.getIccById(iccId);
      if (!iccObj) {
        return;
      }
      var iccInfo = iccObj.iccInfo;
      if (!iccInfo) {
        return;
      }

      showListItem = true;
      // If the icc card is gsm card, the phone number is in msisdn.
      // Otherwise, the phone number is in mdn.
      var span = document.createElement('span');
      var msisdn = iccInfo.msisdn || iccInfo.mdn;
      if (msisdn) {
        span.textContent = multiSim ?
          'SIM ' + (index + 1) + ': ' + msisdn : msisdn;
      } else {
        if (multiSim) {
          navigator.mozL10n.localize(span,
            'unknown-phoneNumber-sim', { index: index + 1 });
        } else {
          navigator.mozL10n.localize(span, 'unknown-phoneNumber');
        }
      }
      deviceInfoMsisdns.appendChild(span);
    });

    deviceInfoPhoneNum.hidden = !showListItem;
  },

  checkForUpdates: function about_checkForUpdates() {
    var settings = Settings.mozSettings;
    if (!settings)
      return;

    var _ = navigator.mozL10n.get;
    var updateStatus = document.getElementById('update-status'),
        systemStatus = updateStatus.querySelector('.system-update-status');

    function onUpdateStatus(setting, event) {
      var value = event.settingValue;
      checkStatus[setting].value = value;

      /**
       * possible return values:
       *
       * - for system updates:
       *   - no-updates
       *   - already-latest-version
       *   - check-complete
       *   - retry-when-online
       *   - check-error-$nsresult
       *   - check-error-http-$code
       *
       * - for apps updates:
       *   - check-complete
       *
       * use
       * http://mxr.mozilla.org/mozilla-central/ident?i=setUpdateStatus&tree=mozilla-central&filter=&strict=1
       * to check if this is still current
       */

      if (value !== 'check-complete') {
        systemStatus.textContent = _(value) || _('check-error');
        console.error('Error checking for system update:', value);
      }

      checkIfStatusComplete();

      settings.removeObserver(setting, checkStatus[setting].cb);
      checkStatus[setting].cb = null;
    }

    function checkIfStatusComplete() {
      var hasAllCheckComplete =
        Object.keys(checkStatus).every(function(setting) {
          return checkStatus[setting].value === 'check-complete';
        });

      var hasAllResponses =
        Object.keys(checkStatus).every(function(setting) {
          return !!checkStatus[setting].value;
        });

      if (hasAllCheckComplete) {
        updateStatus.classList.remove('visible');
        systemStatus.textContent = '';
      }

      if (hasAllResponses) {
        updateStatus.classList.remove('checking');
      }
    }

    /* Firefox currently doesn't implement adding 2 classes in one call */
    /* see Bug 814014 */
    updateStatus.classList.add('checking');
    updateStatus.classList.add('visible');

    /* remove whatever was there before */
    systemStatus.textContent = '';

    var checkStatus = {
      'gecko.updateStatus': {},
      'apps.updateStatus': {}
    };

    for (var setting in checkStatus) {
      checkStatus[setting].cb = onUpdateStatus.bind(null, setting);
      settings.addObserver(setting, checkStatus[setting].cb);
    }

    var lock = settings.createLock();
    lock.set({
      'gaia.system.checkForUpdates': true
    });
  }
};

// startup
navigator.mozL10n.ready(About.init.bind(About));

