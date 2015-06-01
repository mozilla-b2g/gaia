/* global Service, BaseIcon */
'use strict';

(function(exports) {
  var SignalIcon = function(manager, index) {
    BaseIcon.call(this, manager, index);
  };
  SignalIcon.prototype = Object.create(BaseIcon.prototype);
  SignalIcon.prototype.name = 'SignalIcon';
  SignalIcon.prototype.DEBUG = 1;
  SignalIcon.prototype.view = function() {
    // jshint ignore: start
    var index = this.index;
    return `<div class="sb-icon sb-icon-signal statusbar-signal"
              role="listitem" data-index="${index}">
              <div class="sb-icon statusbar-data"></div>
            </div>`;
    // jshint ignore: end
  };
  SignalIcon.prototype.render = function() {
    this.containerElement =
      document.getElementById('statusbar-mobile-connection');
    this.containerElement.insertAdjacentHTML('beforeend', this.view());
    this.element =
      this.containerElement.querySelector('.sb-icon-signal[data-index="' +
      this.index + '"]');
    this.dataText = this.element.querySelector('.statusbar-data');
  };
  SignalIcon.prototype.update = function() {
    var simslot = this.manager;
    var conn = simslot.conn;
    var voice = conn.voice;
    var data = conn.data;
    var connected = data && data.connected;

    var _ = navigator.mozL10n.setAttributes;

    if (!voice || !this.element) {
      this.debug('No element or no voice');
      return;
    }

    if (!Service.query('Radio.enabled')) {
      this.debug('radio is disabled');
      this.hide();
      return;
    }

    if (simslot.isAbsent()) {
      // no SIM
      this.debug('sim card absent');
      delete this.element.dataset.level;
      delete this.element.dataset.searching;
      this.hide();
      this.element.dataset.inactive = true;

      _(this.element, 'statusbarSignalNoSimCard');
    } else if (connected && data.type &&  data.type.startsWith('evdo')) {
      // "Carrier" / "Carrier (Roaming)" (EVDO)
      // Show signal strength of data call as EVDO only supports data call.
      this.debug('data connection, level=', data.relSignalStrength);
      this.updateSignal(data);
    } else if (voice.connected || Service.query('hasActiveCall', this.index)) {
      // "Carrier" / "Carrier (Roaming)"
      // If voice.connected is false but there is an active call, we should
      // check whether the service id of that call equals the current index
      // of the target sim card. If yes, that means the user is making an
      // emergency call using the target sim card. In such case we should
      // also display the signal bar as the normal cases.
      this.debug('voice connection, level=', voice.relSignalStrength);
      this.updateSignal(voice);
    } else if (simslot.isLocked()) {
      this.debug('locked simcard');
      // SIM locked
      // We check if the sim card is locked after checking hasActiveCall
      // because we still need to show the siganl bars in the case of
      // making emergency calls when the sim card is locked.
      this.hide();
    } else {
      this.debug('emergency call only');
      // "No Network" / "Emergency Calls Only (REASON)" / trying to connect
      this.element.dataset.level = -1;
      // emergencyCallsOnly is always true if voice.connected is false. Show
      // searching icon if the device is searching. Or show the signal bars
      // with a red "x", which stands for emergency calls only.
      this.element.dataset.searching = (voice.state === 'searching');
      _(this.element, this.element.dataset.searching ?
        'statusbarSignalNoneSearching' : 'statusbarEmergencyCallsOnly');
      this.updateSignal(voice);
      this.show();
    }
  };
  SignalIcon.prototype.updateSignal = function(connInfo) {
    if (!this.element) {
      return;
    }
    this.show();
    var previousLevel = parseInt(this.element.dataset.level, 10);
    var previousSearching = (this.element.dataset.searching === 'true');
    delete this.element.dataset.searching;
    var level = Math.ceil(connInfo.relSignalStrength / 20); // 0-5
    this.element.dataset.level = level;
    navigator.mozL10n.setAttributes(this.element,
      connInfo.roaming ? 'statusbarSignalRoaming' : 'statusbarSignal',
      {
        level: this.element.dataset.level,
        operator: connInfo.network && connInfo.network.shortName
      }
    );
    if (previousSearching || previousLevel !== level) {
      this.publish('changed');
    }
  };
  SignalIcon.prototype.updateDataText = function() {
    if (!this.element) {
      return;
    }
    var previousHidden = this.dataText.hidden;
    var previousText = this.dataText.textContent;
    var data = this.manager.conn.data;
    if (!data.connected || Service.query('Radio.enabled') === false) {
      this.dataText.hidden = true;
      if (!previousHidden) {
        this.publish('changed');
      }
      return;
    }
    // XXX: Maybe we need another icon for this.
    this.dataText.hidden = false;
    var type = Service.query('getDataConnectionType', this.index);
    this.debug('connection type = ', type);
    this.element.classList.remove('sb-icon-data-circle');
    this.dataText.textContent = '';
    if (type) {
      if (Service.query('isCDMA', this.index) && Service.query('inCall')) {
        // If the current data connection is CDMA types, we need to check
        // if there exist any calls. If yes, we have to set the status
        // text to empty.
        this.dataText.textContent = '';
      } else {
        this.dataText.textContent = type;
      }
    } else {
      this.element.classList.add('sb-icon-data-circle');
    }
    if (previousHidden || previousText !== this.dataText.textContent) {
      this.publish('changed');
    }
  };
  exports.SignalIcon = SignalIcon;
}(window));
