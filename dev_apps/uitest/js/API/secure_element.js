'use strict';

/* globals Utils, AID, APDU */

var SIMAccessManager = {
  ERROR_MSG: {
    NOT_IDLE: 'WRONG SIM ACCESS STATE',
    ACCESS_FAILED: 'FAILED TO ENABLE SIM ACCESS',
    APPLETS_FAILED: 'FAILED TO GET APPLETS DATA'
  },

  SIM_ACCESS_STATES: {
    DISABLED: 'disabled',
    IDLE: 'idle',
    BUSY: 'busy'
  },

  _simState: null,
  _seSession: null,

  start: function start() {
    if(!navigator.seManager) {
      return Promise.reject('Securel Element API not present');
    }

    return navigator.seManager.getSEReaders()
    .then((readers) => {
      return readers[0].openSession();
    })
    .then((session) => {
      this._seSession = session;
      this._simState = this.SIM_ACCESS_STATES.IDLE;
    })
    .catch(() => {
      this._simState = this.SIM_ACCESS_STATES.DISABLED;
      return Promise.reject(this.ERROR_MSG.ACCESS_FAILED);
    });
  },

  stop: function stop() {
    return this._seSession.closeAll()
    .then(() => {
      this._seSession = null;
      this._simState = this.SIM_ACCESS_STATES.DISABLED;
    });
  },

  getAppletsData: function getAppletsData() {
    if(this._simState !== this.SIM_ACCESS_STATES.IDLE) {
      return Promise.reject(this.ERROR_MSG.NOT_IDLE);
    }

    this._simState = this.SIM_ACCESS_STATES.BUSY;
    return this._seSession.openLogicalChannel(AID.CRS)
    .then((channel) => {
      return channel.transmit(APDU.CRS.getStatusAll1st);
    })
    .then((resp) => {
      var receivedData = new Uint8Array();

      // we can get different responses, also propriatary
      // using counter to not allow to try to query the SIM indifinately
      var count = 0;
      var condition = (resp) =>
        (count++ > 10 || resp.sw1 === 0x90 && resp.sw2 === 0x00);
      var action = (resp) => {
        receivedData = Utils.joinUint8Arrays(receivedData, resp.data);
        return resp.channel.transmit(APDU.CRS.getStatusAllNext)
      };

      return Utils.whilePromise(condition, action, resp)
      .then((lastResp) => {
        lastResp.channel.close();
        this._simState = this.SIM_ACCESS_STATES.IDLE;

        return Utils.joinUint8Arrays(receivedData, lastResp.data);
      });
    })
    .catch((e) => {
      return this._cleanup(this.ERROR_MSG.APPLETS_FAILED);
    });
  },

  toggleApplet: function toggleApplet(on, aid) {
    if(this._simState !== this.SIM_ACCESS_STATES.IDLE) {
      return Promise.reject(this.ERROR_MSG.NOT_IDLE);
    }

    this._simState = this.SIM_ACCESS_STATES.BUSY;
    var apdu = on ? APDU.CRS.activateCLF(aid) : APDU.CRS.deactivateCLF(aid);
    return this._seSession.openLogicalChannel(AID.CRS)
    .then((channel) => channel.transmit(apdu))
    .then((resp) => {
       return resp.channel.close()
       .then(() => {
         this._simState = this.SIM_ACCESS_STATES.IDLE;
         return resp.sw1 === 0x90 && resp.sw2 === 0x00;
       });
    });
  },

  _cleanup: function cleanup(message) {
    this._simState = this.SIM_ACCESS_STATES.IDLE;
    return Promise.reject(message);
  }
};

var WalletDemo = {
  init: function init() {
    if(!navigator.seManager) {
      this._updateStatus('Secure Element API not available.');
      return;
    }

    SIMAccessManager.start()
    .then(() => {
      this._updateStatus('Init SIM access, getting applets from CRS');
      return this._readDataRefreshUI();
    })
    .catch((error) => {
      this._updateStatus('Init failed.', error);
      SIMAccessManager.stop();
    });
  },

  _readDataRefreshUI: function readDataRefreshUI() {
    return SIMAccessManager.getAppletsData()
    .then((appletsData) => {
      // parsing and filtering to get payment enabled applets
      var list = Utils.parseAppletsData(appletsData).filter((applet) => {
        return applet.state === '1F01' || applet.state === '1F00';
      });
      this._updateStatus(list.length + ' applets read from SIM');
      this._updateUI(list);
    });
  },

  _updateUI: function updateUI(parsedApplets) {
    var div = document.querySelector('#applets-view div');
    div.innerHTML = '';
    parsedApplets.forEach((applet) => {
      var button = document.createElement('button');
      var state = (applet.state === '1F01') ? 'active' : 'not active' ;
      button.innerHTML = '<p>' + applet.aid + '</p>' +
                         '<p> contactless state: ' + state + '</p>';

      button.addEventListener('click',
        () => this._toggleApplet(applet.state === '1F00', applet.aid));
      div.appendChild(button);
    });
  },

  _toggleApplet: function toggleApplet(activate, aid) {
    SIMAccessManager.toggleApplet(activate, aid)
    .then((success) => {
      if(success) {
        this._updateStatus(aid + ' ' + ((activate) ? 'active' : 'not active'));
        return this._readDataRefreshUI();
      }
      this._updateStatus('Failed to change state of' +  aid);
    })
    .catch((error) => {
      this._updateStatus('Failed to toggle applets', error);
    });
  },

  _updateStatus: function showStatus(status, error) {
    console.log(status);
    var selector = '.success';
    if(error) {
      console.log(error);
      selector = '.error';
      status += ', error: ' + error;
    }
    document.querySelector(selector).textContent = status;
  },

};

window.addEventListener('load', () => WalletDemo.init());
