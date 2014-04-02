'use strict';

var AboutMoreInfo = {

  init: function about_init() {
    this.loadImei();
    this.loadIccId();
    this.loadGaiaCommit();
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
          dispHash.textContent = data[0].substr(0, 8);
        } else {
          console.error('Failed to fetch gaia commit: ', req.statusText);
        }
      }
    }).bind(this);

    req.open('GET', GAIA_COMMIT, true); // async
    req.responseType = 'text';
    req.send();
  },

  loadImei: function about_loadImei() {
    var deviceInfoImei = document.getElementById('deviceInfo-imei');
    var conns = navigator.mozMobileConnections;

    if (!navigator.mozTelephony || !conns) {
      deviceInfoImei.parentNode.hidden = true;
      return;
    }

    // update imei, we use the first mobile conneciton.
    var req = conns[0].sendMMI('*#06#');
    req.onsuccess = function getIMEI() {
      if (req.result && req.result.statusMessage) {
        deviceInfoImei.textContent = req.result.statusMessage;
      } else {
        navigator.mozL10n.localize(deviceInfoImei, 'unavailable');
      }
    };
    req.onerror = function() {
      navigator.mozL10n.localize(deviceInfoImei, 'unavailable');
    };
  },

  loadIccId: function about_loadIccId() {
    var deviceInfoIccIds = document.getElementById('deviceInfo-iccids');
    var conns = navigator.mozMobileConnections;

    if (!navigator.mozTelephony || !conns) {
      deviceInfoIccIds.parentNode.hidden = true;
      return;
    }

    var multiSim = conns.length > 1;

    // update iccids
    while (deviceInfoIccIds.hasChildNodes()) {
      deviceInfoIccIds.removeChild(deviceInfoIccIds.lastChild);
    }
    Array.prototype.forEach.call(conns, function(conn, index) {
      var span = document.createElement('span');
      if (conn.iccId) {
        span.textContent = multiSim ?
          'SIM ' + (index + 1) + ': ' + conn.iccId : conn.iccId;
      } else {
        if (multiSim) {
          navigator.mozL10n.localize(span,
            'deviceInfo-ICCID-unavailable-sim', { index: index + 1 });
        } else {
          navigator.mozL10n.localize(span, 'unavailable');
        }
      }
      deviceInfoIccIds.appendChild(span);
    });
  }
};

navigator.mozL10n.ready(AboutMoreInfo.init.bind(AboutMoreInfo));
