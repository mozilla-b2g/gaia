/* global AppList */
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
      context: 'ROOT',
      $root:          document.getElementById('root'),
      $rootBackBtn:   document.getElementById('back'),
      ALA: {
        $link:        document.getElementById('menuItem-ALA'),
        $back:        document.getElementById('ALA-back'),
        $backapp:     document.getElementById('ALA-app-back'),
        $box:         document.getElementById('ALA'),
        $app:         document.getElementById('application-info'),
        geo: {
          $switchBox: document.getElementById('geolocation-switch-box'),
          $switch:    document.getElementById('geolocation-switch'),
          $box:       document.getElementById('geolocation-box'),
          $main:      document.getElementById('main-panel')
        },
        settings: {
          $switchBox: document.getElementById('settings-switch-box'),
          $switch:    document.getElementById('settings-switch')
        },
        type: {
          $select:    document.getElementById('ALA-type'),
          $elements:  document.querySelectorAll('.type-box'),
          $blurBox:   document.getElementById('type-blur'),
          $blurSlider:document.getElementById('blur-slider'),
          $blurLabel: document.getElementById('blur-label'),
          $customBox: document.getElementById('type-custom-location')
        },
        exception: {
          $box:       document.getElementById('add-exception-box'),
          $link:      document.getElementById('add-exception'),
          $main:      document.getElementById('exceptions')
        }
      },
      Exceptions: {
        $box:         document.getElementById('excepions-panel'),
        $back:        document.getElementById('exceptions-back'),
        $appBox:      document.getElementById('app-list')
      },
      RPP: {
        $link:        document.getElementById('menuItem-RPP'),
        $back:        document.getElementById('RPP-back'),
        $box:         document.getElementById('RPP'),
        $menu:        document.getElementById('RPP-menu'),
        $newPass:     document.getElementById('RPP-new-password'),
        $login:       document.getElementById('RPP-login'),
        RemoteLocate: {
          $box:       document.querySelector('#RPP .remote-locate'),
          $input:     document.querySelector('#RPP .remote-locate input')
        },
        RemoteRing: {
          $box:       document.querySelector('#RPP .remote-ring'),
          $input:     document.querySelector('#RPP .remote-ring input')
        },
        RemoteLock: {
          $box:       document.querySelector('#RPP .remote-lock'),
          $input:     document.querySelector('#RPP .remote-lock input')
        },
        RemoteWipe: {
          $box:       document.querySelector('#RPP .remote-wipe'),
          $input:     document.querySelector('#RPP .remote-wipe input')
        },
        Unlock: {
          $box:       document.querySelector('#RPP .unlock'),
          $input:     document.querySelector('#RPP .unlock input')
        }
      },
      DCL: new CustomLocationPanel()
    };

    // Observe 'privacy-panel.launched-by-settings' setting to be able to
    // detect launching point.
    app.settings.addObserver('pp.launched.by.settings', function(evt) {
      app.toggleRootBackBtn(evt.settingValue);
    });

    // Get the launch flag whe app starts.
    app.getLaunchFlag(function(result) {
      app.toggleRootBackBtn(result);
    });

    // Get the flag every time app is activated.
    window.addEventListener('focus', function() {
      app.getLaunchFlag(function(result) {
        app.toggleRootBackBtn(result);
      });
    });

    // Reset launch flag when app is not active.
    window.addEventListener('blur', function() {
      app.settings.createLock().set({ 'pp.launched.by.settings': false });
    });

    // prepare app list that uses geolocation
    AppList.get('geolocation', function(apps) {
      app.elements.appList = apps;
    });

    // listeners for ALA
    app.elements.ALA.$link.addEventListener('click', app.showALABox);
    app.elements.ALA.$back.addEventListener('click', app.showRootBox);
    app.elements.ALA.$backapp.addEventListener('click', app.showExceptions);

    app.elements.ALA.geo.$switch.addEventListener('click', function(event) { app.toggleGeolocation(event.target.checked); });
    app.elements.ALA.settings.$switch.addEventListener('click', function(event) { app.toggleSettings(event.target.checked); });

    app.elements.ALA.type.$select.addEventListener('change', function(event) { app.changeType(event.target.value); });
    app.elements.ALA.type.$blurSlider.addEventListener('change', function(event) { app.changeBlurSlider(event.target.value); });
    app.elements.ALA.type.$blurSlider.addEventListener('touchmove', function(event) { app.updateSliderLabel(event.target.value); });
    app.elements.ALA.type.$customBox.addEventListener('click', app.showCustomLocationBox);

    app.elements.ALA.exception.$link.addEventListener('click', app.showExceptions);

    // listeners for Exceptions
    app.elements.Exceptions.$back.addEventListener('click', app.backToALA);

    // listeners for RPP
    app.elements.RPP.$link.addEventListener('click', app.showRPPBox);
    app.elements.RPP.$back.addEventListener('click', app.showRootBox);

    app.elements.RPP.$newPass.querySelector('button.rpp-new-password-ok').addEventListener('click', app.savePassword);
    app.elements.RPP.$login.querySelector('button.rpp-login-ok').addEventListener('click', app.login);

    app.elements.RPP.RemoteLocate.$input.addEventListener('change', function(event) { app.toggleRemoteLocate(event.target.checked); });
    app.elements.RPP.RemoteRing.$input.addEventListener('change', function(event) { app.toggleRemoteRing(event.target.checked); });
    app.elements.RPP.RemoteLock.$input.addEventListener('change', function(event) { app.toggleRemoteLock(event.target.checked); });
    app.elements.RPP.RemoteWipe.$input.addEventListener('change', function(event) { app.toggleRemoteWipe(event.target.checked); });
    app.elements.RPP.Unlock.$input.addEventListener('change', function(event) { app.toggleUnlock(event.target.checked); });

    app.elements.DCL.onChange = app.toggleCustomLocationSettings;
  };

  /**
   * Gets launch from settings flag from setting
   *
   * @param {Function} callback
   */
  app.getLaunchFlag = function(callback) {
    var ppLaunchFlag = app.settings.createLock().get('pp.launched.by.settings');
    ppLaunchFlag.onsuccess = function() {
      app.launchFlag = ppLaunchFlag.result['pp.launched.by.settings'] || false;
      callback && callback(app.launchFlag);
    };
    ppLaunchFlag.onerror = function() {
      console.warn('Get pp.launched.by.settings failed');
    };
  };

  /**
   * Toggles back button visibility
   *
   * @param {Boolean} visible
   */
  app.toggleRootBackBtn = function(visible) {
    app.elements.$rootBackBtn.style.display = visible ? 'block' : 'none';
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
    app.elements.ALA.geo.$main.style.display = 'block';
    app.elements.ALA.exception.$main.style.display = 'block';
    app.elements.ALA.exception.$main.style.display = 'block';
 
    //set up the back button
    app.elements.ALA.$back.style.display = 'block';
    app.elements.ALA.$backapp.style.display = 'none';
    app.elements.ALA.$app.style.display = 'none';
    app.elements.Exceptions.$back.style.display='none';


    // check if geolocation is enabled
    var status1 = app.settings.createLock().get('geolocation.enabled');
    status1.onsuccess = function() {
      var showGeolocation = status1.result['geolocation.enabled'];

      // show Geolocation box if enabled
      app.elements.ALA.geo.$box.style.display = (showGeolocation) ? 'block' : 'none';

      // set switch position
      app.elements.ALA.geo.$switch.checked = showGeolocation;
    };

    // check if settings are enabled
    var status2 = app.settings.createLock().get('ala.settings.enabled');
    status2.onsuccess = function() {
      var showSettings = status2.result['ala.settings.enabled'];

      // show setting-boxes if settings enabled
      if (showSettings) {
        app.elements.ALA.geo.$box.classList.add('settings-enabled');
        app.elements.ALA.geo.$box.classList.remove('settings-disabled');
      } else {
        app.elements.ALA.geo.$box.classList.remove('settings-enabled');
        app.elements.ALA.geo.$box.classList.add('settings-disabled');
      }

      // set settings switch position
      app.elements.ALA.settings.$switch.checked = showSettings;
    };

    // display settings
    app.displaySettingsInRootContext();
  };

  /**
   * Show main Custom location screen.
   */
  app.showCustomLocationBox = function() {
    var customSettings = {};
    var customSettingsKeys = [{ key: 'geolocation.blur.cl.type', name: "type" },
               { key: 'geolocation.blur.cl.country', name: "country" },
               { key: 'geolocation.blur.cl.city', name: "city" },
               { key: 'geolocation.blur.longitude', name: "longitude" },
               { key: 'geolocation.blur.latitude', name: "latitude" },
               { key: 'geolocation.blur.cl.type', name: "type" }
             ];

    var lock = app.settings.createLock();
    var toCompletion = customSettingsKeys.length;

    [].forEach.call(customSettingsKeys, function(item) {
      var getReq = lock.get(item.key);
      getReq.onsuccess = function() {
        if (getReq.result[item.key] !== undefined) {
         customSettings[item.name] = getReq.result[item.key];
        }

        if (--toCompletion === 0) {
          app.elements.DCL.initAndShow(customSettings);
        }
      };
      getReq.onerror = function() {
        if (--toCompletion === 0) {
          app.elements.DCL.initAndShow(customSettings);
        }
      };
    });
  };

  /**
   * Toggle custom setting box.
   * @param {Boolean} value
   */
  app.toggleCustomLocationSettings = function(settings) {
    var lock = app.settings.createLock();
    var flag = settings.latitude || settings.longitude;

    lock.set({ 'geolocation.blur.cl.type': settings.type,
               'geolocation.blur.cl.country': settings.country,
               'geolocation.blur.cl.city': settings.city,
               'geolocation.blur.longitude': settings.longitude,
               'geolocation.blur.latitude': settings.latitude,
               'geolocation.blur.coords': flag ? '@' + settings.latitude + ',' + settings.longitude : ''
             });
  };

  /**
   * Toggle Geolocation box
   * @param {Boolean} value
   */
  app.toggleGeolocation = function(value) {
    // toggle geolocation box
    app.elements.ALA.geo.$box.style.display = (value) ? 'block' : 'none';

    // save current value to settins
    app.settings.createLock().set({ 'geolocation.enabled': value });
  };


  /**
   * Toggle setting box.
   * @param {Boolean} value
   */
  app.toggleSettings = function(value) {
    if (value) {
      app.elements.ALA.geo.$box.classList.add('settings-enabled');
      app.elements.ALA.geo.$box.classList.remove('settings-disabled');
    } else {
      app.elements.ALA.geo.$box.classList.remove('settings-enabled');
      app.elements.ALA.geo.$box.classList.add('settings-disabled');
    }

    app.settings.createLock().set({ 'ala.settings.enabled': value });
  };


  /**
   * Change ALA type
   * @param {String} value
   */
  app.changeType = function(value) {

    // save current type
    app.settings.createLock().set({ 'geolocation.blur.type': value });

    // hide all elements
    for (var $el of app.elements.ALA.type.$elements) {
      $el.classList.add('disabled');
      $el.classList.remove('enabled');
    }

    switch (value) {
      case 'user-defined':
        app.elements.ALA.type.$customBox.classList.add('enabled');
        app.elements.ALA.type.$customBox.classList.remove('disabled');
        break;
      case 'blur':
        app.elements.ALA.type.$blurBox.classList.add('enabled');
        app.elements.ALA.type.$blurBox.classList.remove('disabled');
        break;
      case 'precise':
      case 'no-location':
      default:
        break;
    }
  };

  /**
   * Display settings in ROOT context
   */
  app.displaySettingsInRootContext = function() {
    // show geolocation switch box and settings switch boxes
    app.elements.ALA.geo.$switchBox.style.display = 'block';
    app.elements.ALA.settings.$switchBox.style.display = 'block';

    // show description for root
    app.elements.ALA.geo.$box.querySelector('.description-for-root');

    // get blur type value
    var status1 = app.settings.createLock().get('geolocation.blur.type');
    status1.onsuccess = function() {
      var type = status1.result['geolocation.blur.type'];

      // set checkbox value
      app.elements.ALA.type.$select.value = type;

      // change settings type
      app.changeType(type);
    };

    // get blur radius value
    var status2 = app.settings.createLock().get('geolocation.blur.slider');
    status2.onsuccess = function() {
      var sliderValue = status2.result['geolocation.blur.slider'];

      // set slider value
      app.elements.ALA.type.$blurSlider.value = sliderValue;

      // set slider label
      app.elements.ALA.type.$blurLabel.textContent = app.getRadiusLabel(sliderValue);
    };
  };

  /**
   *
   * @param {Number} value
   */
  app.updateSliderLabel = function(value) {
    // set slider label
    app.elements.ALA.type.$blurLabel.textContent = app.getRadiusLabel(value);
  };

  /**
   *
   * @param {Number} value
   */
  app.changeBlurSlider = function(value) {
    // save slider value
    app.settings.createLock().set({ 'geolocation.blur.slider': value });

    // save radius
    app.settings.createLock().set({ 'geolocation.blur.radius': app.getRadiusValue(value) });

    // set slider label
    app.elements.ALA.type.$blurLabel.textContent = app.getRadiusLabel(value);
  };

  /**
   * Get radius label from input value.
   * @param {number} value
   * @return {String}
   */
  app.getRadiusLabel = function(value) {
    switch(parseInt(value)) {
      case 1:   return '500m';
      case 2:   return '1km';
      case 3:   return '2km';
      case 4:   return '5km';
      case 5:   return '10km';
      case 6:   return '15km';
      case 7:   return '20km';
      case 8:   return '50km';
      case 9:   return '75km';
      case 10:  return '100km';
      case 11:  return '500km';
      case 12:  return '1000km';
      default:  return '';
    }
  };

  /**
   * Get radius value from input value.
   * @param {number} value
   * @return {number}
   */
  app.getRadiusValue = function(value) {
    switch(parseInt(value)) {
      case 1:   return 0.5;
      case 2:   return 1;
      case 3:   return 2;
      case 4:   return 5;
      case 5:   return 10;
      case 6:   return 15;
      case 7:   return 20;
      case 8:   return 50;
      case 9:   return 75;
      case 10:  return 100;
      case 11:  return 500;
      case 12:  return 1000;
      default:  return null;
    }
  };

  /**** Exceptions part *******************************************************/
  /**
   * Show Exception panel
   */
  app.showExceptions = function() {
    app.elements.ALA.$box.style.display = 'none';
    app.elements.Exceptions.$box.style.display = 'block';
 
    //set up the back button
    app.elements.ALA.$back.style.display = 'none';
    app.elements.ALA.$backapp.style.display = 'none';
//    app.elements.ALA.$app.style.display = 'none';
    app.elements.Exceptions.$back.style.display='block';
 
    app.elements.ALA.geo.$main.style.display = 'block';
    app.elements.ALA.geo.$switchBox.style.display = 'block';
    app.elements.ALA.exception.$main.style.display = 'block';
    app.elements.ALA.$app.style.display = 'none';
 
 

    // render app list
    var manifest, icon, li;

    app.elements.appList.forEach(function(item, index) {
      manifest = item.manifest || item.updateManifest;
      icon = AppList.icon(item);

      li = app.genAppItemTemplate({
        name: manifest.name,
        index: index,
        iconSrc: icon
      });
      app.elements.Exceptions.$appBox.appendChild(li);
    });
  };
 
 /**
  * Show App panel
  */
 app.showAppPanel = function(link){
  app.elements.ALA.$box.style.display = 'block';
  app.elements.ALA.geo.$main.style.display = 'none';
  app.elements.ALA.geo.$switchBox.style.display = 'none';
  app.elements.Exceptions.$box.style.display = 'none';
  app.elements.ALA.exception.$main.style.display = 'none';
  app.elements.ALA.$app.style.display = 'block';
  //app.elements.ALA.$app.appendChild(link);
 
//  //set up the back button
  app.elements.ALA.$back.style.display = 'none';
  app.elements.ALA.$backapp.style.display = 'block';
  app.elements.Exceptions.$back.style.display='none';
 };

  /**
   * Render App item
   * @param itemData
   * @returns {HTMLElement}
   */
  app.genAppItemTemplate = function(itemData) {
    var icon = document.createElement('img');
    var item = document.createElement('li');
    var link = document.createElement('a');
    var name = document.createTextNode(itemData.name);
    icon.src = itemData.iconSrc;
    link.dataset.appIndex = itemData.index;
    link.classList.add('menu-item');
    link.appendChild(icon);
    link.appendChild(name);
    link.addEventListener('click', function(){app.showAppPanel(link)});
    item.appendChild(link);
    return item;
  };

  /**
   * Go back to ALA panel
   */
  app.backToALA = function() {
    app.elements.ALA.$box.style.display = 'block';
    app.elements.Exceptions.$box.style.display = 'none';
 
    //set up the back button
    app.elements.ALA.$back.style.display = 'block';
    app.elements.ALA.$backapp.style.display = 'none';
    app.elements.ALA.$app.style.display = 'none';
    app.elements.Exceptions.$back.style.display='none';

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
