'use strict';

/* globals SEUtils, AID, APDU */
/* exported SIMAccessManager */

(function(exports) {

  var SIMAccessManager = function() {
    this.simState = this.SIM_ACCESS_STATES.DISABLED;
    this._crsAid = AID.CRS;
  };

  SIMAccessManager.prototype = {
    ERROR_MSG: {
      NOT_IDLE: 'WRONG SIM ACCESS STATE',
      ACCESS_FAILED: 'FAILED TO ENABLE SIM ACCESS'
    },

    SIM_ACCESS_STATES: {
      DISABLED: 'disabled',
      IDLE: 'idle',
      BUSY: 'busy'
    },

    simState: null,
    seSession: null,

    _crsAid: null,

    get crsAid() {
      return SEUtils.byteToHexString(this._crsAid);
    },

    set crsAid(value) {
      this._crsAid = SEUtils.hexStringToByte(value);
    },

    start: function sam_start() {
      if(!navigator.seManager) {
        return Promise.reject('Securel Element API not present');
      }

      return navigator.seManager.getSEReaders()
      .then((readers) => {
        return readers[0].openSession();
      })
      .then((session) => {
        this.seSession = session;
        this.simState = this.SIM_ACCESS_STATES.IDLE;
      })
      .catch(() => {
        this.simState = this.SIM_ACCESS_STATES.DISABLED;
        return Promise.reject(this.ERROR_MSG.ACCESS_FAILED);
      });
    },

    stop: function sam_stop() {
      return this.seSession.closeAll()
      .then(() => {
        this.seSession = null;
        this.simState = this.SIM_ACCESS_STATES.DISABLED;
      });
      // should we have catch here?
    },

    getAppletsData: function sam_getAppletsData() {
      if(this.simState !== this.SIM_ACCESS_STATES.IDLE) {
        return Promise.reject(this.ERROR_MSG.NOT_IDLE);
      }

      this.simState = this.SIM_ACCESS_STATES.BUSY;
      return this.seSession.openLogicalChannel(this._crsAid)
      .then((channel) => {
        // since 0x61 is not handled by the stack just yet, need to issue
        // GET RESPONSE to retrieve actuall data
        return channel.transmit(APDU.CRS.getStatusAll1st).then(() =>
               channel.transmit(APDU.getResponse));
      })
      .then((resp) => {
        var receivedData = new Uint8Array();

        // we can get different responses, also propriatary
        // using counter to not allow to try to query the SIM indifinately
        var count = 0;
        var condition = (resp) =>
          (count++ > 10 || resp.sw1 === 0x90 && resp.sw2 === 0x00);
        var action = (resp) => {
          receivedData = SEUtils.joinUint8Arrays(receivedData, resp.data);
          return resp.channel.transmit(APDU.CRS.getStatusAllNext).then(() =>
                 resp.channel.transmit(APDU.getResponse));
        };

        return SEUtils.promises.whilePromise(condition, action, resp)
        .then((lastResp) => {
          lastResp.channel.close();
          this.simState = this.SIM_ACCESS_STATES.IDLE;

          return SEUtils.joinUint8Arrays(receivedData, lastResp.data);
        });
      })
      .catch((e) => {
        return this._cleanup('FAILED TO GET APPLETS DATA');
      });
    },

    toggleFastPay: function sam_toggleFastPay(on, aid) {
      if(this.simState !== this.SIM_ACCESS_STATES.IDLE) {
        return Promise.reject(this.ERROR_MSG.NOT_IDLE);
      }

      this.simState = this.SIM_ACCESS_STATES.BUSY;
      var apdu = on ? APDU.CRS.activateCLF(aid) : APDU.CRS.deactivateCLF(aid);
      return this.seSession.openLogicalChannel(this._crsAid)
      .then((channel) => channel.transmit(apdu))
      .then((resp) => {
         return resp.channel.close()
         .then(() => {
           this.simState = this.SIM_ACCESS_STATES.IDLE;
           return resp.sw1 === 0x90 && resp.sw2 === 0x00;
         });
      });
    },

    _cleanup: function sam_cleanup(message) {
      this.simState = this.SIM_ACCESS_STATES.IDLE;
      return Promise.reject(message);
    }
  };

  exports.simAccessManager = new SIMAccessManager();
}(window));