'use strict';

function IMEI(conn) {
  var IMEIText = document.getElementById('IMEI');

  var req = conn.sendMMI('*#06#');
  req.onsuccess = function getIMEI() {
    if (req.result && req.result.statusMessage) {
      IMEIText.textContent = req.result.statusMessage;
    }
  };
}

function iccInfo(iccManager)
{
  var messageText = document.getElementById('message-icc');
  var ICCIDText = document.getElementById('ICCID');
  var MSISDNText = document.getElementById('MSISDN');
  var container = document.getElementById('icc-container');

  iccManager.addEventListener('iccinfochange', update_icc);
  update_icc();

  function update_icc() {
    if (iccManager.cardState != 'ready' ||
        !iccManager.iccInfo) {
      container.hidden = true;
      messageText.textContent = 'Airplane mode on / No SIM card';
    }
    else {
      ICCIDText.textContent = iccManager.iccInfo.iccid;
      MSISDNText.textContent = iccManager.iccInfo.msisdn || 'Unknown';
      container.hidden = false;
      messageText.textContent = '';
    }
  }
}

function mobileConnectionInfo(conn, iccManager)
{
  var messageText = document.getElementById('message-mobileConnection');
  var voiceText = {
    'network': document.getElementById('voice-network'),
    'strength': document.getElementById('voice-strength'),
    'LAC': document.getElementById('voice-LAC'),
    'CID': document.getElementById('voice-CID'),
    'type': document.getElementById('voice-type'),
    'roaming': document.getElementById('voice-roaming')
  };
  var dataText = {
    'network': document.getElementById('data-network'),
    'strength': document.getElementById('data-strength'),
    'LAC': document.getElementById('data-LAC'),
    'CID': document.getElementById('data-CID'),
    'type': document.getElementById('data-type'),
    'roaming': document.getElementById('data-roaming')
  };
  var container = document.getElementById('mobileconnection-container');

  // XXX: ondatachange does not fire event while
  // navigator.mozIccManager.oniccinfochange seems to work
  //mobileConnection.addEventListener('datachange', update_data_network
  //mobileConnection.addEventListener('voicechange', update_voice_network);
  iccManager.addEventListener('iccinfochange', update_data_network.bind(this));
  iccManager.addEventListener('iccinfochange', update_voice_network.bind(this));
  update_data_network();
  update_voice_network();

  function update_data_network() {
    update_network(conn.data, dataText);
  }
  function update_voice_network() {
    update_network(conn.voice, voiceText);
  }
  function update_network(network, networkText) {
    if (iccManager.cardState != 'ready' ||
       !conn || !network || !network.connected ||
       network.emergencyCallsOnly) {
      container.hidden = true;
      messageText.textContent = 'Airplane mode on';
    }
    else {
      networkText.network.textContent = network.network.shortName;
      networkText.LAC.textContent = network.cell.gsmCellId;
      networkText.CID.textContent = network.cell.gsmLocationAreaCode;
      networkText.strength.textContent = network.relSignalStrength;
      networkText.type.textContent = network.type;
      networkText.roaming.textContent = network.roaming;
      container.hidden = false;
      messageText.textContent = '';
    }
  }
}

function radioTest() {
  if (('mozIccManager' in navigator) &&
      navigator.mozIccManager &&
      ('mozMobileConnection' in navigator) &&
      navigator.mozMobileConnection) {
    var conn = navigator.mozMobileConnection;
    var iccManager = navigator.mozIccManager;

    // IMEI
    IMEI(conn);

    // SIM card information such as ICCID, MSISDN
    iccInfo(iccManager);

    // data & voice network information
    mobileConnectionInfo(conn, iccManager);
  }
  else {
    alert('Your device does not support navigator.mozIccManager or navigator.mozMobileConnection');
  }
}

window.addEventListener('load', radioTest);
