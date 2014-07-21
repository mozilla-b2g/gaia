'use strict';

window.onload = function() {
  var commands = document.getElementById('commands');
  commands.addEventListener('click', function(event) {
    var cmdobj = {};
    var command = event.target.id[0];
    cmdobj[command] = {};

    var options = document.getElementsByTagName('input');
    for (var i = 0; i < options.length; i++) {
      cmdobj[command][options[i].name[0]] = options[i].value;
    }

    wakeUpFindMyDevice(cmdobj, IAC_API_KEYWORD_TEST);
  });

  var utils = document.getElementById('utils');
  utils.addEventListener('click', function(event) {
    wakeUpFindMyDevice(event.target.id, IAC_API_KEYWORD_TEST);
  });
};
