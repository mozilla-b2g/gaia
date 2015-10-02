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
    this._isInitSession = false;
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

    this._presentation.receiver.getSession().then(
      this._initSession.bind(this)
    );

    // TODO: How to do with multi-sessions cases
    this._presentation.receiver.onsessionavailable = (e) => {
      this._presentation.receiver.getSession().then(
        this._initSession.bind(this)
      );
    };
  };

  proto._initSession = function (session) {

    if (this._isInitSession) {
      return;
    }

    mDBG.log('Connector#_initSession');
    if (!this._presentation) {
      throw new Error('Init session without the presentation object.');
    }
    this._isInitSession = true;
    mDBG.log('this._session = ', session);

    this._session = session;
    this._session.onmessage = this.onSessionMessage.bind(this);
    this._session.onstatechange = this.onSessionStateChange.bind(this);
  };

  proto.sendMsg = function (msg) {
    mDBG.log('Connector#sendMsg');
    mDBG.log('msg = ', msg);
    this._session.send(castingMessage.stringify(msg));
  };

  proto.replyACK = function (msg, error) {

    mDBG.log('Connector#replyACK');

    var reply = {
          'type': 'ack',
          'seq': msg.seq
        };

    if (error) {
      reply.error = error;
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
      msg.error = data.error;
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
      }
    } catch (e) {
      err = e;
      mDBG.error(e);
    }

    this.replyACK(msg, err);
  };

  proto.onSessionMessage = function (e) {
    mDBG.log('Connector#onSessionMessage');

    var messages = castingMessage.parse(e.data);
    mDBG.log('messages = ', messages);

    messages.sort((a, b) => { // Make sure message sequence
      return a.seq - b.seq;
    });
    messages.forEach(message => this.handleRemoteMessage(message));
  };

  proto.onSessionStateChange = function () {
    mDBG.log('Connector#onSessionStateChange');
    mDBG.log('State = ', this._session.state);
    // TODO: How to do when presentation session is closed or terminated
  };

  exports.Connector = Connector;

})(window);
