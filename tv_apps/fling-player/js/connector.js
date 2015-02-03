(function(exports) {
  'use strict';

  var seq = 0;
  function Connector(player) {
    this._player = player;
  }

  var presentation = navigator.mozPresentation;
  var proto = Connector.prototype;

  proto.init = function c_init() {
    if (!presentation) {
      return;
    }

    if (presentation.session) {
      this.initSession(presentation.session);
    } else {
      presentation.addEventListener('sessionready', this);
    }
  };

  proto.initSession = function c_initSession(session) {
    if (!presentation) {
      return;
    }

    this._session = session;
    this._session.onmessage = this.handleEvent.bind(this);
    this.initEvents();
  };

  proto.initEvents = function c_initEvents() {
    if (!this._player) {
      console.error('Connector doesn\'t have player object.');
      return;
    }

    this._player.on('loaded', this.reportStatus.bind(this, 'loaded'));
    this._player.on('seeked', this.reportStatus.bind(this, 'seeked'));
    this._player.on('playing', this.reportStatus.bind(this, 'playing'));
    this._player.on('timeupdate', this.reportStatus.bind(this, 'timeupdate'));
    this._player.on('stopped', this.reportStatus.bind(this, 'stopped'));
    this._player.on('buffering', this.reportStatus.bind(this, 'buffering'));
    this._player.on('buffered', this.reportStatus.bind(this, 'buffered'));
    this._player.on('error', this.reportStatus.bind(this, 'error'));
  };

  proto.handleRemoteMessage = function c_handleRemoteMessage(msg) {
    // We don't process the out of dated message.
    if (this._lastReceived >= msg.seq) {
      this.replyACK(msg, 'wrong-seq');
      return;
    }

    this._lastReceived = msg.seq;
    if (!this._player) {
      console.error('Connector doesn\'t have player object.');
      this.replyACK(msg, 'player-error');
      return;
    }
    var err;
    switch(msg.type) {
      case 'load':
        this._player.load(msg.url);
        break;
      case 'play':
        this._player.play();
        break;
      case 'pause':
        this._player.pause();
        break;
      case 'seek':
        try {
          this._player.seek(msg.time);
        } catch(e) {
          err = e.message;
        }
        break;
      default:
        return;
    }
    this.replyACK(msg, err);
  };

  proto.replyACK = function c_replyACK(msg, error) {
    var reply = {
                  'type': 'ack',
                  'seq': msg.seq
                };
    if (error) {
      reply.error = error;
    }
    this._session.send(JSON.stringify(reply));
  };

  proto.reportStatus = function c_reportStatus(status, data) {
    var msg = {
      'type': 'status',
      'seq': seq++,
      'status': status,
      'time': data.time
    };
    if (data.error) {
      msg.error = data.error;
    }
    if (data.detail) {
      msg.detail = data.detail;
    }
    this._session.send(JSON.stringify(msg));
  };

  proto.handleEvent = function c_handleEvent(evt) {
    switch(evt.type) {
      case 'sessionready':
        this.initSession(presentation.session);
        break;
      case 'message':
        this.handleRemoteMessage(JSON.parse(evt.data));
        break;
    }
  };

  exports.Connector = Connector;

})(window);
