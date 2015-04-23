/**
 * WifiUtils is a utils-box that keeps wifi-operations needed utils.
 *
 * @module WifiUtils
 */
define(function(require) {
  'use strict';

  var WifiHelper = require('shared/wifi_helper');
  var wifiManager = WifiHelper.getWifiManager();

  var WifiUtils = {
    /**
     * Create an explanatory list item
     *
     * @memberOf WifiUtils
     * @param {String} message
     * @returns {HTMLLIElement}
     */
    newExplanationItem: function(message) {
      var li = document.createElement('li');
      li.className = 'explanation';
      li.setAttribute('data-l10n-id', message);
      return li;
    },

    /**
     * Create a network list item
     *
     * @memberOf WifiUtils
     * @param {Object} network
     * @param {Function} callback
     * @returns {HTMLLIElement}
     */
    newListItem: function(network, callback) {
      /**
       * A Wi-Fi list item has the following HTML structure:
       *   <li>
       *     <aside class="pack-end wifi-icon level-[?] [secured]"></aside>
       *     <a>
       *       <span> Network SSID </span>
       *       <small> Network Security </small>
       *     </a>
       *   </li>
       */

      // icon
      var icon = document.createElement('aside');
      icon.classList.add('pack-end');
      icon.classList.add('wifi-icon');
      var level = Math.min(Math.floor(network.relSignalStrength / 20), 4);
      icon.classList.add('level-' + level);

      // ssid
      var ssid = document.createElement('span');
      ssid.textContent = network.ssid;

      // supported authentication methods
      var small = document.createElement('small');
      var keys = WifiHelper.getSecurity(network);
      if (keys && keys.length) {
        navigator.mozL10n.setAttributes(small,
                                        'securedBy',
                                        { capabilities: keys.join(', ') });
        icon.classList.add('secured');
      } else {
        small.setAttribute('data-l10n-id', 'securityOpen');
      }

      var a = document.createElement('a');
      a.appendChild(ssid);
      a.appendChild(small);

      // create list item
      var li = document.createElement('li');
      li.appendChild(icon);
      li.appendChild(a);

      // Show connection status
      icon.classList.add('wifi-signal');
      if (WifiHelper.isConnected(network)) {
        var conStatus = WifiHelper.getConnectionStatus(network);
        if (conStatus === 'connected') {
          small.setAttribute('data-l10n-id', 'shortStatus-connected');
          icon.classList.add('connected');
          li.classList.add('active');
        } else if (conStatus === 'connecting') {
          small.setAttribute('data-l10n-id', 'shortStatus-connecting');
        } else if (conStatus === 'associated') {
          small.setAttribute('data-l10n-id', 'shortStatus-associated');
        } else if (conStatus === 'connectingfailed') {
          small.setAttribute('data-l10n-id', 'shortStatus-connectingfailed');
        } else if (conStatus === 'disconnected') {
          small.setAttribute('data-l10n-id', 'shortStatus-disconnected');
        }
      }

      // bind connection callback
      li.onclick = function() {
        callback(network);
      };
      return li;
    },

    /**
     * Change dialog layout based on dialogId and security
     *
     * @memberOf WifiUtils
     * @param {HTMLElement} panel
     * @param {String} security
     */
    changeDisplay: function(panel, security) {
      var eap = panel.querySelector('li.eap select');
      var identity = panel.querySelector('input[name=identity]');
      var password = panel.querySelector('input[name=password]');
      var authPhase2 = panel.querySelector('li.auth-phase2 select');
      var certificate = panel.querySelector('li.server-certificate select');
      var description =
        panel.querySelector('li.server-certificate-description');

      if (security === 'WEP' || security === 'WPA-PSK') {
        identity.parentNode.style.display = 'none';
        password.parentNode.style.display = 'block';
        authPhase2.parentNode.parentNode.style.display = 'none';
        certificate.parentNode.parentNode.style.display = 'none';
        description.style.display = 'none';
      } else if (security === 'WPA-EAP') {
        if (eap) {
          switch (eap.value) {
            case 'SIM':
              identity.parentNode.style.display = 'none';
              password.parentNode.style.display = 'none';
              authPhase2.parentNode.parentNode.style.display = 'none';
              certificate.parentNode.parentNode.style.display = 'none';
              description.style.display = 'none';
              break;
            case 'PEAP':
            case 'TLS':
            case 'TTLS':
              identity.parentNode.style.display = 'block';
              password.parentNode.style.display = 'block';
              authPhase2.parentNode.parentNode.style.display = 'block';
              certificate.parentNode.parentNode.style.display = 'block';
              description.style.display = 'block';
              break;
            default:
              break;
          }
        }
      } else {
        identity.parentNode.style.display = 'none';
        password.parentNode.style.display = 'none';
      }
    },

    /**
     * This is used to help us do some initialization works if the panel
     * is auth related.
     *
     * @memberOf WifiUtils
     * @param {String} panel
     * @param {Object} network
     */
    initializeAuthFields: function(panel, network) {
      var key = WifiHelper.getKeyManagement(network);
      var identity = panel.querySelector('input[name=identity]');
      var password = panel.querySelector('input[name=password]');
      var showPassword = panel.querySelector('input[name=show-pwd]');
      var eap = panel.querySelector('li.eap select');
      var certificate = panel.querySelector('li.server-certificate select');
      var submitButton = panel.querySelector('button[type=submit]');

      // load needed certificates first
      this.loadImportedCertificateOptions(certificate);

      identity.value = network.identity || '';

      password.type = 'password';
      password.value = network.password || '';

      showPassword.checked = false;
      showPassword.onchange = function() {
        password.type = this.checked ? 'text' : 'password';
      };

      var checkPassword = function() {
        submitButton.disabled =
          !WifiHelper.isValidInput(key, password.value, identity.value,
            eap.value);
      };

      eap.onchange = function() {
        checkPassword();
        WifiUtils.changeDisplay(panel, key);
      };

      password.oninput = checkPassword;
      identity.oninput = checkPassword;
      checkPassword();
    },
    
    /**
     * This is an inner function that used to inject certificates options
     * into select element.
     *
     * @memberOf WifiUtils
     * @param {HTMLSelectElement} select
     */
    loadImportedCertificateOptions: function(select) {
      if (!wifiManager.getImportedCerts) {
        return;
      }

      var certRequest = wifiManager.getImportedCerts();

      certRequest.onsuccess = function() {
        var i;
        var certList = certRequest.result;
        // save the imported server certificates
        var certificateList = certList.ServerCert;

        // reset the option to be <option value="none">--</option> only
        for (i = 0; i < select.options.length - 1; i++) {
          select.remove(1);
        }

        for (i = 0; i < certificateList.length; i++) {
          var option = document.createElement('option');
          option.text = certificateList[i];
          option.value = certificateList[i];
          select.add(option, null);
        }
      };

      certRequest.onerror = function() {
        console.warn('getImportedCerts failed');
      };
    }
  };

  return WifiUtils;
});
