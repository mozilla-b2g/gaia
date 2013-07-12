/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var About = {
  init: function about_init() {
    document.getElementById('check-update-now').onclick = this.checkForUpdates;
    document.getElementById('ftuLauncher').onclick = this.launchFTU;
    this.loadHardwareInfo();
    this.loadGaiaCommit();
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

  loadGaiaCommit: function about_loadGaiaCommit() {
    var GAIA_COMMIT = 'resources/gaia_commit.txt';

    var dispDate = document.getElementById('gaia-commit-date');
    var dispHash = document.getElementById('gaia-commit-hash');
    if (dispHash.textContent)
      return; // `gaia-commit.txt' has already been loaded

    function dateToUTC(d) {
      var arr = [];
      [
        d.getUTCFullYear(), (d.getUTCMonth() + 1), d.getUTCDate(),
        d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()
      ].forEach(function(n) {
        arr.push((n >= 10) ? n : '0' + n);
      });
      return arr.splice(0, 3).join('-') + ' ' + arr.join(':');
    }

    var req = new XMLHttpRequest();
    req.onreadystatechange = (function(e) {
      if (req.readyState === 4) {
        if (req.status === 0 || req.status === 200) {
          var data = req.responseText.split('\n');

          /**
           * XXX it would be great to pop a link to the github page showing the
           * commit, but there doesn't seem to be any way to tell the browser
           * to do it.
           */

          var d = new Date(parseInt(data[1] + '000', 10));
          dispDate.textContent = dateToUTC(d);
          dispHash.textContent = data[0];
        } else {
          console.error('Failed to fetch gaia commit: ', req.statusText);
        }
      }
    }).bind(this);

    req.open('GET', GAIA_COMMIT, true); // async
    req.responseType = 'text';
    req.send();
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
    var mobileConnection = getMobileConnection();
    if (!mobileConnection)
      return;

    if (!IccHelper.enabled)
      return;

    var info = IccHelper.iccInfo;
    document.getElementById('deviceInfo-iccid').textContent = info.iccid;
    document.getElementById('deviceInfo-msisdn').textContent = info.msisdn ||
      navigator.mozL10n.get('unknown-phoneNumber');

    var req = mobileConnection.sendMMI('*#06#');
    req.onsuccess = function getIMEI() {
      if (req.result && req.result.statusMessage) {
        document.getElementById('deviceInfo-imei').textContent =
          req.result.statusMessage;
      }
    };
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
  },

  launchFTU: function about_launchFTU() {
    var settings = Settings.mozSettings;
    if (!settings)
      return;

    var key = 'ftu.manifestURL';
    var req = settings.createLock().get(key);
    req.onsuccess = function ftuManifest() {
      var ftuManifestURL = req.result[key];

      // fallback if no settings present
      if (!ftuManifestURL) {
        ftuManifestURL = document.location.protocol +
          '//communications.gaiamobile.org' +
          (location.port ? (':' + location.port) : '') +
          '/manifest.webapp';
      }

      var ftuApp = null;
      navigator.mozApps.mgmt.getAll().onsuccess = function gotApps(evt) {
        var apps = evt.target.result;
        for (var i = 0; i < apps.length && ftuApp == null; i++) {
          var app = apps[i];
          if (app.manifestURL == ftuManifestURL) {
            ftuApp = app;
          }
        }

        if (ftuApp) {
          ftuApp.launch('ftu');
        } else {
          alert(navigator.mozL10n.get('no-ftu'));
        }
      };
    };
  }
};

// startup
navigator.mozL10n.ready(About.init.bind(About));

