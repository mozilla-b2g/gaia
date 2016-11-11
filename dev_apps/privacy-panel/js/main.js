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
      ALA: {
        $link:      document.getElementById('menuItem-ALA'),
        $back:      document.getElementById('ALA-back'),
        $box:       document.getElementById('ALA'),
        geo: {
          $switch:  document.getElementById('geolocation-switch'),
          $box:     document.getElementById('geolocation-box')
        },
        blur: {
          $switch:  document.getElementById('blur-switch'),
          $elements:document.getElementById('geolocation-box').querySelectorAll('.blur-box')
        }
      },
      RPP: {
        $link:      document.getElementById('menuItem-RPP'),
        $back:      document.getElementById('RPP-back'),
        $box:       document.getElementById('RPP'),
        $menu:      document.getElementById('RPP-menu'),
        $newPass:   document.getElementById('RPP-new-password'),
        $login:     document.getElementById('RPP-login'),
        RemoteLocate: {
          $box:     document.querySelector('#RPP .remote-locate'),
          $input:   document.querySelector('#RPP .remote-locate input')
        },
        RemoteRing: {
          $box:     document.querySelector('#RPP .remote-ring'),
          $input:   document.querySelector('#RPP .remote-ring input')
        },
        RemoteLock: {
          $box:     document.querySelector('#RPP .remote-lock'),
          $input:   document.querySelector('#RPP .remote-lock input')
        },
        RemoteWipe: {
          $box:     document.querySelector('#RPP .remote-wipe'),
          $input:   document.querySelector('#RPP .remote-wipe input')
        },
        Unlock: {
          $box:     document.querySelector('#RPP .unlock'),
          $input:   document.querySelector('#RPP .unlock input')
        }
      }
    };

    // add event listeners for ALA
    app.elements.ALA.$link.addEventListener('click', app.showALABox);
    app.elements.ALA.$back.addEventListener('click', app.showRootBox);

    app.elements.ALA.geo.$switch.addEventListener('click', function(event) { app.toggleGeolocation(event.target.checked); });
    app.elements.ALA.blur.$switch.addEventListener('click', function(event) { app.toggleBlur(event.target.checked); });

    // add event listeners for RPP
    app.elements.RPP.$link.addEventListener('click', app.showRPPBox);
    app.elements.RPP.$back.addEventListener('click', app.showRootBox);

    app.elements.RPP.$newPass.querySelector('button.rpp-new-password-ok').addEventListener('click', app.savePassword);
    app.elements.RPP.$login.querySelector('button.rpp-login-ok').addEventListener('click', app.login);

    app.elements.RPP.RemoteLocate.$input.addEventListener('change', function(event) { app.toggleRemoteLocate(event.target.checked); });
    app.elements.RPP.RemoteRing.$input.addEventListener('change', function(event) { app.toggleRemoteRing(event.target.checked); });
    app.elements.RPP.RemoteLock.$input.addEventListener('change', function(event) { app.toggleRemoteLock(event.target.checked); });
    app.elements.RPP.RemoteWipe.$input.addEventListener('change', function(event) { app.toggleRemoteWipe(event.target.checked); });
    app.elements.RPP.Unlock.$input.addEventListener('change', function(event) { app.toggleUnlock(event.target.checked); });
  };


  /**
   * Show main Privacy Panel screen.
   */
  app.showRootBox = function() {
    // show main panel
    app.elements.$root.style.display = 'block';

    // hide ALA panel
    app.elements.ALA.$box.style.display = 'none';

    // hide RPP panel
    app.elements.RPP.$box.style.display = 'none';
    app.elements.RPP.RemoteLocate.$box.style.display = 'none';
    app.elements.RPP.RemoteRing.$box.style.display = 'none';
    app.elements.RPP.RemoteLock.$box.style.display = 'none';
    app.elements.RPP.RemoteWipe.$box.style.display = 'none';
    app.elements.RPP.Unlock.$box.style.display = 'none';
  };

  /**** ALA part **************************************************************/
  /**
   * Show ALA screen.
   */
  app.showALABox = function() {
    app.elements.$root.style.display = 'none';
    app.elements.ALA.$box.style.display = 'block';
    app.elements.ALA.geo.$box.style.display = 'none';

    // check if geolocation is enabled
    var status1 = app.settings.createLock().get('ala.geolocation.enabled');
    status1.onsuccess = function() {
      var showGeolocation = status1.result['ala.geolocation.enabled'];

      // show Geolocation box if enabled
      app.elements.ALA.geo.$box.style.display = (showGeolocation) ? 'block' : 'none';

      // set switch position
      app.elements.ALA.geo.$switch.checked = showGeolocation;
    };

    // check if blur is enabled
    var status2 = app.settings.createLock().get('ala.blur.enabled');
    status2.onsuccess = function() {
      var showBlur = status2.result['ala.blur.enabled'];

      // show Geolocation box if enabled
      var style = (showBlur) ? 'block' : 'none';
      for (var $el of app.elements.ALA.blur.$elements) {
        $el.style.display = style;
      }

      // set switch position
      app.elements.ALA.blur.$switch.checked = showBlur;
    };


  };

  /**
   * Toggle Geolocation box.set
   * @param {Boolean} value
   */
  app.toggleGeolocation = function(value) {
    // toggle geolocation box
    app.elements.ALA.geo.$box.style.display = (value) ? 'block' : 'none';

    // save current value to settins
    app.settings.createLock().set({ 'ala.geolocation.enabled': value });
  };


  /**
   * Toggle Blur box.
   * @param {Boolean} value
   */
  app.toggleBlur = function(value) {
    var style = (value) ? 'block' : 'none';

    for (var $el of app.elements.ALA.blur.$elements) {
      $el.style.display = style;
    }

    app.settings.createLock().set({ 'ala.blur.enabled': value });
  };


  /**** RPP part **************************************************************/
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
   * @param {Boolean} value
   */
  app.toggleRemoteLocate = function(value) {
    app.settings.createLock().set({ 'rpp.locate.enabled': value });
  };

  /**
   * Save Remote Ring value
   * @param {Boolean} value
   */
  app.toggleRemoteRing = function(value) {
    app.settings.createLock().set({ 'rpp.ring.enabled': value });
  };

  /**
   * Save Remote Lock value
   * @param {Boolean} value
   */
  app.toggleRemoteLock = function(value) {
    app.settings.createLock().set({ 'rpp.lock.enabled': value });
  };

  /**
   * Save Remote Wipe value
   * @param {Boolean} value
   */
  app.toggleRemoteWipe = function(value) {
    app.settings.createLock().set({ 'rpp.wipe.enabled': value });
  };

  /**
   * Save Unlock via... value
   * @param {Boolean} value
   */
  app.toggleUnlock = function(value) {
    app.settings.createLock().set({ 'rpp.unlock.enabled': value });
  };


  app.init();
}());
