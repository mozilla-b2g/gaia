(function(exports) {
  'use strict';

  var connectionState = {
    connected : 'connected',
    closed : 'closed',
    terminated : 'terminated'
  };

  function MockPresentationConnection() {
    this.id = 0;
    this.state = connectionState.closed;
    this.onmessage = null;
    this.onstatechange = null;
  }

  MockPresentationConnection.prototype = {

    mOpen : function () {
      console.log('MockPresentationConnection#mOpen');
      this.state = connectionState.connected;
      if (typeof this.onstatechange == 'function') {
        this.onstatechange(new Event('statechange'));
      }
    },

    mReceive : function (txt) {
      if (this.state != connectionState.connected) {
        return;
      }

      if (typeof this.onmessage == 'function') {
        var e = new Event('message', { bubbles : false, cancelable : false });
        e.data = txt;
        this.onmessage(e);
      }
    },

    close : function () {
      if (this.state != connectionState.connected) {
        return;
      }

      this.state = connectionState.closed;
      if (typeof this.onstatechange == 'function') {
        this.onstatechange(new Event('statechange'));
      }
    },

    terminate : function () {
      if (this.state != connectionState.connected) {
        return;
      }

      this.state = connectionState.terminated;
      if (typeof this.onstatechange == 'function') {
        this.onstatechange(new Event('statechange'));
      }
    },

    send : function () {}
  };


  function MockPresentationReceiver() {
    this.onconnectionavailable;
    this._connection; // MockPresentationConnection
    this._inited = false;
    this._resolve;
    this._connPromise = new Promise((resolve, reject) => {
      this._resolve = resolve;
    });
  }

  MockPresentationReceiver.prototype = {

    mInit : function (connection) {
      if (!this._inited) {
        console.log('MockPsentationReceiver#mInit');
        this._inited = true;
        this._connection = connection;
        if (typeof this.onconnectionavailable == 'function') {
          this.onconnectionavailable(new Event('connectionavailable'));
        }
        this._resolve(this._connection);
        this._connection.mOpen();
      }
    },

    getConnection : function () {
      return this._connPromise;
    }
  };


  function MockPresentation() {
    this._inited = false;
    this.receiver = new MockPresentationReceiver();
  }

  MockPresentation.prototype = {

    mInit : function () {
      if (!this._inited) {
        console.log('MockPresentation#mInit');
        this._inited = true;
        this.receiver.mInit(new MockPresentationConnection());
      }
    },

    /**
     * @param {Object|Array.<Object>} msgs
     */
    mCastMsgToReceiver : function (msgs) {
      if (this.receiver._connection && this._inited) {
        var txt = '';

        if (!(msgs instanceof Array)) {
          msgs = [msgs];
        }

        msgs.forEach((m) => {
          txt += JSON.stringify(m);
        });
        this.receiver._connection.mReceive(txt);
      }
    }
  };

  exports.MockPresentation = MockPresentation;

})(window);
