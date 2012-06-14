function $(id) {
  return document.getElementById(id);
}

function log(msg) {
  $('log').innerHTML = msg;
}

var mozFMRadio = navigator.mozFMRadio;

function turnOnFM(callback) {
  var request = null;
  try {
    request = mozFMRadio.setEnabled(true);
  } catch (e) {
    log(e);
  }

  request.onsuccess = function() {
    log('Turn on FM successfully');
  };

  request.onerror = function() {
    log('Failed to turn on FM!');
  };
}

function turnOffFM(callback) {
  var request = null;
  try {
    request = mozFMRadio.setEnabled(false);
  } catch (e) {
    log(e);
  }

  request.onsuccess = function() {
    log('Turn off FM successfully');
  };

  request.onerror = function() {
    log('Failed to turn off FM!');
  };
}

function setFreq() {
  var request = null;
  try {
    request = mozFMRadio.setFrequency(parseFloat($('freq').value));
  } catch (e) {
    log(e);
  }

  request.onsuccess = function() {
    log('Set freq successfully!' + parseInt($('freq').value));
  };

  request.onerror = function() {
    log('Fail to set fm freq');
  };
}

function getFreq() {
  $('current_freq').innerHTML = mozFMRadio.frequency;
}

function seekUp() {
  var request = null;
  try {
    request = mozFMRadio.seekUp();
  } catch (e) {
    log(e);
  }

  request.onsuccess = function() {
    $('current_freq').innerHTML = mozFMRadio.frequency;
    log('Seek up complete, and got new program.');
  };

  request.onerror = function() {
    log('Failed to seek up.');
  };
}

function seekDown() {
  var request = null;
  try {
    request = mozFMRadio.seekDown();
  } catch (e) {
    log(e);
  }

  request.onsuccess = function() {
    $('current_freq').innerHTML = mozFMRadio.frequency;
    log('Seek down complete, and got new program.');
  };

  request.onerror = function() {
    log('Failed to seek down.');
  };
}

function cancelSeek() {
  var request = null;
  try {
    request = mozFMRadio.cancelSeek();
  } catch (e) {
    log(e);
  }

  request.onsuccess = function() {
    log('Seeking is canceled.');
  };

  request.onerror = function() {
    log('Failed to cancel seek.');
  };
}

function checkAntenna() {
  log('Antenna: ' + mozFMRadio.antennaAvailable);
}

function enumNavigator() {
  var names = [];
  for (var n in navigator) {
    names.push(n);
  }
  names.push(mozFMRadio);
  log(names.join('<br/>'));
}

mozFMRadio.onantennachanged = function() {
  $('antenna_state').innerHTML = mozFMRadio.antennaAvailable ?
                                   'available' : 'unavailable';
};

mozFMRadio.onfrequencychanged = function(event) {
  $('current_freq').innerHTML = mozFMRadio.frequency;
};

mozFMRadio.onpowerchanged = function() {
  $('power_state').innerHTML = mozFMRadio.enabled ? 'on' : 'off';
};

window.addEventListener('load', function(e) {
  $('antenna_state').innerHTML = mozFMRadio.antennaAvailable ?
                                   'available' : 'unavailable';
  $('power_state').innerHTML = mozFMRadio.enabled ? 'on' : 'off';
  getFreq();
}, false);

// Turn off radio immediately when window is unloaded.
window.addEventListener('unload', function(e) {
  turnOffFM();
}, false);

