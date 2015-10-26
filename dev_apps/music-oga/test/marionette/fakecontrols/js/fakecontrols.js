/* exported controls */
'use strict';

function RemoteControls() {
  this.controls = document.getElementById('controls');
  this.controls.addEventListener('click', this);

  this.playPauseButton = document.getElementById('playpause');

  window.navigator.mozSetMessageHandler('connection', function(request) {
    if (request.keyword !== 'mediacomms') {
      return;
    }

    this.port = request.port;
  }.bind(this));
}

RemoteControls.prototype = {
  handleEvent: function(event) {
    if (!this.port) {
      return;
    }

    var command = null;
    switch (event.target) {
      case this.playPauseButton:
        command = 'playpause';
        break;
    }

    if (command) {
      this.port.postMessage({command: command});
    }
  }
};

var controls = new RemoteControls();
