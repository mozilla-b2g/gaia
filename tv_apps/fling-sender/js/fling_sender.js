/* global Notification, asyncStorage */
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
    asyncStorage.getItem('latest-url', function(v) {
      if (v) {
        this._urlBox.value = v;
      }
    }.bind(this));

    ['start-btn', 'close-btn', 'load-btn', 'play-btn', 'pause-btn',
     'seek-btn'].forEach(function(id) {

      $(id).addEventListener('click', this);
    }.bind(this));
  };

  proto.handleEvent = function fs_handleEvent(evt) {
    switch(evt.type) {
      case 'message':
        var data = JSON.parse(evt.data);
        switch(data.type) {
          case 'ack':
            this.handleMessage($('ack-result'), data);
            break;
          case 'status':
            this.handleMessage($('status-result'), data);
            break;
        }
        break;
      case 'click':
        switch(evt.target.id) {
          case 'start-btn':
            this.startSession();
            break;
          case 'close-btn':
            this.closeSession();
            break;
          case 'load-btn':
            asyncStorage.setItem('latest-url', this._urlBox.value);
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
    element.textContent = JSON.stringify(msg);
  };

  proto.handleStateChange = function fs_handleStateChange() {
    if (!this._session || !this._session.state) {
      this.disableButtons(true);
      this._session = null;
      if (!this._sessionCloseExpected) {
        /*jshint nonew: false */
        new Notification('fling player disconnected', {
          'body': 'fling player is unexpectedly disconnected.'
        });
      }
      this._sessionCloseExpected = false;
    }
  };

  proto.disableButtons = function fs_disableButtons(disabled) {
    ['close-btn', 'load-btn', 'play-btn', 'pause-btn', 'seek-btn',
     'url-text-box', 'seek-text-box'].forEach(function(id) {
      $(id).disabled = disabled;
    }.bind(this));
  };

  proto.startSession = function fs_startSession() {
    if (!navigator.mozPresentation) {
      return;
    }
    navigator.mozPresentation.startSession(PLAYER_URL).then(function (session) {
      this._session = session;
      this._session.onmessage = this.handleEvent.bind(this);
      this._session.onstatechange = this.handleStateChange.bind(this);
      this.disableButtons(false);
    }.bind(this), function fail() {
      console.log('start session rejected');
    }.bind(this));
  };

  proto.closeSession = function fs_closeSession() {
    if (this._session) {
      this._sessionCloseExpected = true;
      this._session.disconnect();
    }
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
    this._session.send(JSON.stringify(msg));
  };

  exports.FlingSender = FlingSender;

  window.onload = function() {
    window.fs = new FlingSender();
    window.fs.init();
  };
})(window);
