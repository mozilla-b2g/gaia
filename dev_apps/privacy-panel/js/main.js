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
        $box:     document.getElementById('RPP-box'),
        RemoteLocate: {
          $box:   document.querySelector('#RPP-box .remote-locate-box'),
          $input: document.querySelector('#RPP-box .remote-locate-box input')
        },
        RemoteRing: {
          $box:   document.querySelector('#RPP-box .remote-ring-box'),
          $input: document.querySelector('#RPP-box .remote-ring-box input')
        },
        RemoteLock: {
          $box:   document.querySelector('#RPP-box .remote-lock-box'),
          $input: document.querySelector('#RPP-box .remote-lock-box input')
        },
        RemoteWipe: {
          $box:   document.querySelector('#RPP-box .remote-wipe-box'),
          $input: document.querySelector('#RPP-box .remote-wipe-box input')
        },
        Unlock: {
          $box:   document.querySelector('#RPP-box .unlock-box'),
          $input: document.querySelector('#RPP-box .unlock-box input')
        }
      }
    };

    // add event listeners
    app.elements.RPP.$link.addEventListener('click', app.showRPPBox);
    app.elements.RPP.$back.addEventListener('click', app.showRootBox);

    app.elements.RPP.RemoteLocate.$input.addEventListener('change', app.toggleRemoteLocate);
    app.elements.RPP.RemoteRing.$input.addEventListener('change', app.toggleRemoteRing);
    app.elements.RPP.RemoteLock.$input.addEventListener('change', app.toggleRemoteLock);
    app.elements.RPP.RemoteWipe.$input.addEventListener('change', app.toggleRemoteWipe);
    app.elements.RPP.Unlock.$input.addEventListener('change', app.toggleUnlock);
  };


  // show main screen
  app.showRootBox = function() {
    app.elements.$root.style.display = 'block';
    app.elements.RPP.$box.style.display = 'none';

    app.elements.RPP.RemoteLocate.$box.style.display = 'none';
    app.elements.RPP.RemoteRing.$box.style.display = 'none';
    app.elements.RPP.RemoteLock.$box.style.display = 'none';
    app.elements.RPP.RemoteWipe.$box.style.display = 'none';
    app.elements.RPP.Unlock.$box.style.display = 'none';
  };

  // show Remote Privacy Protection screen
  app.showRPPBox = function() {
    app.elements.$root.style.display = 'none';
    app.elements.RPP.$box.style.display = 'block';

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


  app.toggleRemoteLocate = function(event) {
    app.settings.createLock().set({ 'rpp.locate.enabled': event.target.checked });
  };

  app.toggleRemoteRing = function(event) {
    app.settings.createLock().set({ 'rpp.ring.enabled': event.target.checked });
  };

  app.toggleRemoteLock = function(event) {
    app.settings.createLock().set({ 'rpp.lock.enabled': event.target.checked });
  };

  app.toggleRemoteWipe = function(event) {
    app.settings.createLock().set({ 'rpp.wipe.enabled': event.target.checked });
  };

  app.toggleUnlock = function(event) {
    app.settings.createLock().set({ 'rpp.unlock.enabled': event.target.checked });
  };


  app.init();
}());
