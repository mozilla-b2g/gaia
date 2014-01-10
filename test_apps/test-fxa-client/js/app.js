'use strict';

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
      changePasswordButton, resultTextEl, resultEl, timer;

  var init = function init() {
    resultEl = document.getElementById('result');
    resultTextEl = document.getElementById('result-text');
    getFxAccountsButton = document.getElementById('getAccounts');
    launchFxAFlowButton = document.getElementById('openFlow');
    logoutButton = document.getElementById('logout');
    changePasswordButton = document.getElementById('changePassword');

    getFxAccountsButton.addEventListener('click', handler);
    launchFxAFlowButton.addEventListener('click', handler);
    logoutButton.addEventListener('click', handler);
    changePasswordButton.addEventListener('click', handler);

  };

  

  function _setResponse(response, errorDebug) {
    resultTextEl.innerHTML = '';

    var text = document.createTextNode((errorDebug)? 'Error ' : 'Success :');
    resultTextEl.appendChild(text);
    var resposeBeautyfied =
      document.createTextNode(JSON.stringify(response || 'No params', null, 4));
    resultTextEl.appendChild(resposeBeautyfied);
    
    clearTimeout(timer);
    resultEl.classList.add('show');
    timer = setTimeout(function() {
      resultEl.classList.remove('show');
    }, 3000);
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
      case 'changePassword':
        FxAccountsIACHelper[method]('dummy@domain.org', showResponse,
                                    showError);
        break;
    }

    
  };

  return {
    'init': init
  };

}();

TestFxAClient.init();
