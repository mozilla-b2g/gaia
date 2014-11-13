/* global System, BaseUI, SIMSlotManager */
'use strict';

(function(exports) {
  var MobileConnectionIcon = function(manager) {
    this.manager = manager;
    this.mobileConnections = window.navigator.mozMobileConnections;
    this.telephony = window.navigator.mozTelephony;
  };
  MobileConnectionIcon.prototype = Object.create(BaseUI.prototype);
  MobileConnectionIcon.prototype.constructor = MobileConnectionIcon;
  MobileConnectionIcon.prototype.EVENT_PREFIX = 'mobileconnectionicon';
  MobileConnectionIcon.prototype.containerElement = document.getElementById('statusbar');
  MobileConnectionIcon.prototype.view = function() {
    return '<div id="statusbar-connections" class="sb-icon-connections" hidden ' +
            'role="presentation"></div>';
  };
  MobileConnectionIcon.prototype.instanceID = 'statusbar-connections';
  MobileConnectionIcon.prototype._fetchElements = function() {
    this.element = document.getElementById(this.instanceID);
  };
  MobileConnectionIcon.prototype.createElements = function() {
    if (this.element) {
      return;
    }
    var conns = window.navigator.mozMobileConnections;
    if (conns) {
      var multipleSims = SIMSlotManager.isMultiSIM();

      // Create signal elements based on the number of SIM slots.
      this.element.dataset.multiple = multipleSims;
      this.signals = {};
      this.data = {};
      this.roaming = {};
      for (var i = conns.length - 1; i >= 0; i--) {
        var signal = document.createElement('div');
        var data = document.createElement('div');
        var roaming = document.createElement('div');
        signal.className = 'sb-icon sb-icon-signal statusbar-signal';
        signal.dataset.level = '5';
        if (multipleSims) {
          signal.dataset.index = i + 1;
        }
        signal.setAttribute('role', 'listitem');
        signal.hidden = true;
        data.setAttribute('role', 'listitem');
        data.className = 'sb-icon statusbar-data';
        data.hidden = true;

        roaming.setAttribute('role', 'listitem');
        roaming.className = 'sb-icon sb-icon-roaming';
        roaming.hidden = true;

        signal.appendChild(data);
        this.element.appendChild(signal);
        this.element.appendChild(roaming);
        this.signals[i] = signal;
        this.data[i] = data;
        this.roaming[i] = roaming;
      }

      this.manager.updateConnectionsVisibility();
    }
  };
  MobileConnectionIcon.prototype.show = function() {
    var hidden = this.element.hidden;
    if (!hidden) {
      return;
    }
    this.element.hidden = false;
    this.publish('shown');
  };
  MobileConnectionIcon.prototype.hide = function() {
    var hidden = this.element.hidden;
    if (hidden) {
      return;
    }
    this.element.hidden = true;
    this.publish('hidden');
  };
  MobileConnectionIcon.prototype.start = function() {
    /* A mapping table between technology names
       we would get from API v.s. the icon we want to show. */
    this.mobileDataIconTypes: {
      'lte': '4G', // 4G LTE
      'ehrpd': '4G', // 4G CDMA
      'hspa+': 'H+', // 3.5G HSPA+
      'hsdpa': 'H', 'hsupa': 'H', 'hspa': 'H', // 3.5G HSDPA
      'evdo0': 'Ev', 'evdoa': 'Ev', 'evdob': 'Ev', // 3G CDMA
      'umts': '3G', // 3G
      'edge': 'E', // EDGE
      'gprs': '2G',
      '1xrtt': '1x', 'is95a': '1x', 'is95b': '1x' // 2G CDMA
    };
    System.request('addObserver', 'operatorResources.data.icon', this);
    this.addConnectionsListeners();
    this.update();
  };
  MobileConnectionIcon.prototype.stop = function() {
    System.request('removeObserver', 'operatorResources.data.icon', this);
    this.removeConnectionsListeners();
  };
  MobileConnectionIcon.prototype.observe = function(key, value) {
    this._settings[key] = value;
    this.updateIconData();
  };
  MobileConnectionIcon.prototype.addConnectionsListeners = function() {
    var conns = window.navigator.mozMobileConnections;
    if (conns) {
      Array.from(conns).forEach(
        (conn) => {
          conn.addEventListener('voicechange', this);
          conn.addEventListener('datachange', this);
          this.update();
        }
      );
    }
  };
  MobileConnectionIcon.prototype.removeConnectionsListeners = function() {
    var conns = window.navigator.mozMobileConnections;
    if (conns) {
      Array.from(conns).forEach(
        (conn) => {
          conn.removeEventListener('voicechange', this);
          conn.removeEventListener('datachange', this);
        }
      );
    }
  };
  MobileConnectionIcon.prototype.setActive = function(active) {
    this.update();
  };
  MobileConnectionIcon.prototype.isVisible = function() {
    return this.element && !this.element.hidden;
  };
  MobileConnectionIcon.prototype.update = function() {
    this.updateSignal();
    this.updateData();
  };
  MobileConnectionIcon.prototype.updateSignal = function() {
    var simSlots = SIMSlotManager.getSlots();
    var isDirty = false; // Whether to reprioritise icons afterwards.
    for (var index = 0; index < simSlots.length; index++) {
      var simslot = simSlots[index];
      var conn = simslot.conn;
      var voice = conn.voice;
      var data = conn.data;
      var icon = this.signals[index];
      var roaming = this.roaming[index];

      var _ = navigator.mozL10n.get;

      if (!voice) {
        continue;
      }

      var previousHiddenState = icon.hidden;
      var previousRoamingHiddenState = roaming.hidden;

      if (this.settingValues['ril.radio.disabled']) {
        icon.hidden = true;

        if (previousHiddenState !== icon.hidden) {
          isDirty = true;
        }

        continue;
      }

      icon.hidden = false;
      icon.dataset.inactive = false;

      if (simslot.isAbsent()) {
        // no SIM
        delete icon.dataset.level;
        delete icon.dataset.searching;
        roaming.hidden = true;
        icon.hidden = true;
        icon.dataset.inactive = true;

        icon.setAttribute('aria-label', _('noSimCard'));
      } else if (data && data.connected && data.type.startsWith('evdo')) {
        // "Carrier" / "Carrier (Roaming)" (EVDO)
        // Show signal strength of data call as EVDO only supports data call.
        this.updateSignalIcon(icon, data);
      } else if (voice.connected || this.hasActiveCall() &&
          navigator.mozTelephony.active.serviceId === index) {
        // "Carrier" / "Carrier (Roaming)"
        // If voice.connected is false but there is an active call, we should
        // check whether the service id of that call equals the current index
        // of the target sim card. If yes, that means the user is making an
        // emergency call using the target sim card. In such case we should
        // also display the signal bar as the normal cases.
        this.updateSignalIcon(icon, voice);
      } else if (simslot.isLocked()) {
        // SIM locked
        // We check if the sim card is locked after checking hasActiveCall
        // because we still need to show the siganl bars in the case of
        // making emergency calls when the sim card is locked.
        icon.hidden = true;
      } else {
        // "No Network" / "Emergency Calls Only (REASON)" / trying to connect
        icon.dataset.level = -1;
        // emergencyCallsOnly is always true if voice.connected is false. Show
        // searching icon if the device is searching. Or show the signal bars
        // with a red "x", which stands for emergency calls only.
        icon.dataset.searching = (voice.state === 'searching');
        roaming.hidden = true;
        icon.setAttribute('aria-label', _(icon.dataset.searching ?
          'statusbarSignalNoneSearching' : 'emergencyCallsOnly'));
      }

      if (previousHiddenState !== icon.hidden ||
        previousRoamingHiddenState !== roaming.hidden) {
        isDirty = true;
      }
    }

    this.updateConnectionsVisibility();
    this.refreshCallListener();

    if (isDirty) {
      this._updateIconVisibility();
    }
  };
  MobileConnectionIcon.prototype.updateData = function() {
    var conns = window.navigator.mozMobileConnections;
    var isDirty = false; // Whether to reprioritise icons afterwards.
    for (var index = 0; index < conns.length; index++) {
      var conn = conns[index];
      var data = conn.data;
      var icon = this.data[index];

      if (!data) {
        continue;
      }

      var previousHiddenState = icon.hidden;

      if (!System.query('Radio.enabled') ||
          !this.manager.wifiIcon.isVisible() ||
          !data.connected) {
        icon.hidden = true;

        if (previousHiddenState !== icon.hidden) {
          isDirty = true;
        }

        continue;
      }

      var type = this.mobileDataIconTypes[data.type];
      icon.hidden = false;
      icon.textContent = '';
      icon.classList.remove('sb-icon-data-circle');
      if (type) {
        if (this.dataExclusiveCDMATypes[data.type]) {
          // If the current data connection is CDMA types, we need to check
          // if there exist any calls. If yes, we have to set the status
          // text to empty.
          var telephony = window.navigator.mozTelephony;
          if (telephony.calls && telephony.calls.length > 0) {
            icon.textContent = '';
          } else {
            icon.textContent = type;
          }
        } else {
          icon.textContent = type;
        }
      } else {
        icon.classList.add('sb-icon-data-circle');
      }
      icon.setAttribute('aria-hidden', !!icon.textContent);

      if (previousHiddenState !== icon.hidden) {
        isDirty = true;
      }
    }

    this.updateConnectionsVisibility();
    this.refreshCallListener();

    if (isDirty) {
      this._updateIconVisibility();
    }
    this.manager._updateIconVisibility();
  };
  MobileConnectionIcon.prototype.updateConnectionsVisibility = function() {
    var icons = this.icons;
    this.element.hidden = false;
    this.element.dataset.multiple = (conns.length > 1);

    for (var index = 0; index < conns.length; index++) {
      if (this.signals[index].dataset.inactive === 'false') {
        return;
      }
    }

    // No SIM cards inserted
    this.element.dataset.multiple = false;
    this.signals[0].hidden = false;
  };
  MobileConnectionIcon.prototype.refreshCallListener = function() {
    var emergencyCallsOnly = false;
    var cdmaConnection = false;
    var self = this;
    Array.prototype.slice.call(conns).forEach(function(conn) {
      emergencyCallsOnly = emergencyCallsOnly ||
        (conn && conn.voice && conn.voice.emergencyCallsOnly);
      cdmaConnection = cdmaConnection ||
        (conn && conn.data && !!self.dataExclusiveCDMATypes[conn.data.type]);
    });

    if (emergencyCallsOnly || cdmaConnection) {
      this.addCallListener();
    } else {
      this.removeCallListener();
    }
  };
  MobileConnectionIcon.prototype.updateSignalIcon = function(icon, connInfo) {
    icon.dataset.level = Math.ceil(connInfo.relSignalStrength / 20); // 0-5
    var slotIndex = icon.dataset.index ? (icon.dataset.index - 1) : 0;
    var roaming = this.icons.roaming[slotIndex];
    roaming.hidden = !connInfo.roaming;

    delete icon.dataset.searching;

    icon.setAttribute('aria-label', navigator.mozL10n.get(connInfo.roaming ?
      'statusbarSignalRoaming' : 'statusbarSignal', {
        level: icon.dataset.level,
        operator: connInfo.network && connInfo.network.shortName
      }
    ));
  };
  MobileConnectionIcon.prototype.addCallListener = function() {
    var telephony = navigator.mozTelephony;
    if (telephony && !this.listeningCallschanged) {
      this.listeningCallschanged = true;
      telephony.addEventListener('callschanged', this);
    }
  };
  MobileConnectionIcon.prototype.removeCallListener = function() {
    var telephony = navigator.mozTelephony;
    if (telephony) {
      this.listeningCallschanged = false;
      telephony.removeEventListener('callschanged', this);
    }
  };
  MobileConnectionIcon.prototype.handleEvent = function() {
    this.update();
  };
  MobileConnectionIcon.prototype.updateIconData = function () {
    var dataIconValues = this._settings['operatorResources.data.icon'];
    if (!dataIconValues) {
      return;
    }

    for (var key in dataIconValues) {
      //Change only dataIcon values that actually really know
      if (this.mobileDataIconTypes[key]) {
        this.mobileDataIconTypes[key] = dataIconValues[key];
      }
    }
  };
}(window));
