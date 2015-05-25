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
      if (WifiHelper.isConnected(network)) {
        small.setAttribute('data-l10n-id', 'shortStatus-connected');
        icon.classList.add('connected');
        li.classList.add('active');
      }

      // bind connection callback
      li.onclick = function() {
        onClick(network);
      };
      return li;
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
      var showPassword = panel.querySelector('input[name=show-pwd]');
      var eap = panel.querySelector('li.eap select');
      var security = panel.querySelector('li.security select');
      var authPhase2 = panel.querySelector('li.auth-phase2 select');
      var userCertificate = panel.querySelector('li.user-certificate select');
      var serverCertificate =
        panel.querySelector('li.server-certificate select');
      var submitButton = panel.querySelector('button[type=submit]');

      // load needed certificates first
      this.loadImportedCertificateOptions(serverCertificate);

      // TODO
      // change this to real user certificate API
      this.loadImportedCertificateOptions(userCertificate);

      identity.value = network.identity || '';

      password.type = 'password';
      password.value = network.password || '';

      showPassword.checked = false;
      showPassword.onchange = function() {
        password.type = this.checked ? 'text' : 'password';
      };

      var checkPassword = () => {
        var isSSIDInvalid = () => {
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

      var updateAuthphase2Options = (function() {
        var mapping = {
          'PEAP': [
            { text: 'No', value: 'No' },
            { text: 'MSCHAPV2', value: 'MSCHAP V2' },
            { text: 'GTC', value: 'GTC' }
          ],
          'TTLS': [
            { text: 'No', value: 'No' },
            { text: 'PAP', value: 'PAP' },
            { text: 'MSCHAP', value: 'MSCHAP' },
            { text: 'MSCHAP V2', value: 'MSCHAPV2' },
            { text: 'GTC', value: 'GTC' }
          ]
        };

        return (eap) =>  {
          var itsMapping = mapping[eap];
          if (authPhase2 && itsMapping) {
            // cleanup all options before
            authPhase2.innerHTML = '';
            itsMapping.forEach((rawData) => {
              var option = document.createElement('option');
              option.value = rawData.value;
              option.text = rawData.text;
              authPhase2.add(option);
            });
          }
        };
      }());

      if (security) {
        security.onchange = function() {
          key = security.value;
          panel.dataset.security = key;
          eap.onchange();
        };
      }

      eap.onchange = function() {
        var eapMethod = eap.value;
        panel.dataset.eap = eapMethod;
        checkPassword();
        updateAuthphase2Options(eapMethod);
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
        if (networkStatus === 'connecting') {
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
