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

    if (!window.PresentationRequest) {
      return;
    }
    this._request = new window.PresentationRequest(PLAYER_URL);
    this._request.getAvailability().then(
      function(aAvailability) {
        aAvailability.onchange = function() {
          $('start-btn').disabled = !aAvailability.value;
          console.log('Device available: ' + aAvailability.value);
        };
        console.log('Device available: ' + aAvailability.value);
        $('start-btn').disabled = !aAvailability.value;
      },
      function(aError) {
        console.log('Error occurred when getting availability: ' + aError);
      }
    );
  };

  proto.handleEvent = function fs_handleEvent(evt) {
    switch(evt.type) {
      case 'message':
        this.handleData(evt.data);
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
            this.sendCommand('device-info', {
              'displayName': 'Fling Sender App'
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
              'time': parseInt(this._seekBox.value, 10)
            });
            break;
        }
        break;
    }
  };

  proto.handleData = function fs_handleData(data) {
    data = '[' + data.replace(/}{/g, '},{') + ']';
    var msgs = JSON.parse(data);

    msgs.sort((a, b) => {
      return a.seq - b.seq;
    });

    msgs.forEach((msg) => {
      switch(msg.type) {
        case 'ack':
          this.handleMessage($('ack-result'), msg);
          break;
        case 'status':
          this.handleMessage($('status-result'), msg);
          break;
      }
    });
  },

  proto.handleMessage = function fs_handleMessage(element, msg) {
    element.textContent = JSON.stringify(msg);
  };

  proto.handleStateChange = function fs_handleStateChange() {
    if (!this._session || this._session.state != 'connected') {
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
    this._request.start().then(function (session) {
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
      this._session.terminate();
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
