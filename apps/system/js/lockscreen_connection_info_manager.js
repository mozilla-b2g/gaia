'use strict';

(function(exports) {
  var _lockedStateMsgMap = {
    'unknown': 'emergencyCallsOnly-unknownSIMState',
    'pinRequired': 'emergencyCallsOnly-pinRequired',
    'pukRequired': 'emergencyCallsOnly-pukRequired',
    'networkLocked': 'emergencyCallsOnly-networkLocked',
    'serviceProviderLocked': 'emergencyCallsOnly-serviceProviderLocked',
    'corporateLocked': 'emergencyCallsOnly-corporateLocked'
  };

  /*
  * Types of 2G Networks
  */
  var _NETWORKS_2G = ['gsm', 'gprs', 'edge'];

  /**
   * Constructor of LockScreenConnInfoManager. LockScreenConnInfoManager updates
   * mobile connection related information on lockscreen.
   *
   * @param {HTMLElement} root The root element of connection states.
   * @constructor LockScreenConnInfoManager
   */
  var LockScreenConnInfoManager = function(root) {
    if (root) {
      this._initialize(root);
    }
  };

  var LockScreenConnInfoManagerPrototype = {
    _connStates: null,
    _settings: null,
    _cellbroadcastLabel: null,
    /*
     * Telephony default service ID
     */
    _telephonyDefaultServiceId: 0,
    /*
     * Airplane mode
     */
    _airplaneMode: false
  };

  /**
   * Initialize connection state elements and event handlers.
   *
   * @param {HTMLElement} root The root element of connection states.
   */
  LockScreenConnInfoManagerPrototype._initialize =
    function lscs_initialize(root) {
      this._connStates = root;
      this._settings = navigator.mozSettings;

      var self = this;

      this._connStates.hidden = false;
      SIMSlotManager.getSlots().forEach(function(simslot, index) {
        // connection state
        self._connStates.appendChild(self._createConnStateElement());
        simslot.conn.addEventListener('voicechange',
          function(index) {
            self.updateConnState(simslot);
        });
      });

      // event handlers
      window.addEventListener('simslot-cardstatechange', function(evt) {
        self.updateConnState(evt.detail);
      });

      window.addEventListener('simslot-iccinfochange', function(evt) {
        self.updateConnState(evt.detail);
      });

      // Handle incoming CB messages that need to be displayed.
      window.addEventListener('cellbroadcastmsgchanged', function(evt) {
        self._cellbroadcastLabel = evt.detail;
        self.updateConnStates();
      });

      this._settings.addObserver('ril.radio.disabled', function(evt) {
        self._airplaneMode = evt.settingValue;
        self.updateConnStates();
      });

      this._settings.addObserver('ril.telephony.defaultServiceId',
        function(evt) {
          self._telephonyDefaultServiceId = evt.settingValue;
          self.updateConnStates();
      });

      // update UI
      var req = SettingsListener.getSettingsLock().get('ril.radio.disabled');
      req.onsuccess = function() {
        self._airplaneMode = !!req.result['ril.radio.disabled'];
        var req2 =
          SettingsListener.getSettingsLock()
            .get('ril.telephony.defaultServiceId');
        req.onsuccess = function() {
          self._telephonyDefaultServiceId =
            req2.result['ril.telephony.defaultServiceId'] || 0;
          self.updateConnStates();
        };
      };
  };

  /**
   * Create connection state element.
   *
   * @this {LockScreenConnInfoManager}
   */
  LockScreenConnInfoManagerPrototype._createConnStateElement =
    function lscs_createConnStateElement() {
      /**
       * <div>
       *   <span></span>
       *   <span class="connstate-line"></span>
       *   <span class="connstate-line"></span>
       * </div>
       */

      var div = document.createElement('div');
      var span = document.createElement('span');
      var line1 = document.createElement('span');
      var line2 = document.createElement('span');

      line1.className = line2.className = 'connstate-line';
      div.appendChild(span);
      div.appendChild(line1);
      div.appendChild(line2);

      return div;
  };

  /**
   * Update states of all sim slots.
   *
   * @this {LockScreenConnInfoManager}
   */
  LockScreenConnInfoManagerPrototype.updateConnStates =
    function lscs_updateConnStates() {
      SIMSlotManager.getSlots().forEach((function(simslot) {
        this.updateConnState(simslot);
      }).bind(this));
  };

  /**
   * Update the state of a sim slot.
   *
   * @param {SIMSlot} simslot
   * @this {LockScreenConnInfoManager}
   */
  LockScreenConnInfoManagerPrototype.updateConnState =
    function lscs_updateConnState(simslot) {
      var conn = simslot.conn;
      var index = simslot.index;

      var connstate = this._connStates.children[index];
      var simIDLine = connstate.children[0];
      var connstateLines =
        Array.prototype.slice.call(
          connstate.querySelectorAll('.connstate-line'));
      var localize = navigator.mozL10n.localize;
      var iccObj = simslot.simCard;
      var voice = conn.voice;

      connstate.hidden = false;

      // Set sim ID line
      if (SIMSlotManager.isMultiSIM()) {
        simIDLine.hidden = false;
        simIDLine.textContent = 'SIM ' + (index + 1);
      } else {
        simIDLine.hidden = true;
      }

      // Reset Lines
      connstateLines.forEach(function(line) {
        localize(line);
      });
      var nextLine = function() {
        for (var i = 0; i < connstateLines.length; i++) {
          var line = connstateLines[i];
          if (line.textContent === '') {
            return line;
          }
        }
        return connstateLines[connstateLines.length - 1];
      };

      // Airplane mode
      if (this._airplaneMode) {
        // Only show one airplane mode status
        if (index == 0) {
          localize(nextLine(), 'airplaneMode');
        } else {
          connstate.hidden = true;
        }
        simIDLine.hidden = true;
        return;
      }

      // If there is no sim card on the device, we only show one information.
      if (SIMSlotManager.noSIMCardOnDevice()) {
        if (index == 0) {
          if (voice.emergencyCallsOnly) {
            localize(nextLine(), 'emergencyCallsOnly');
            localize(nextLine(), 'emergencyCallsOnly-noSIM');
          } else {
            localize(nextLine(), 'emergencyCallsOnly-noSIM');
          }
        }
        simIDLine.hidden = true;
        return;
      }

      // If there are multiple sim slots and only one sim card inserted, we
      // only show the state of the inserted sim card.
      if (SIMSlotManager.isMultiSIM() &&
          navigator.mozIccManager.iccIds.length == 1 &&
          simslot.isAbsent()) {
        connstate.hidden = true;
        return;
      }

      // Possible value of voice.state are:
      // 'notSearching', 'searching', 'denied', 'registered',
      // where the latter three mean the phone is trying to grab the network.
      // See https://bugzilla.mozilla.org/show_bug.cgi?id=777057
      if (voice && 'state' in voice && voice.state == 'notSearching') {
        localize(nextLine(), 'noNetwork');
        return;
      }

      if (!voice.connected && !voice.emergencyCallsOnly) {
        // "Searching"
        // voice.state can be any of the latter three values.
        // (it's possible that the phone is briefly 'registered'
        // but not yet connected.)
        localize(nextLine(), 'searching');
        return;
      }

      if (voice.emergencyCallsOnly) {
        if (this._telephonyDefaultServiceId == index) {
          localize(nextLine(), 'emergencyCallsOnly');
        }
        localize(nextLine(), _lockedStateMsgMap[iccObj.cardState]);
        return;
      }

      var operatorInfos = MobileOperator.userFacingInfo(conn);
      var operator = operatorInfos.operator;
      var is2G = _NETWORKS_2G.some(function checkConnectionType(elem) {
        return (conn.voice.type == elem);
      });

      if (voice.roaming) {
        var l10nArgs = { operator: operator };
        localize(nextLine(), 'roaming', l10nArgs);
      } else {
        var line = nextLine();
        line.l10nId = '';
        line.textContent = operator;
      }

      if (this._cellbroadcastLabel && is2G) {
        var line = nextLine();
        line.l10nId = '';
        line.textContent = this._cellbroadcastLabel;
      } else if (operatorInfos.carrier) {
        var line = nextLine();
      line.l10nId = '';
        line.textContent = operatorInfos.carrier + ' ' +
          operatorInfos.region;
      }
  };

  LockScreenConnInfoManager.prototype = LockScreenConnInfoManagerPrototype;
  exports.LockScreenConnInfoManager = LockScreenConnInfoManager;
})(window);
