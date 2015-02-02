(function(exports) {
  'use strict';

  const PLAYER_URL = 'app://fling-player.gaiamobile.org/index.html';

  var seq = 0;

  function $(id) {
    return document.getElementById(id);
  }

  function FlingSender() {}

  var proto = FlingSender.prototype;

  proto.init = function fs_init() {
    this._urlBox = $('url-text-box');
    this._seekBox = $('seek-text-box');

    ['start-btn', 'load-btn', 'play-btn', 'pause-btn', 'seek-btn'].forEach(
      function(id) {
        $(id).addEventListener('click', this);
      }.bind(this));
  };

  proto.handleEvent = function fs_handleEvent(evt) {
    switch(evt.type) {
      case 'message':
        this.handleMessage(evt.data);
        switch(evt.data.type) {
          case 'ack':
            this.handleMessage($('ack-result'), evt.data);
            break;
          case 'status':
            this.handleMessage($('status-result'), evt.data);
            break;
        }
        break;
      case 'click':
        switch(evt.target.id) {
          case 'start-btn':
            this.startSession();
            break;
          case 'load-btn':
            this.sendCommand('load', {
              'url': this._urlBox.value
            });
            break;
          case 'play-btn':
            this.sendCommand('play');
            break;
          case 'pause-btn':
            this.sendCommand('pause');
            break;
          case 'seek-btn':
            this.sendCommand('seek', {
              'time': this._seekBox.value
            });
            break;
        }
        break;
    }
  };

  proto.handleMessage = function fs_handleMessage(element, msg) {
    element.textContent += JSON.stringify(msg);
  };

  proto.enableButtons = function fs_enableButtons() {
    ['load-btn', 'play-btn', 'pause-btn', 'seek-btn',
     'url-text-box', 'seek-text-box'].forEach(function(id) {
      $(id).disabled = false;
    }.bind(this));
  };

  proto.startSession = function fs_startSession() {
    if (!navigator.mozPresentation) {
      return;
    }
    navigator.mozPresentation.startSession(PLAYER_URL).then(function (session) {
      this._session = session;
      this._session.addEventListener('message', this);
      this.enableButtons();
    }.bind(this), function fail() {
      console.log('start session rejected');
    }.bind(this));
  };

  proto.sendCommand = function fs_sendCommand(command, data) {
    var msg = {
      'type': command,
      'seq': ++seq
    };
    if (data) {
      for (var k in data) {
        msg[k] = data[k];
      }
    }
    this._session.send(msg);
  };

  exports.FlingSender = FlingSender;

  window.onload = function() {
    window.fs = new FlingSender();
    window.fs.init();
  };
})(window);
