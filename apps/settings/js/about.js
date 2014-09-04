/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var About = {
  init: function about_init() {
    document.getElementById('check-update-now').onclick = this.checkForUpdates;
    this.loadHardwareInfo();
    this.loadLastUpdated();
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
          navigator.mozL10n.setAttributes(span,
            'unknown-phoneNumber-sim', { index: index + 1 });
        } else {
          navigator.mozL10n.setAttributes(span, 'unknown-phoneNumber');
        }
      }
      deviceInfoMsisdns.appendChild(span);
    });

    deviceInfoPhoneNum.hidden = !showListItem;
  },

  checkForUpdates: function about_checkForUpdates() {
    var settings = Settings.mozSettings;
    var _ = navigator.mozL10n.get;

    if (!settings) {
      return;
    }

    if (!navigator.onLine) {
      alert(_('no-network-when-update'));
      return;
    }

    var updateStatus = document.getElementById('update-status');
    var systemStatus = updateStatus.querySelector('.system-update-status');

    var checkStatus = {
      'gecko.updateStatus': {},
      'apps.updateStatus': {}
    };

    updateStatus.classList.add('checking', 'visible');

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

      var l10nValues = [
        'no-updates', 'already-latest-version', 'retry-when-online'];

      if (value !== 'check-complete') {
        var id = l10nValues.indexOf(value) !== -1 ? value : 'check-error';
        systemStatus.setAttribute('data-l10n-id', id);
        if (id == 'check-error') {
          console.error('Error checking for system update:', value);
        }
      }

      checkIfStatusComplete();

      settings.removeObserver(setting, checkStatus[setting].cb);
      checkStatus[setting].cb = null;
    }

    /* remove whatever was there before */
    systemStatus.textContent = '';

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
navigator.mozL10n.once(About.init.bind(About));

