'use strict';

function FMRadioTest() {
  var messageText = document.getElementById('message');
  var frequencyMin = document.getElementById('frequency-min');
  var frequencyMax = document.getElementById('frequency-max');

  var container = document.getElementById('container');
  var controlPanel = document.getElementById('controlPanel');

  var frequencyInput = document.getElementById('frequency');
  var switchBtn = document.getElementById('switch');
  var seekUpBtn = document.getElementById('seekUp');
  var seekDownBtn = document.getElementById('seekDown');
  var seekAndCancelBtn = document.getElementById('seekAndCancel');

  if (!navigator.mozFMRadio) {
    console.log('mozFMRadio not support');
    container.hidden = true;
    return;
  }

  var radio = navigator.mozFMRadio;
  var prevFreq = radio.frequencyLowerBound;
  var lock = false;
  if (radio.enabled) {
    prevFreq = radio.frequency;
  }

  switchBtn.textContent = radio.enabled;
  frequencyMin.textContent = radio.frequencyLowerBound;
  frequencyMax.textContent = radio.frequencyUpperBound;
  controlPanel.hidden = !radio.enabled;
  frequencyInput.value = prevFreq;

  togglePanel();
  toggleControlPanel();

  radio.addEventListener('antennaavailablechange', togglePanel);
  radio.addEventListener('frequencychange', frequencyChanged);

  frequencyInput.addEventListener('change', setFrequency);
  switchBtn.addEventListener('click', onclick_radioSwitch);
  seekUpBtn.addEventListener('click', seek);
  seekDownBtn.addEventListener('click', seek);
  seekAndCancelBtn.addEventListener('click', seekAndCancel);
  window.addEventListener('unload', uninit);

  function logError() {
    messageText.textContent = this.error.name;
  }

  // show/hide panels
  function togglePanel() {
    if (radio && radio.antennaAvailable) {
      container.hidden = false;
      messageText.textContent = '';
    }
    else {
      container.hidden = true;
      messageText.textContent = 'Headphone is required for FMRadio';
    }
  }

  function toggleControlPanel() {
    lock = false;
    controlPanel.hidden = !radio.enabled;
    if (radio.enabled) {
      switchBtn.textContent = 'Stop';
    }
    else {
      switchBtn.textContent = 'Start';
    }
    switchBtn.disabled = false;
  }

  function onclick_radioSwitch() {
    if (lock) {
      return;
    }

    // lock button until request is finished
    lock = true;
    switchBtn.disabled = true;

    var req;
    if (!radio.enabled) {
      messageText.textContent = 'turning on FM, please wait...';
      req = radio.enable(prevFreq);
    }
    else {
      req = radio.disable();
    }
    req.onsuccess = req.onerror = function() {
      toggleControlPanel();
      if (this.error) {
        messageText.textContent = this.error.name;
      }
      else {
        messageText.textContent = '';
      }
    };
  }

  function frequencyChanged() {
    console.log('freq changed');
    frequencyInput.value = radio.frequency;
    prevFreq = radio.frequency;
  }

  function setFrequency() {
    var req = radio.setFrequency(frequencyInput.value);
    req.onerror = logError;
  }

  function seek(evt) {
    var req;
    if (evt.target.id == 'seekUp') {
      req = radio.seekUp();
    }
    else {
      req = radio.seekDown();
    }
    req.onerror = logError;
  }

  function seekAndCancel(evt) {
    var req = radio.seekUp();
    console.log('seekUP()');
    req.onsuccess = function() {
      console.log('seekUP().onsuccess');
    };
    req.onerror = function() {
      console.log('seekUP().onerror:' + this.error.name);
    };

    var cancel = radio.cancelSeek();
    console.log('cancel()');
    cancel.onsuccess = function() {
      console.log('canelSeek().onsuccess');
    };
    cancel.onerror = function() {
      console.log('cancelSeek().onerror:' + this.error.name);
    };
  }

  function uninit() {
    if (radio.enabled) {
      radio.disable();
    }
  }
}

window.addEventListener('load', FMRadioTest);
