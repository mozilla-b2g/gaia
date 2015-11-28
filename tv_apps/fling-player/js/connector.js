/* global evt, castingMessage, mDBG */
(function(exports) {
  'use strict';

  /**
   * This class handles the connection to controller via the presentation API
   *
   * The events of connection status are:
   *   - connected: Triggered when the connection is established
   *
   * The events of controller's message are:
   *   - loadRequest: Triggered when controller asks to load video.
   *           Will be passed in one object with url property storing the
   *           video url.
   *   - playRequest: Triggered when controller asks to play video.
   *   - pauseRequest: Triggered when controller asks to pause video.
   *   - seekRequest: Triggered when controller asks to seek video.
   *           Will be passed in one object with time property storing the
   *           seeking time.
   *
   * @param {object} presentation The navigator's presentation object
   * @constructor
   */
  function Connector(presentation) {
    this._presentation = presentation;
    this._lastSeqSent = -1; // The sequence of message sent to controller
    this._lastSeqReceived = -1; // The sequence of the last message received
    this._isInit = false;
    this._isInitConnection = false;
  }

  var proto = evt(Connector.prototype);

  proto.init = function () {
    if (this._isInit) {
      return;
    }

    mDBG.log('Connector#init');
    this._isInit = true;

    this._presentation.receiver.getConnection().then(
      this._initConnection.bind(this)
    );
    this._presentation.receiver.onconnectionavailable = (e) => {
      this._presentation.receiver.getConnection().then(
        this._initConnection.bind(this)
      );
    };
  };

  proto._initConnection = function (connection) {
    if (this._isInitConnection) {
      return;
    }

    mDBG.log('Connector#_initConnection');
    mDBG.log('this._connection = ', connection);
    this._isInitConnection = true;
    this.fire('connected');
    this._connection = connection;
    this._connection.onmessage = this.onConnectionMessage.bind(this);
    this._connection.onstatechange = this.onConnectionStateChange.bind(this);
  };

  proto.isConnected = function () {
    return this._isInit && this._isInitConnection;
  };

  proto.sendMsg = function (msg) {
    if (!this.isConnected()) {
      return;
    }

    mDBG.log('Connector#sendMsg');
    mDBG.log('msg = ', msg);
    this._connection.send(castingMessage.stringify(msg));
  };

  proto.replyACK = function (msg, error) {
    if (!this.isConnected()) {
      return;
    }

    mDBG.log('Connector#replyACK');

    var reply = {
          'type': 'ack',
          'seq': msg.seq
        };

    if (error) {
      reply.error = '' + error;
    }

    this.sendMsg(reply);
  };

  /**
   * @return {number} The sequence of the status msg reported
   */
  proto.reportStatus = function (status, data) {
    if (!this.isConnected()) {
      return;
    }

    mDBG.log('Connector#reportStatus');

    var msg = {
      'type': 'status',
      'seq': ++this._lastSeqSent,
      'status': status,
      'time': data.time
    };

    if (data.error) {
      msg.error = '' + data.error;
    }

    if (data.detail) { // TODO: Discuss should we need this ?
      msg.detail = data.detail;
    }

    this.sendMsg(msg);
    return this._lastSeqSent;
  };

  proto.handleRemoteMessage = function (msg) {
    if (!this.isConnected()) {
      return;
    }

    mDBG.log('Connector#handleRemoteMessage');
    mDBG.log('msg = ', msg);

    var err;
    try {

      // We don't process the outdated message.
      if (this._lastSeqReceived >= msg.seq) {
        throw new Error('Receive outdated message with ' +
          'msg sequence = ' + msg.seq);
      }
      this._lastSeqReceived = msg.seq;

      switch(msg.type) {

        case 'load':
          if (typeof msg.url != 'string' && !msg.url) {
            throw new Error('Controller dose not provide the url to load.');
          }
          this.fire('loadRequest', { url : msg.url });
        break;

        case 'play':
          this.fire('playRequest');
        break;

        case 'pause':
          this.fire('pauseRequest');
        break;

        case 'seek':
          var time = +msg.time;
          if (time <= 0) {
            throw new Error('Controller asks to seek on invalid time = ' +
              time);
          }
          this.fire('seekRequest', { time : time });
        break;
      }
    } catch (e) {
      err = e;
      mDBG.error(e);
    }

    this.replyACK(msg, err);
  };

  proto.onConnectionMessage = function (e) {
    if (!this.isConnected()) {
      return;
    }

    mDBG.log('Connector#onConnectionMessage');

    var messages = castingMessage.parse(e.data);

    mDBG.log('messages = ', messages);

    messages.sort((a, b) => { // Make sure message sequence
      return a.seq - b.seq;
    });

    messages.forEach(message => this.handleRemoteMessage(message));
  };

  proto.onConnectionStateChange = function () {
    if (!this.isConnected()) {
      return;
    }

    mDBG.log('Connector#onConnectionStateChange');
    mDBG.log('State = ', this._connection.state);
    // TODO: How to do when presentation session is closed or terminated
  };

  exports.Connector = Connector;

})(window);
