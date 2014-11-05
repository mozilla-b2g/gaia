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

// SIM card information such as ICCID, MSISDN
function iccInfo(mozIcc, parentContainer)
{
  var messageText = parentContainer.querySelector('[data-type="icc-message"]');
  var ICCIDText = parentContainer.querySelector('[data-type="ICCID"]');
  var MSISDNText = parentContainer.querySelector('[data-type="MSISDN"]');
  var container = parentContainer.querySelector('[data-type="icc-container"]');

  mozIcc.addEventListener('cardstatechange', update_icc);
  update_icc();

  function update_icc() {
    if (mozIcc.cardState == null ||
        !mozIcc.iccInfo) {
      container.hidden = true;
      messageText.textContent = 'Airplane mode on';
    }
    else {
      ICCIDText.textContent = mozIcc.iccInfo.iccid;
      MSISDNText.textContent = mozIcc.iccInfo.msisdn || 'Unknown';
      container.hidden = false;
      messageText.textContent = '';
    }
  }
}

// data & voice network information
function mobileConnectionInfo(conn, parentContainer)
{
  conn.addEventListener('datachange', update_data_network);
  conn.addEventListener('voicechange', update_voice_network);
  update_data_network();
  update_voice_network();

  function update_data_network() {
    var container = parentContainer.
                      querySelector('[data-type="data-container"]');
    var message = parentContainer.
                      querySelector('[data-type="data-message"]');
    var result = update_network(conn.data, container, message);
  }
  function update_voice_network() {
    var container = parentContainer.
                      querySelector('[data-type="voice-container"]');
    var message = parentContainer.
                      querySelector('[data-type="voice-message"]');
    var result = update_network(conn.voice, container, message);
  }
  function update_network(network, container, message) {
    if (!conn || conn.radioState != 'enabled' ||
        !network || !network.connected || network.emergencyCallsOnly) {
      container.hidden = true;
      message.textContent = 'Disconnect';
    }
    else {
      container.querySelector('[data-type="network"]').textContent =
                                           network.network.shortName;
      container.querySelector('[data-type="LAC"]').textContent =
                                           network.cell.gsmCellId;
      container.querySelector('[data-type="CID"]').textContent =
                                           network.cell.gsmLocationAreaCode;
      container.querySelector('[data-type="strength"]').textContent =
                                           network.relSignalStrength;
      container.querySelector('[data-type="type"]').textContent =
                                           network.type;
      container.querySelector('[data-type="roaming"]').textContent =
                                           network.roaming;
      container.hidden = false;
      message.textContent = '';
    }
  }
}

function radioTest() {
  var iccIdIndex = [];
  var icc_num = 0;

  if (('mozIccManager' in navigator) &&
      navigator.mozIccManager &&
      ('mozMobileConnections' in navigator) &&
      navigator.mozMobileConnections.length > 0) {
    var iccManager = navigator.mozIccManager;

    // IMEI should be the same no matter which connection is used
    IMEI(navigator.mozMobileConnections[0]);

    var template = document.getElementById('connection-template');
    template.hidden = true;

    if (iccManager.iccIds.length > 0) {
      for (var i = 0; i < iccManager.iccIds.length; i++) {
        addIcc(iccManager.iccIds[i], i);
        showInfo(iccManager.iccIds[i]);
      }
    } else {
      document.getElementById('global-message').textContent =
         'SIM card not found, insert SIM and turn off airplane mode';
    }

    iccManager.addEventListener('iccdetected', function(evt) {
      document.getElementById('global-message').textContent = '';
      addIcc(evt.iccId);
      showInfo(evt.iccId);
    });
    iccManager.addEventListener('iccundetected', function(evt) {
      removeIcc(evt.iccId);
    });
  }
  else {
    alert('navigator.mozIccManager or navigator.mozMobileConnections ' +
          'not supported');
  }

  function showInfo(iccId) {
    var i = iccIdIndex[iccId];
    var connectionContainer = document.getElementById('connection#' + i);

    // show ICC#
    connectionContainer.querySelector('[data-type="SIM-number"]')
                                                       .textContent = i;

    iccInfo(navigator.mozIccManager.getIccById(iccId), connectionContainer);

    mobileConnectionInfo(navigator.mozMobileConnections[i],
                                                     connectionContainer);
  }

  function addIcc(iccId) {
    var connectionContainer = document.getElementById('connection#' + icc_num);
    if (!connectionContainer) {
      // copy connection-template then modify it.
      connectionContainer = template.cloneNode(true);
      connectionContainer.id = 'connection#' + icc_num;
      connectionContainer.hidden = false;

      document.getElementById('content').appendChild(connectionContainer);
    }

    iccIdIndex[iccId] = icc_num;
    icc_num++;
  }

  function removeIcc(iccId) {
    var i = iccIdIndex[iccId];
    if (i != null) {
      iccIdIndex[iccId] = null;
      // re-organize index
      for (var key in iccIdIndex) {
        if (iccIdIndex[key] >= i) {
          iccIdIndex[key]--;
        }
      }
      icc_num--;
    }
  }
}

window.addEventListener('load', radioTest);
