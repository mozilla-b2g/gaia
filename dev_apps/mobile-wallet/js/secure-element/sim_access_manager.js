'use strict';

/* globals SEUtils, APDU, ERRORS, DEFAULTS */
/* exported simAccessManager */

(function(exports) {

  const SIM_ACCESS_DISABLED = 'disabled';
  const SIM_ACCESS_IDLE = 'idle';
  const SIM_ACCESS_BUSY = 'busy';

  var _simState = SIM_ACCESS_DISABLED;
  var _seSession = null;

  var _crsAid = DEFAULTS.CRS_AID;
  var _uiccAid = DEFAULTS.UICC_AID;
  var _pinP2 = DEFAULTS.PIN_P2;

  var SIMAccessManager = {
    set crsAid(value) {
      _crsAid = value;
    },

    get crsAidBytes() {
      return SEUtils.hexStringToByte(_crsAid);
    },

    set uiccAid(value) {
      _uiccAid = value;
    },

    get uiccAidBytes() {
      return SEUtils.hexStringToByte(_uiccAid);
    },

    set pinP2(value) {
      _pinP2 = value;
    },

    get pinP2Bytes() {
      return SEUtils.hexStringToByte(_pinP2)[0];
    },

    start: function start() {
      if(!navigator.seManager) {
        return Promise.reject(ERRORS.GLOBAL.NO_API);
      }

      return navigator.seManager.getSEReaders()
      .then((readers) => {
        var reader = readers.find(r => r.type.toLowerCase() === 'uicc' && r.isSEPresent);
        if(!reader) {
          return Promise.reject(ERRORS.SIM.NO_READER);
        }
        return reader.openSession();
      })
      .then((session) => {
        _seSession = session;
        _simState = SIM_ACCESS_IDLE;
      })
      .catch((e) => {
        console.error(e);
        _simState = SIM_ACCESS_DISABLED;

        if(e !== ERRORS.SIM.NO_READER) {
          e = ERRORS.SIM.ACCESS_FAILED;
        }
        return Promise.reject(e);
      });
    },

    stop: function stop() {
      return _seSession.closeAll()
      .then(() => {
        _seSession = null;
        _simState = SIM_ACCESS_DISABLED;
      })
      .catch(e => this._cleanup(e, ERRORS.SIM.SIM_FAILURE));
    },

    _initSIMAccess: function _initSIMAccess() {
      if(_simState !== SIM_ACCESS_IDLE) {
        return Promise.reject(ERRORS.SIM.NOT_IDLE);
      }

      if(!_seSession.reader.isSEPresent) {
        return Promise.reject(ERRORS.SIM.NO_READER);
      }

      _simState = SIM_ACCESS_BUSY;
      return Promise.resolve();
    },

    _cleanup: function _cleanup(error, message) {
      console.error(error);
      _simState = SIM_ACCESS_IDLE;
      if(error === ERRORS.SIM.NOT_IDLE || error === ERRORS.SIM.NO_READER) {
        message = error;
      }
      return Promise.reject(message);
    },

    getAppletsData: function getAppletsData() {
      return this._initSIMAccess()
      .then(() => _seSession.openLogicalChannel(this.crsAidBytes))
      .then((channel) => {
        return channel.transmit(APDU.CRS.getStatusAll1st);
      })
      .then((resp) => {
        var receivedData = new Uint8Array();

        // we can get different responses, also propriatary
        // using counter to not allow to try to query the SIM indifinately
        var count = 0;
        var condition = (resp) => (count++ > 10 || resp.sw1 === 0x90 && resp.sw2 === 0x00);
        var action = (resp) => {
          receivedData = SEUtils.joinUint8Arrays(receivedData, resp.data);
          return resp.channel.transmit(APDU.CRS.getStatusAllNext);
        };

        return SEUtils.promises.whilePromise(condition, action, resp)
        .then((lastResp) => {
          lastResp.channel.close();
          _simState = SIM_ACCESS_IDLE;
          return SEUtils.joinUint8Arrays(receivedData, lastResp.data);
        });
      })
      .catch(e => this._cleanup(e, ERRORS.SIM.APPLETS_FAILURE));
    },

    toggleCLF: function toggleCLF(on, aid) {
      var apdu = on ? APDU.CRS.activateCLF(aid) : APDU.CRS.deactivateCLF(aid);
      return this._initSIMAccess()
      .then(() => _seSession.openLogicalChannel(this.crsAidBytes))
      .then((channel) => channel.transmit(apdu))
      .then((resp) => {
         return resp.channel.close()
         .then(() => {
           _simState = SIM_ACCESS_IDLE;
           return resp.sw1 === 0x90 && resp.sw2 === 0x00;
         });
      })
      .catch(e => this._cleanup(e, ERRORS.SIM.SIM_FAILURE));
    },

    _execPinCommand: function _execPinCommand(type, pin1, pin2) {
      return this._initSIMAccess()
      .then(() => _seSession.openLogicalChannel(this.uiccAidBytes))
      .then((channel) => {
        var apdu = APDU.UICC[type](this.pinP2Bytes, pin1, pin2);
        if(!apdu) {
          return Promise.reject('PIN APDU type ' + type + ' not found');
        }
        return channel.transmit(apdu);
      })
      .then((resp) => {
        return resp.channel.close().then(() => {
          _simState = SIM_ACCESS_IDLE;
          return SEUtils.byteToHexString([resp.sw1, resp.sw2]);
        });
      })
      .catch(e => this._cleanup(e, ERRORS.SIM.PIN_FAILURE));
    },

    verifyPIN: function verifyPIN(pin) {
      return this._execPinCommand('verify', pin);
    },

    enablePIN: function enablePIN(pin) {
      return this._execPinCommand('enable', pin);
    },

    unblockPIN: function unblockPIN(puk, pin) {
      return this._execPinCommand('unblock', puk, pin);
    },

    disablePIN: function disablePIN(pin) {
      return this._execPinCommand('disable', pin);
    },

    changePIN: function changePIN(currentPin, newPin) {
      return this._execPinCommand('change', currentPin, newPin);
    },
  };

  exports.SIMAccess = SIMAccessManager;
}((typeof exports === 'undefined') ? window : exports));
