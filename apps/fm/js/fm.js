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

  request.onsuccess = function turnon_onsuccess() {
    log('Turn on FM successfully');
  };

  request.onerror = function turnon_onerror() {
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

  request.onsuccess = function turnoff_onsuccess() {
    log('Turn off FM successfully');
  };

  request.onerror = function turnoff_onerror() {
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

  request.onsuccess = function setfreq_onsuccess() {
    log('Set freq successfully!' + parseInt($('freq').value));
  };

  request.onerror = function sefreq_onerror() {
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

  request.onsuccess = function seekup_onsuccess() {
    $('current_freq').innerHTML = mozFMRadio.frequency;
    log('Seek up complete, and got new program.');
  };

  request.onerror = function seekup_onerror() {
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

  request.onsuccess = function seekdown_onsuccess() {
    $('current_freq').innerHTML = mozFMRadio.frequency;
    log('Seek down complete, and got new program.');
  };

  request.onerror = function seekdown_onerror() {
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

  request.onsuccess = function cancel_onsuccess() {
    log('Seeking is canceled.');
  };

  request.onerror = function cancel_onerror() {
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

mozFMRadio.onantennachanged = function fm_onantennachanged() {
  $('antenna_state').innerHTML = mozFMRadio.antennaAvailable ?
                                   'available' : 'unavailable';
};

mozFMRadio.onfrequencychanged = function fm_onfrequencychanged(event) {
  $('current_freq').innerHTML = mozFMRadio.frequency;
};

mozFMRadio.onpowerchanged = function fm_onpowerchanged() {
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

