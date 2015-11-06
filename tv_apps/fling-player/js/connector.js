/* global evt, castingMessage, mDBG */
(function(exports) {
  'use strict';

  /**
   * This class handles the connection to controller via the presentation API
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
    this._msgSeq = 0; // This sequence of message sent to controller
    this._lastSeq = -1; // The sequence of the last message received
    this._isInit = false;
    this._isInitConnection = false;
    this._controllingDeviceInfo = null;
  }

  var proto = evt(Connector.prototype);

  proto.init = function () {

    if (this._isInit) {
      return;
    }

    mDBG.log('Connector#init');
    if (!this._presentation) {
      throw new Error('Init connection without the presentation object.');
    }

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
    if (!this._presentation) {
      throw new Error('Init connection without the presentation object.');
    }

    this._isInitConnection = true;

    mDBG.log('this._connection = ', connection);

    this._connection = connection;
    this._connection.onmessage = this.onConnectionMessage.bind(this);
    this._connection.onstatechange = this.onConnectionStateChange.bind(this);
  };

  proto.sendMsg = function (msg) {
    mDBG.log('Connector#sendMsg');
    mDBG.log('msg = ', msg);
    try {
      var txt = castingMessage.stringify(msg);
      this._connection.send(txt);
    } catch (e) {
      mDBG.error(e);
    }
  };

  proto.getControllingDeviceInfo = function () {
    return new Promise((resolve, reject) => {
      if (this._controllingDeviceInfo) {
        resolve(this._controllingDeviceInfo);
      } else {
        var handle = () => {
          this.off('ControllingDeviceInfoUpdated', handle);
          resolve(this._controllingDeviceInfo);
        };
        this.on('ControllingDeviceInfoUpdated', handle);
      }
    });
  };

  proto.replyACK = function (msg, error) {

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

  proto.reportStatus = function (status, data) {

    mDBG.log('Connector#reportStatus');

    var msg = {
      'type': 'status',
      'seq': this._msgSeq++,
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
  };

  proto.handleRemoteMessage = function (msg) {

    mDBG.log('Connector#handleRemoteMessage');
    mDBG.log('msg = ', msg);

    var err;
    try {

      // We don't process the out of dated message.
      if (this._lastSeq >= msg.seq) {
        throw new Error('Receive outdated message with ' +
          'msg sequence = ' + msg.seq);
      }
      this._lastSeq = msg.seq;

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

        case 'device-info':
          this._controllingDeviceInfo = {
            displayName: msg.displayName
          };
          this.fire('ControllingDeviceInfoUpdated');
        break;
      }
    } catch (e) {
      err = e;
      mDBG.error(e);
    }

    this.replyACK(msg, err);
  };

  proto.onConnectionMessage = function (e) {
    mDBG.log('Connector#onConnectionMessage');

    var messages = castingMessage.parse(e.data);

    mDBG.log('messages = ', messages);

    messages.sort((a, b) => { // Make sure message sequence
      return a.seq - b.seq;
    });

    messages.forEach(message => this.handleRemoteMessage(message));
  };

  proto.onConnectionStateChange = function () {
    mDBG.log('Connector#onConnectionStateChange');
    mDBG.log('State = ', this._connection.state);
    // TODO: How to do when presentation session is closed or terminated
  };

  exports.Connector = Connector;

})(window);
