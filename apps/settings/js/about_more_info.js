'use strict';

var AboutMoreInfo = {
  /** MMI control code used for retrieving a phone's IMEI code. */
  GET_IMEI_COMMAND: '*#06#',

  init: function about_init() {
    this.loadImei();
    this.loadIccId();
    this.loadGaiaCommit();
  },

  loadGaiaCommit: function about_loadGaiaCommit() {
    var GAIA_COMMIT = 'resources/gaia_commit.txt';

    var dispDate = document.getElementById('gaia-commit-date');
    var dispHash = document.getElementById('gaia-commit-hash');
    if (dispHash.textContent) {
      return; // `gaia-commit.txt' has already been loaded
    }

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

  /**
   * Retrieves the IMEI code corresponding with the specified SIM card slot.
   *
   * @param {Integer} simSlotIndex The slot whose IMEI code we want to retrieve.
   * @returns {Promise} A promise that resolves to the IMEI code or rejects
   *          if an error occurred.
   */
  _getImeiCode: function about_getImeiCode(simSlotIndex) {
    var self = this;

    return new Promise(function(resolve, reject) {
      var connection = navigator.mozMobileConnections[simSlotIndex];
      var request = connection.sendMMI(self.GET_IMEI_COMMAND);
      request.onsuccess = function about_onGetImeiCodeSuccess() {
        if (!this.result || (this.result.serviceCode !== 'scImei') ||
            (this.result.statusMessage === null)) {
          reject(new Error('Could not retrieve the IMEI code for SIM' +
            simSlotIndex));
          return;
        }

        resolve(this.result.statusMessage);
      };
      request.onerror = function about_onGetImeiCodeError() {
        reject(this.error);
      };
    });
  },

  /**
   * Populate the IMEI information entry with the provided list of IMEI codes.
   * If the code is not given or if it's empty then the entry will be marked
   * as unavailable.
   *
   * @param {Array} imeis An array of IMEI codes.
   */
  _createImeiField: function about_createImeiField(imeis) {
    var deviceInfoImeis = document.getElementById('deviceInfo-imeis');

    while (deviceInfoImeis.hasChildNodes()) {
      deviceInfoImeis.removeChild(deviceInfoImeis.lastChild);
    }

    if (!imeis || imeis.length === 0) {
      var span = document.createElement('span');

      navigator.mozL10n.localize(span, 'unavailable');
      deviceInfoImeis.appendChild(span);
    } else {
      imeis.forEach(function(imei, index) {
        var span = document.createElement('span');

        span.textContent = (imeis.length > 1) ?
          'IMEI ' + (index + 1) + ': ' + imei : imei;
        span.dataset.slot = index;
        deviceInfoImeis.appendChild(span);
      });
    }
  },

  /**
   * Loads all the phone's IMEI code in the corresponding entry.
   *
   * @returns {Promise} A promise that is resolved when the container has been
   *          fully populated.
   */
  loadImei: function about_loadImei() {
    var deviceInfoImeis = document.getElementById('deviceInfo-imeis');
    var conns = navigator.mozMobileConnections;

    if (!navigator.mozTelephony || !conns) {
      deviceInfoImeis.parentNode.hidden = true;
      return Promise.resolve();
    }

    // Retrieve all IMEI codes.
    var promises = [];

    for (var i = 0; i < conns.length; i++) {
      promises.push(this._getImeiCode(i));
    }

    var self = this;

    return Promise.all(promises).then(function(imeis) {
      self._createImeiField(imeis);
    }, function() {
      self._createImeiField(null);
    });
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

navigator.mozL10n.once(AboutMoreInfo.init.bind(AboutMoreInfo));
