'use strict';

window.onload = function() {
  var systemPort = null;
  navigator.mozApps.getSelf().onsuccess = function() {
    var app = this.result;
    app.connect('findmydevice-test').then(function(ports) {
      if (ports.length !== 1) {
        console.error('got more than one connection?');
        return;
      }

      systemPort = ports[0];
    }, function(err) {
      console.error('failed to connect: ' + err);
    });
  };

  var buttons = document.getElementById('buttons');
  buttons.addEventListener('click', function(event) {
    var cmdobj = {};
    var command = event.target.id[0];
    cmdobj[command] = {};

    var options = document.getElementsByTagName('input');
    for (var i = 0; i < options.length; i++) {
      cmdobj[command][options[i].name[0]] = options[i].value;
    }

    systemPort.postMessage(cmdobj);
  });
};
