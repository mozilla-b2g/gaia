/* global evt, castingMessage */
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
  }

  var proto = evt(Connector.prototype);

  proto.init = function c_init() {

    console.log('Connector#init');
    if (!this._presentation) {
      throw new Error('Init connection without the presentation object.');
    }

    if (this._presentation.session) {
      console.log('init session');
      this._initSession(this._presentation.session);
    } else {
      console.log('no session, so listent to sessionready event.');
      this._presentation.addEventListener('sessionready', this);
    }
  };

  proto._initSession = function c_initSession(session) {

    console.log('Connector#_initSession');
    if (!this._presentation) {
      throw new Error('Init session without the presentation object.');
    }

    this._session = session;
    console.log('this._session = ', this._session);

    if (this._session.state !== 'connected') {

      console.log('not connected state so listen to onstatechange');

      this._session.onstatechange = function() {

        console.log('this._session.onstatechange and state = ' +
          this._session.state);

          if (this._session.state === 'connected') {
            this._initSession(this._session);
          }
      }.bind(this);

    } else {
      console.log('connected state so listen to onmessage');
      this._session.onmessage = this.handleEvent.bind(this);
    }
  };

  proto.sendMsg = function (msg) {
    console.log('Connector#sendMsg');
    console.log('msg = ', msg);
    this._session.send(castingMessage.stringify(msg));
  };

  proto.replyACK = function c_replyACK(msg, error) {

    console.log('Connector#replyACK');

    var reply = {
          'type': 'ack',
          'seq': msg.seq
        };

    if (error) {
      reply.error = error;
    }

    this.sendMsg(reply);
  };

  proto.reportStatus = function c_reportStatus(status, data) {

    console.log('Connector#reportStatus');

    var msg = {
      'type': 'status',
      'seq': this._msgSeq++,
      'status': status,
      'time': data.time
    };

    if (data.error) {
      msg.error = data.error;
    }

    if (data.detail) {
      msg.detail = data.detail;
    }

    this.sendMsg(msg);
  };

  proto.handleRemoteMessage = function c_handleRemoteMessage(msg) {

    console.log('Connector#handleRemoteMessage');
    console.log('msg = ', msg);

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
      console.error(e);
    }

    this.replyACK(msg, err);
  };

  proto.handleEvent = function c_handleEvent(evt) {

    console.log('Connector#handleEvent: event = ', evt);

    switch(evt.type) {

      case 'sessionready':
        console.log('session is ready so init session');
        this._initSession(this._presentation.session);
      break;

      case 'message':
        console.log('receive message so process message');

        var messages = castingMessage.parse(evt.data);

        messages.sort((a, b) => { // Make sure message sequence
          return a.seq - b.seq;
        });

        messages.forEach(message => this.handleRemoteMessage(message));
      break;
    }
  };

  exports.Connector = Connector;

})(window);