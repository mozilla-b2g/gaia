/* global Crypto */

var app = app || {};

(function() {
  'use strict';

  app.init = function() {

    app.settings = window.navigator.mozSettings;
    if (!app.settings) {
      return;
    }

    app.elements = {
      $root:      document.getElementById('root'),
      RPP: {
        $link:    document.getElementById('menuItem-RPP'),
        $back:    document.getElementById('RPP-back'),
        $box:     document.getElementById('RPP'),
        $menu:    document.getElementById('RPP-menu'),
        $newPass: document.getElementById('RPP-new-password'),
        $login:   document.getElementById('RPP-login'),
        RemoteLocate: {
          $box:   document.querySelector('#RPP .remote-locate'),
          $input: document.querySelector('#RPP .remote-locate input')
        },
        RemoteRing: {
          $box:   document.querySelector('#RPP .remote-ring'),
          $input: document.querySelector('#RPP .remote-ring input')
        },
        RemoteLock: {
          $box:   document.querySelector('#RPP .remote-lock'),
          $input: document.querySelector('#RPP .remote-lock input')
        },
        RemoteWipe: {
          $box:   document.querySelector('#RPP .remote-wipe'),
          $input: document.querySelector('#RPP .remote-wipe input')
        },
        Unlock: {
          $box:   document.querySelector('#RPP .unlock'),
          $input: document.querySelector('#RPP .unlock input')
        }
      }
    };

    // add event listeners
    app.elements.RPP.$link.addEventListener('click', app.showRPPBox);
    app.elements.RPP.$back.addEventListener('click', app.showRootBox);

    app.elements.RPP.$newPass.querySelector('button.rpp-new-password-ok').addEventListener('click', app.savePassword);
    app.elements.RPP.$login.querySelector('button.rpp-login-ok').addEventListener('click', app.login);

    app.elements.RPP.RemoteLocate.$input.addEventListener('change', app.toggleRemoteLocate);
    app.elements.RPP.RemoteRing.$input.addEventListener('change', app.toggleRemoteRing);
    app.elements.RPP.RemoteLock.$input.addEventListener('change', app.toggleRemoteLock);
    app.elements.RPP.RemoteWipe.$input.addEventListener('change', app.toggleRemoteWipe);
    app.elements.RPP.Unlock.$input.addEventListener('change', app.toggleUnlock);
  };


  /**
   * Show main Privacy Panel screen
   */
  app.showRootBox = function() {
    app.elements.$root.style.display = 'block';
    app.elements.RPP.$box.style.display = 'none';

    app.elements.RPP.RemoteLocate.$box.style.display = 'none';
    app.elements.RPP.RemoteRing.$box.style.display = 'none';
    app.elements.RPP.RemoteLock.$box.style.display = 'none';
    app.elements.RPP.RemoteWipe.$box.style.display = 'none';
    app.elements.RPP.Unlock.$box.style.display = 'none';
  };

  /**
   * Show RPP screen
   */
  app.showRPPBox = function() {
    app.elements.$root.style.display = 'none';
    app.elements.RPP.$box.style.display = 'block';

    // Get current pass phrase and display proper screen
    var status = app.settings.createLock().get('rpp.password');
    status.onsuccess = function() {
      var password = status.result['rpp.password'];

      app.elements.RPP.$menu.style.display = 'none';
      app.elements.RPP.$newPass.style.display = (!password) ? 'block' : 'none';
      app.elements.RPP.$login.style.display = (password) ? 'block' : 'none';
    };
  };

  /**
   * Show RPP menu
   */
  app.showRPPMenu = function() {
    app.elements.RPP.$menu.style.display = 'block';
    app.elements.RPP.$newPass.style.display = 'none';
    app.elements.RPP.$login.style.display = 'none';


    // get Remote Locate value from settings
    var status1 = app.settings.createLock().get('rpp.locate.enabled');
    status1.onsuccess = function() {
      app.elements.RPP.RemoteLocate.$input.checked = (status1.result['rpp.locate.enabled'] === true);
      app.elements.RPP.RemoteLocate.$box.style.display = 'block';
    };

    // get Remote Ring value from settings
    var status2 = app.settings.createLock().get('rpp.ring.enabled');
    status2.onsuccess = function() {
      app.elements.RPP.RemoteRing.$input.checked = (status2.result['rpp.ring.enabled'] === true);
      app.elements.RPP.RemoteRing.$box.style.display = 'block';
    };

    // get Remote Lock value from settings
    var status3 = app.settings.createLock().get('rpp.lock.enabled');
    status3.onsuccess = function() {
      app.elements.RPP.RemoteLock.$input.checked = (status3.result['rpp.lock.enabled'] === true);
      app.elements.RPP.RemoteLock.$box.style.display = 'block';
    };

    // get Remote Wipe value from settings
    var status4 = app.settings.createLock().get('rpp.wipe.enabled');
    status4.onsuccess = function() {
      app.elements.RPP.RemoteWipe.$input.checked = (status4.result['rpp.wipe.enabled'] === true);
      app.elements.RPP.RemoteWipe.$box.style.display = 'block';
    };

    // get Unlock value from settings
    var status5 = app.settings.createLock().get('rpp.unlock.enabled');
    status5.onsuccess = function() {
      app.elements.RPP.Unlock.$input.checked = (status5.result['rpp.unlock.enabled'] === true);
      app.elements.RPP.Unlock.$box.style.display = 'block';
    };
  };


  /**
   * Save new password
   */
  app.savePassword = function() {
    var pass1 = app.elements.RPP.$newPass.querySelector('#rpp-new-pass1').value,
        pass2 = app.elements.RPP.$newPass.querySelector('#rpp-new-pass2').value,
        passHash = Crypto.MD5(pass1).toString(),
        $validationMessage = app.elements.RPP.$newPass.querySelector('.validation-message');

    /** @todo: full password validation */
    if (pass1 !== pass2) {
      // passwords are valid
      $validationMessage.textContent = 'Confirmation must match pass phrase!';
      $validationMessage.style.display = 'block';
    } else {
      // clear validation message
      $validationMessage.textContent = '';
      $validationMessage.style.display = 'none';

      // saving password
      app.settings.createLock().set({ 'rpp.password': passHash });
      app.showRPPMenu();
    }
  };


  /**
   * Login to RPP
   */
  app.login = function() {
    var pass = app.elements.RPP.$login.querySelector('#rpp-login-pass').value,
        passHash = Crypto.MD5(pass).toString(),
        $validationMessage = app.elements.RPP.$login.querySelector('.validation-message'),
        password;

    var status = app.settings.createLock().get('rpp.password');
    status.onsuccess = function() {
      password = status.result['rpp.password'];

      if (password === passHash) {
        // clear validation message
        $validationMessage.textContent = '';
        $validationMessage.style.display = 'none';

        // clear password input
        app.elements.RPP.$login.querySelector('#rpp-login-pass').value = '';

        // show RPP menu
        app.showRPPMenu();
      } else {
        // passwords are valid
        $validationMessage.textContent = 'Pass phrase is wrong!';
        $validationMessage.style.display = 'block';
      }
    };
  };


  /**
   * Save Remote Locate value
   * @param event
   */
  app.toggleRemoteLocate = function(event) {
    app.settings.createLock().set({ 'rpp.locate.enabled': event.target.checked });
  };

  /**
   * Save Remote Ring value
   * @param event
   */
  app.toggleRemoteRing = function(event) {
    app.settings.createLock().set({ 'rpp.ring.enabled': event.target.checked });
  };

  /**
   * Save Remote Lock value
   * @param event
   */
  app.toggleRemoteLock = function(event) {
    app.settings.createLock().set({ 'rpp.lock.enabled': event.target.checked });
  };

  /**
   * Save Remote Wipe value
   * @param event
   */
  app.toggleRemoteWipe = function(event) {
    app.settings.createLock().set({ 'rpp.wipe.enabled': event.target.checked });
  };

  /**
   * Save Unlock via... value
   * @param event
   */
  app.toggleUnlock = function(event) {
    app.settings.createLock().set({ 'rpp.unlock.enabled': event.target.checked });
  };


  app.init();
}());
