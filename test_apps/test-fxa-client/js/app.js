'use strict';

var Overlay = {
    show: function fxam_overlay_show() {
      var overlay = document.querySelector('#overlay');
      overlay.classList.add('show');
    },
    hide: function fxam_overlay_hide() {
      var overlay = document.querySelector('#overlay');
      if (!overlay)
        return;

      overlay.classList.remove('show');
    }
};

var TestFxAClient = function TestFxAClient() {

  var getFxAccountsButton, launchFxAFlowButton, logoutButton,
      changePasswordButton, resultTextEl, resultEl, timer,
      eventsEl, eventsTextEl, eventsTimer;

  var init = function init() {
    resultEl = document.getElementById('result');
    resultTextEl = document.getElementById('result-text');
    getFxAccountsButton = document.getElementById('getAccounts');
    launchFxAFlowButton = document.getElementById('openFlow');
    logoutButton = document.getElementById('logout');
    eventsEl = document.getElementById('events');
    eventsTextEl = document.getElementById('events-text');

    getFxAccountsButton.addEventListener('click', handler);
    launchFxAFlowButton.addEventListener('click', handler);
    logoutButton.addEventListener('click', handler);

    FxAccountsIACHelper.addEventListener('onlogin', function() {
      showEvent('onlogin');
    });

    FxAccountsIACHelper.addEventListener('onlogout', function() {
      showEvent('onlogout');
    });

    FxAccountsIACHelper.addEventListener('onverifiedlogin', function() {
      showEvent('onverifiedlogin');
    });
  };

  function _setResponse(response, errorDebug) {
    resultTextEl.innerHTML = '';

    var text = document.createTextNode((errorDebug)? 'Error ' : 'Success :');
    resultTextEl.appendChild(text);
    var responseBeautyfied =
      document.createTextNode(JSON.stringify(response || 'No params', null, 4));
    resultTextEl.appendChild(responseBeautyfied);

    clearTimeout(timer);
    resultEl.classList.add('show');
    timer = setTimeout(function() {
      resultEl.classList.remove('show');
    }, 3000);
  }

  function showEvent(eventName) {
    eventsTextEl.innerHTML = '';

    var text = document.createTextNode('Event received: ' + eventName);
    eventsTextEl.appendChild(text);

    clearTimeout(timer);
    eventsEl.classList.add('show');
    eventsTimer = setTimeout(function() {
      eventsEl.classList.remove('show');
    }, 5000);
  }

  var showResponse = function showResponse(response) {
    Overlay.hide();
    _setResponse(response)
  };

  var showError = function showResponse(response) {
    Overlay.hide();
    _setResponse(response, true)
  };

  var handler = function handler(evt) {
    var method = evt.target.id;
    switch (method) {
      case 'openFlow':
        FxAccountsIACHelper[method](showResponse, showError);
        break;
      case 'getAccounts':
      case 'logout':
        Overlay.show();
        FxAccountsIACHelper[method](showResponse, showError);
        break;
    }


  };

  return {
    'init': init
  };

}();

TestFxAClient.init();
