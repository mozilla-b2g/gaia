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
     * @param {Object} options
     * @returns {HTMLLIElement}
     */
    newListItem: function(options) {
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
      var network = options.network;
      var showNotInRange = options.showNotInRange || false;
      var onClick = options.onClick || function() {};

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
      var networkNotInRange = (network.known && level === 0);
      var hasSecurity = (keys && keys.length);

      if (hasSecurity) {
        if (showNotInRange && networkNotInRange) {
          small.setAttribute('data-l10n-id', 'notInRange');
        } else {
          navigator.mozL10n.setAttributes(small, 'securedBy',
            { capabilities: keys.join(', ') });
        }
        icon.classList.add('secured');
      } else {
        if (showNotInRange && networkNotInRange) {
          small.setAttribute('data-l10n-id', 'notInRange');
        } else {
          small.setAttribute('data-l10n-id', 'securityOpen');
        }
      }

      var a = document.createElement('a');
      a.appendChild(ssid);
      a.appendChild(small);

      // create list item
      var li = document.createElement('li');
      li.dataset.ssid = network.ssid;
      li.appendChild(icon);
      li.appendChild(a);

      // Show connection status
      icon.classList.add('wifi-signal');

      var networkStatus = WifiHelper.getNetworkStatus(network);
      var kActiveStatuses = ['associated', 'connecting', 'connected'];

      if (-1 !== kActiveStatuses.indexOf(networkStatus)) {
        li.classList.add('active');

        if ('connected' === networkStatus) {
          icon.classList.add('connected');
        } else {
          icon.classList.add('connecting');
        }

        small.setAttribute('data-l10n-id', 'shortStatus-' + networkStatus);
      }

      // bind connection callback
      li.onclick = function() {
        onClick(network);
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
      var ssid = panel.querySelector('input[name=ssid]');
      var identity = panel.querySelector('input[name=identity]');
      var password = panel.querySelector('input[name=password]');
      var showPassword = panel.querySelector('gaia-checkbox[name=show-pwd]');
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
        var isSSIDInvalid = function() {
          if (ssid) {
            return (ssid.value.length === 0);
          } else {
            return false;
          }
        };

        submitButton.disabled =
          !WifiHelper.isValidInput(key, password.value, identity.value,
            eap.value) || isSSIDInvalid();
      };

      eap.onchange = function() {
        checkPassword();
        WifiUtils.changeDisplay(panel, key);
      };

      if (ssid) {
        ssid.oninput = checkPassword;
      }

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
        var originLengthOfOptions = select.options.length;
        for (i = 0; i < originLengthOfOptions - 1; i++) {
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
    },

    /**
     * Updates the icon of the given network
     *
     * @memberOf WifiUtils
     * @param {Object} network
     * @param {Integer} networkSignal
     */
    updateNetworkSignal: function(network, networkSignal) {
      var li = document.querySelector('li[data-ssid="' + network.ssid + '"]');
      var icon = li.querySelector('aside');
      // Clean previous state
      icon.className = icon.className.replace(/level-\w*/, '');
      var level = Math.min(Math.floor(networkSignal / 20), 4);
      icon.classList.add('level-' + level);
    },

    /**
     * Get concated networkKey which can be used as identifier
     *
     * @memberOf WifiUtils
     * @param {Object} network
     * @return {String} concated network identifier
     */
    getNetworkKey: function(network) {
      if (!network) {
        return '';
      } else {
        var key =
          network.ssid + '+' + WifiHelper.getSecurity(network).join('+');
        return key;
      }
    },

    /**
     * Reflect incoming network status on related listItem (show different UI)
     *
     * @memberOf WifiUtils
     * @param {Object} options
     * @param {Object} options.listItems - listItems with DOM elements
     * @param {Object} options.activeItemDOM - DOM element for active item
     * @param {Object} options.network - network object
     * @param {Object} options.networkStatus - current status for network
     */
    updateListItemStatus: function(options) {
      options = options || {};
      var listItems = options.listItems;
      var activeItemDOM = options.activeItemDOM;
      var network = options.network;
      var networkStatus = options.networkStatus;

      if (!network || !networkStatus || !listItems) {
        console.log('Please check passing options for updateListItemStatus');
        return;
      }

      var key = this.getNetworkKey(network);
      var listItemDOM = listItems[key];

      if (activeItemDOM && activeItemDOM != listItemDOM) {
        activeItemDOM.classList.remove('active');
        activeItemDOM.querySelector('small').
          setAttribute('data-l10n-id', 'shortStatus-disconnected');
        activeItemDOM.querySelector('aside').classList.remove('connecting');
        activeItemDOM.querySelector('aside').classList.remove('connected');
      }

      if (listItemDOM) {
        listItemDOM.classList.add('active');
        listItemDOM.querySelector('small').
          setAttribute('data-l10n-id', 'shortStatus-' + networkStatus);
        if (networkStatus === 'connecting' || networkStatus === 'associated') {
          listItemDOM.querySelector('aside').classList.remove('connected');
          listItemDOM.querySelector('aside').classList.add('connecting');
        } else if (networkStatus === 'connected') {
          listItemDOM.querySelector('aside').classList.remove('connecting');
          listItemDOM.querySelector('aside').classList.add('connected');
        }
      }
    }
  };

  return WifiUtils;
});
