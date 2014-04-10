var AppManager = (function() {
  'use strict';

  var appManager, appIconEl, appIcon;
  var isInitialized = false;

  var buttons = {
    deleteApp        : null,
    sendApp          : null,
    menuCancel       : null,
    close            : null,

    shareByBluetooth : null,
    shareByEmail     : null,
    menuBack         : null,
    back             : null
  };

  // Event listeners for buttons

  function addButtonOnClickListeners(){
    buttons.sendApp.onclick = showDeleteConfirmation;
    buttons.sendApp.onclick = showSendMenu;
    buttons.menuCancel.onclick = buttons.close.onclick = AppManager.hide;

    buttons.shareByBluetooth.onclick = openBluetoothSendMenu;
    buttons.menuBack.onclick = buttons.back.onclick = backToRootMenu;
  }

  function removeButtonOnClickListeners(){
    Object.keys(buttons).forEach(function(key) {
      buttons[key].onclick = null;
    });
  }

  // Actions for buttons

  function showDeleteConfirmation(){
    // =pen the bluetooth app share view
  }

  function showSendMenu(){
    appManager.classList.add('app-manager--menu-level-1');
  }

  function openBluetoothSendMenu(){
    // open the bluetooth sharing view
  }

  function sendByEmail(){
    // Open new email with the app as an attachment
  }

  function backToRootMenu(){
    appManager.classList.remove('app-manager--menu-level-1');
  }

  // Fetch and insert icon for the app
  function addAppIconToUI(icon){
    IconRetriever.get({
      icon: icon,
      success: function(blob) {
        appIcon.innerHTML = "";
        image = new Image();
        image.src = window.URL.createObjectURL(blob);
        appIconEl.appendChild(image);
        window.asyncStorage.setItem('sendingIcon', image.src);
      },
      error: function(){
        return false;
      }
    });
  }

  // Initializements of the App Manager
  var initialize = function() {
    isInitialized = true;

    appManager = document.getElementById('app-manager');
    appIconEl = document.getElementById('app-manager__app-icon');

    buttons.deleteApp = document.getElementById('app-manager__button--delete');
    buttons.sendApp = document.getElementById('app-manager__button--send');
    buttons.menuCancel = document.getElementById('app-manager__button--cancel');
    buttons.close = document.getElementById('app-manager__sheet__header__button--close');

    buttons.shareByBluetooth = document.getElementById('app-manager__button--bluetooth');
    buttons.shareByEmail = document.getElementById('app-manager__button--email');
    buttons.menuBack = document.getElementById('app-manager__button--back');
    buttons.back = document.getElementById('app-manager__sheet__header__button--back');
  }

  // Showing of the App Manager
  var show = function(icon) {
    if(!isInitialized) initialize();

    appIcon = icon;
    addAppIconToUI(icon);

    appManager.classList.add('visible');
    setTimeout(function animate() {
      appManager.addEventListener('transitionend', function transitionend() {
        appManager.removeEventListener('transitionend', transitionend);
        addButtonOnClickListeners();
      });
      appManager.classList.add('show');
    }, 50); // Give the opportunity to paint the UI component
  };

  // Hiding of the App Manager
  var hide = function() {
    removeButtonOnClickListeners();

    var classList = appManager.classList;
    if (classList.contains('show')) {
      appManager.addEventListener('transitionend', function transitionend() {
        appManager.removeEventListener('transitionend', transitionend);
        classList.remove('visible');
      });
      classList.remove('show');
    }

    var evt = new CustomEvent('app-manager', {
      'detail': {
        'action': 'cancel',
        'app': appIcon.app
      }
    });
    window.dispatchEvent(evt);
  };

  return {
    init: initialize,
    show: show,
    hide: hide
  };

})();
