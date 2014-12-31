/* globals MobileOperator, SettingsListener, SIMSlotManager */
'use strict';

(function(exports) {
  var _lockedStateMsgMap = {
    'unknown': 'emergencyCallsOnly-unknownSIMState',
    'pinRequired': 'emergencyCallsOnly-pinRequired',
    'pukRequired': 'emergencyCallsOnly-pukRequired',
    'networkLocked': 'emergencyCallsOnly-networkLocked',
    'serviceProviderLocked': 'emergencyCallsOnly-serviceProviderLocked',
    'corporateLocked': 'emergencyCallsOnly-corporateLocked',
    'network1Locked': 'emergencyCallsOnly-network1Locked',
    'network2Locked': 'emergencyCallsOnly-network2Locked',
    'hrpdNetworkLocked' : 'emergencyCallsOnly-hrpdNetworkLocked',
    'ruimCorporateLocked' : 'emergencyCallsOnly-ruimCorporateLocked',
    'ruimServiceProviderLocked' : 'emergencyCallsOnly-ruimServiceProviderLocked'
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

      this._connStates.hidden = false;
      SIMSlotManager.getSlots().forEach(function(simslot, index) {
        // connection state
        this._connStates.appendChild(this._createConnStateElement());
        simslot.conn.addEventListener('voicechange',
          (function(index) {
            // ==> called; the voicechanged SIM.
            this.updateConnState(simslot);
        }).bind(this));
      }, this);

      // event handlers
      // [ ]==> called; all SIMs.
      navigator.mozL10n.ready(this.updateConnStates.bind(this));

      window.addEventListener('simslot-cardstatechange', (function(evt) {
        // ==> called; the statechanged SIM.
        this.updateConnState(evt.detail);
      }).bind(this));

      window.addEventListener('simslot-iccinfochange', (function(evt) {
        // ==> called; the iccinfochange SIM.
        this.updateConnState(evt.detail);
      }).bind(this));

      // Handle incoming CB messages that need to be displayed.
      window.addEventListener('cellbroadcastmsgchanged', (function(evt) {
        this._cellbroadcastLabel = evt.detail;
        // [ ]==> called; all SIMs.
        // ?? Only one SIM changed or all SIMs changed?
        // ?? Why need to call all?
        // ?? In updating function, would check is2G: conn.voice...,
        //    does this mean only the primary card can be checked
        //    and the line would print the info?
        this.updateConnStates();
      }).bind(this));

      this._settings.addObserver('ril.radio.disabled', (function(evt) {
        this._airplaneMode = evt.settingValue;
        // [ ]==> called; all SIMs (disalbed --> all SIMs related)
        this.updateConnStates();
      }).bind(this));

      this._settings.addObserver('ril.telephony.defaultServiceId',
        (function(evt) {
          this._telephonyDefaultServiceId = evt.settingValue;
          // [ ]==> called; all SIMs (--> need to swap the infos,
          // or to update them).
          this.updateConnStates();
      }).bind(this));

      // update UI
      var req = SettingsListener.getSettingsLock().get('ril.radio.disabled');
      req.onsuccess = (function() {
        this._airplaneMode = !!req.result['ril.radio.disabled'];
        var req2 =
          SettingsListener.getSettingsLock()
            .get('ril.telephony.defaultServiceId');
        req2.onsuccess = (function() {
          this._telephonyDefaultServiceId =
            req2.result['ril.telephony.defaultServiceId'] || 0;
          // [ ]==> called; all SIMs (initialization)
          this.updateConnStates();
        }).bind(this);
      }).bind(this);
  };

  /**
   * Create connection state element.
   *
   * @this {LockScreenConnInfoManager}
   */
  LockScreenConnInfoManagerPrototype._createConnStateElement =
    function lscs_createConnStateElement() {
      //
      // <div>
      //   <span></span>
      //   <span class="connstate-line"></span>
      //   <span class="connstate-line"></span>
      // </div>
      //

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
   * This is a helper function that uses a flag dataset.content
   * to determine if the line has content or not.
   *
   * The content of the connstateLine may come from l10nId or manually
   * injected text content.
   */
  function lineText(node, l10nId, l10nArgs, text) {
    if (!l10nId && !text) {
      node.setAttribute('data-content', true);
    } else {
      node.removeAttribute('data-content');
    }

    if (l10nId) {
      navigator.mozL10n.setAttributes(node, l10nId, l10nArgs);
    } else {
      node.removeAttribute('data-l10n-id');
      if (text) {
        node.textContent = text;
      } else {
        node.textContent = '';
      }
    }
  }

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

      // The text line of the targeting SIM.
      var connstate = this._connStates.children[index];
      var simIDLine = connstate.children[0];
      var connstateLines =
        Array.prototype.slice.call(
          connstate.querySelectorAll('.connstate-line'));
      var iccObj = simslot.simCard;
      var voice = conn.voice;

      connstate.hidden = false;

      // Set sim ID line
      if (SIMSlotManager.isMultiSIM()) {
        simIDLine.hidden = false;
        lineText(simIDLine, 'lockscreen-sim-id', {n: (index + 1)});
      } else {
        simIDLine.hidden = true;
      }

      // Reset Lines
      connstateLines.forEach(function(line) {
        lineText(line);
      });
      var nextLine = function() {
        for (var i = 0; i < connstateLines.length; i++) {
          var line = connstateLines[i];
          if (line.hasAttribute('data-content')) {
            return line;
          }
        }
        return connstateLines[connstateLines.length - 1];
      };

      // ----
      // Airplane mode
      // If targeting SIM is the primary SIM,
      //  print the message
      // Else, hide the line
      // Then, hide simIDLine.
      // ** undocumenting assumptions **
      // .. this must be called multiple times so that
      //    to show the message and hide the line can be done.
      if (this._airplaneMode) {
        // Only show one airplane mode status
        if (index === 0) {
          lineText(nextLine(), 'airplaneMode');
        } else {
          connstate.hidden = true;
        }
        simIDLine.hidden = true;
        return;
      }
      // ++++

      // ----
      // If no SIMs
      //  If targeting SIM is the primary SIM
      //    If still has voice that shos emergencyCallsOnly
      //      update both lines with emergencyCallsOnly + noSIM reason
      //    If NOT,
      //      only shows noSIM
      //  Then, hide the simIDLine, no matter which SIM is targeting.
      // ** undocumenting assumptions **
      // ?? Since the third lineText is the same with the second one,
      //    it can be called multiple times? And in what case we would
      //    has voice.emergencyCallsOnly and in what case we would lose it?
      // ?? What's the difference between the two emergencyCallsOnly?
      //
      // If there is no sim card on the device, we only show one information.
      if (SIMSlotManager.noSIMCardOnDevice()) {
        if (index === 0) {
          if (voice.emergencyCallsOnly) {
            lineText(nextLine(), 'emergencyCallsOnly');
            lineText(nextLine(), 'emergencyCallsOnly-noSIM');
          } else {
            lineText(nextLine(), 'emergencyCallsOnly-noSIM');
          }
        }
        simIDLine.hidden = true;
        return;
      // ++++
      // ----
      // If has SIM(s) BUT no connected SIM card
      //  If targeting SIM is the primary SIM
      //    Line1 print emergencyCallsOnly
      //  Then, hide the simIDLine.
      // ** undocumenting assumptions **
      // ?? what's the difference between this 'emergencyCallsOnly' vs.
      //    'noNetwork'? Since the 'noSIMCardConnectedToNetwork' looks
      //    like 'noNetwork'? Or the 'network' means some dialing-availiable
      //    network, while the network of 'noNetwork' is really no network?
      // ++++
      } else if (SIMSlotManager.noSIMCardConnectedToNetwork()) {
        if (index === 0) {
          lineText(nextLine(), 'emergencyCallsOnly');
        }
        simIDLine.hidden = true;
        return;
      }

      // ----
      // "On multiple SIMs device but only one SIM instered"
      // + the targeting SIM is the absent one
      // = hide the line.
      // ** undocumenting assumptions **
      // .. the function MUST be called multiple times to make sure every
      //    absent line can be hidden.
      //
      // If there are multiple sim slots and only one sim card inserted, we
      // only show the state of the inserted sim card.
      if (SIMSlotManager.isMultiSIM() &&
          navigator.mozIccManager.iccIds.length == 1 &&
          simslot.isAbsent()) {
        connstate.hidden = true;
        return;
      }
      // ++++

      //----
      // "noNetwork"
      // ** undocumenting assumptions **
      // .. the same, can only be called once. Since on real device there is no
      //    two 'noNetwork'
      //
      // Possible value of voice.state are:
      // 'notSearching', 'searching', 'denied', 'registered',
      // where the latter three mean the phone is trying to grab the network.
      // See https://bugzilla.mozilla.org/show_bug.cgi?id=777057
      if (voice && 'state' in voice && voice.state == 'notSearching') {
        lineText(nextLine(), 'noNetwork');
        return;
      }
      // ++++

      // ----
      // voice must exist, AND 'state' NOT in voice, or
      //    voice.state ..= ['searching', 'denied', 'registered']
      //    then the targeting Line would be 'searching' (no secondary line).
      // ** undocumenting assumptions **
      // .. looks this can only be called on one SIM, too? Since I never saw
      //    two 'Searching...' on device.
      // ?? is there any assumption that make sure the timing of call this
      //    function can ensure calling only once?
      if (!voice.connected && !voice.emergencyCallsOnly) {
        // "Searching"
        // voice.state can be any of the latter three values.
        // (it's possible that the phone is briefly 'registered'
        // but not yet connected.)
        lineText(nextLine(), 'searching');
        return;
      }
      // ++++

      // ----
      // If the target SIM has 'emergencyCallsOnly'...
      //    And if it's the first primary (servicing) card
      //      print Line1 as 'emergencyCallsOnly'
      //      print Line2 as 'emergencyCallsOnly-reason via the map'
      //    If not, hide the connstate --> the targeting SIM's line
      // ** undocumenting assumptions **
      // .. the function can only be called once by one targeting SIM,
      //    since it would hide the targeting line. If SIM1 update the lines,
      //    and then apply this function on SIM2, the updated Line2 would be
      //    hidden.
      if (voice.emergencyCallsOnly) {
        if (this._telephonyDefaultServiceId == index) {
          lineText(nextLine(), 'emergencyCallsOnly');
          lineText(nextLine(), _lockedStateMsgMap[iccObj.cardState]);
        } else {
          connstate.hidden = true;
        }
        return;
      }
      // +++++

      var operatorInfos = MobileOperator.userFacingInfo(conn);
      var operator = operatorInfos.operator;
      var is2G = _NETWORKS_2G.some(function checkConnectionType(elem) {
        return (conn.voice.type == elem);
      });

      // ----
      // If targeting SIM is roaming
      // ** undocumenting assumptions **
      // .. since there is no 'return' so it would fall to thr next section
      //    to print full operator, carrier and region info.
      var l10nArgs;
      if (voice.roaming) {
        l10nArgs = { operator: operator };
        lineText(nextLine(), 'roaming', l10nArgs);
      } else {
        lineText(nextLine(), null, null, operator);
      }
      // ||||


      // ----
      // Finally, fill the ordinary carrier, region and operator info
      // Plus the cellbroadcast info WHEN it's 2G
      // ?? how about 3G + cellbroadcast?
      if (this._cellbroadcastLabel && is2G) {
        lineText(nextLine(), null, null, this._cellbroadcastLabel);
      } else if (operatorInfos.carrier) {
        l10nArgs = { carrier: operatorInfos.carrier,
                         region: operatorInfos.region };
        lineText(nextLine(), 'operator-info', l10nArgs);
      }
      // ++++
  };

  LockScreenConnInfoManager.prototype = LockScreenConnInfoManagerPrototype;
  exports.LockScreenConnInfoManager = LockScreenConnInfoManager;
})(window);
