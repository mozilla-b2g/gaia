/* global AppList */
/* global CustomLocationPanel */

'use strict';

var GEO_ENABLED = 'geolocation.enabled';
var GEO_TYPE = 'geolocation.type';
var GEO_APPROX_DISTANCE = 'geolocation.approx_distance';
var GEO_FIXED_COORDS = 'geolocation.fixed_coords';
var GEO_APP_SETTINGS = 'geolocation.app_settings';
var GEO_ALWAYS_PRECISE = 'geolocation.always_precise';

var app = app || {};

(function() {

  app.init = function() {
    app.settings = window.navigator.mozSettings;
    if (!app.settings) {
      return;
    }

    app.elements = {
      $root:          document.getElementById('root'),
      $rootBackBtn:   document.getElementById('back'),
      currentApp:     null,
      ALA: {
        $link:        document.getElementById('menu-item-ala'),
        $back:        document.getElementById('ala-back'),
        $box:         document.getElementById('ala'),
        geo: {
          $switch:    document.getElementById('geolocation-switch'),
          $box:       document.getElementById('geolocation-box')
        },
        settings: {
          $switch:    document.getElementById('settings-switch')
        },
        type: {
          $select:    document.getElementById('ala-type'),
          $elements:  document.getElementById('ala')
                        .querySelectorAll('.type-box'),
          $blurBox:   document.getElementById('type-blur'),
          $blurSlider:document.getElementById('blur-slider'),
          $blurLabel: document.getElementById('blur-label'),
          $customBox: document.getElementById('type-custom-location'),
          $alert:     document.getElementById('custom-location-alert')
        },
        exception: {
          $box:       document.getElementById('add-exception-box'),
          $link:      document.getElementById('add-exception')
        }
      },
      Exceptions: {
        $box:         document.getElementById('exceptions-panel'),
        $back:        document.getElementById('exceptions-back'),
        $appBox:      document.getElementById('app-list')
      },
      Application: {
        $box:         document.getElementById('app-panel'),
        $back:        document.getElementById('app-back'),
        type: {
          $select:    document.getElementById('app-type'),
          $elements:  document.getElementById('app-panel')
                        .querySelectorAll('.type-box'),
          $blurBox:   document.getElementById('app-type-blur'),
          $blurSlider:document.getElementById('app-blur-slider'),
          $blurLabel: document.getElementById('app-blur-label'),
          $customBox: document.getElementById('app-type-custom-location'),
          $infoBox:   document.getElementById('app-panel')
                        .querySelector('.app-info'),
          $alert:     document.getElementById('app-custom-location-alert')
        }
      },
      DCL: new CustomLocationPanel()
    };

    app.elements.ALA.$back.querySelector('span').classList.remove('icon-back');
    app.elements.ALA.$back.querySelector('span').classList.add('icon-close');

    // Observe 'privacy-panel.launched-by-settings' setting to be able to
    // detect launching point.
    window.SettingsListener.observe('pp.launched.by.settings', false,
      function(value) {
        app.toggleRootBackBtn(value);
      }
    );

    // get settings
    window.SettingsListener.observe('geolocation.blur.coords', false,
      function(value) {
        app.geolocationCords = value;
      }
    );

    // Get timezone
    var userTimeZone = app.settings.createLock()
      .get('time.timezone.user-selected');
    userTimeZone.onsuccess = function() {
      var value1 = userTimeZone.result['time.timezone.user-selected'];

      if (value1) {
        app.timeZone = {
          region: value1.replace(/\/.*/, ''),
          city: value1.replace(/.*?\//, '')
        };
      } else {
        var timeZone = app.settings.createLock().get('time.timezone');
        timeZone.onsuccess = function() {
          var value2 = userTimeZone.result['time.timezone'];

          if (value2) {
            app.timeZone =  {
              region: value2.replace(/\/.*/, ''),
              city: value2.replace(/.*?\//, '')
            };
          }
        };
      }
    };

    // Observe 'time.timezone.user-selected'
    window.SettingsListener.observe('time.timezone.user-selected', '',
      function(value) {
        app.timeZone =  {
          region: value.replace(/\/.*/, ''),
          city: value.replace(/.*?\//, '')
        };
      }
    );

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

    // prepare exception list
    var applicationList = app.settings.createLock()
      .get('geolocation.app_settings');
    applicationList.onsuccess = function() {
      app.elements.exceptionsList =
        applicationList.result['geolocation.app_settings'] || {};
    };


    // listeners for ALA
    app.elements.ALA.$link.addEventListener('click', app.showALABox);
    app.elements.ALA.$back.addEventListener('click', app.showRootBox);

    app.elements.ALA.geo.$switch.addEventListener('click',
      function(event) { app.toggleGeolocation(event.target.checked, true); });
    app.elements.ALA.settings.$switch.addEventListener('click',
      function(event) { app.toggleSettings(event.target.checked, true); });

    app.elements.ALA.type.$select.addEventListener('change',
      function(event) { app.changeType(event.target.value, true); });
    app.elements.ALA.type.$blurSlider.addEventListener('change',
      function(event) { app.changeBlurSlider(event.target.value); });
    app.elements.ALA.type.$blurSlider.addEventListener('touchmove',
      function(event) { app.updateSliderLabel(event.target.value); });
    app.elements.ALA.type.$customBox
      .addEventListener('click', app.showCustomLocationBox);
    app.elements.ALA.type.$alert.querySelector('button')
      .addEventListener('click', function() {
        app.showCustomLocationBox();
        app.elements.ALA.type.$alert.setAttribute('hidden', 'hidden');
      });

    app.elements.ALA.exception.$link.addEventListener('click',
      app.showExceptions);

    // listeners for Exceptions
    app.elements.Exceptions.$back.addEventListener('click', app.backToALA);

    // listeners for Application Panel
    app.elements.Application.$back.addEventListener('click', function() {
      app.elements.currentApp = null;
      app.showExceptions();
    });
    app.elements.Application.type.$select.addEventListener('change',
      function(event) { app.changeAppType(event.target.value, true); });
    app.elements.Application.type.$blurSlider.addEventListener('change',
      function(event) { app.changeAppBlurSlider(event.target.value); });
    app.elements.Application.type.$blurSlider.addEventListener('touchmove',
      function(event) { app.updateAppSliderLabel(event.target.value); });
    app.elements.Application.type.$customBox
      .addEventListener('click', app.showAppCustomLocationBox);
    app.elements.Application.type.$alert.querySelector('button')
      .addEventListener('click', function() {
        app.showAppCustomLocationBox();
        app.elements.Application.type.$alert.setAttribute('hidden', 'hidden');
      });
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
  };

  /**** ALA part **************************************************************/
  /**
   * Show ALA screen.
   */
  app.showALABox = function() {
    app.elements.$root.style.display = 'none';
    app.elements.ALA.$box.style.display = 'block';
    app.toggleGeolocation(false, false);

    // check if geolocation is enabled
    var status1 = app.settings.createLock().get('geolocation.enabled');
    status1.onsuccess = function() {
      var showGeolocation = status1.result['geolocation.enabled'];

      // show Geolocation box if enabled
      app.toggleGeolocation(showGeolocation, false);

      // set switch position
      app.elements.ALA.geo.$switch.checked = showGeolocation;
    };

    // check if settings are enabled
    var status2 = app.settings.createLock().get('ala.settings.enabled');
    status2.onsuccess = function() {
      var showSettings = status2.result['ala.settings.enabled'];

      // show setting-boxes if settings enabled
      app.toggleSettings(showSettings, false);

      // set settings switch position
      app.elements.ALA.settings.$switch.checked = showSettings;
    };

    // get blur type value
    var status3 = app.settings.createLock().get('geolocation.type');
    status3.onsuccess = function() {
      var type = status3.result['geolocation.type'];

      // set checkbox value
      app.elements.ALA.type.$select.value = type;

      // change settings type
      app.changeType(type, false);
    };

    // get blur radius value
    var status4 = app.settings.createLock().get('geolocation.blur.slider');
    status4.onsuccess = function() {
      var sliderValue = status4.result['geolocation.blur.slider'];

      // set slider value
      app.elements.ALA.type.$blurSlider.value = sliderValue;

      // set slider label
      app.updateSliderLabel(sliderValue);
    };
  };

  /**
   * Show main Custom location screen.
   */
  app.showCustomLocationBox = function() {
    var customSettings = {
      timeZone: app.timeZone,
      type: 'cc'
    };

    var customSettingsKeys = [
      { key: 'geolocation.blur.cl.type',    name: 'type' },
      { key: 'geolocation.blur.cl.country', name: 'country' },
      { key: 'geolocation.blur.cl.city',    name: 'city' },
      { key: 'geolocation.blur.longitude',  name: 'longitude' },
      { key: 'geolocation.blur.latitude',   name: 'latitude' },
      { key: 'geolocation.blur.cl.type',    name: 'type' }
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
          app.elements.DCL.initAndShow(customSettings, app.saveCustomLocation);
        }
      };
      getReq.onerror = function() {
        if (--toCompletion === 0) {
          app.elements.DCL.initAndShow(customSettings, app.saveCustomLocation);
        }
      };
    });
  };

  /**
   * Save custom location settings.
   * @param {Object} settings
   */
  app.saveCustomLocation = function(settings) {
    var flag = settings.latitude && settings.longitude;

    app.settings.createLock().set({
      'geolocation.blur.cl.type':     settings.type,
      'geolocation.blur.cl.country':  settings.country,
      'geolocation.blur.cl.city':     settings.city,
      'geolocation.blur.longitude':   settings.longitude,
      'geolocation.blur.latitude':    settings.latitude,
      'geolocation.fixed_coords':
        flag ? '@' + settings.latitude + ',' + settings.longitude : ''
    });
  };

  /**
   * Toggle Geolocation box
   * @param {Boolean} value
   * @param {Boolean} save
   */
  app.toggleGeolocation = function(value, save) {
    // toggle geolocation box
    app.elements.ALA.geo.$box.style.display = (value) ? 'block' : 'none';

    if (save) {
      // save current value to settings
      app.settings.createLock().set({ 'geolocation.enabled': value });
    }
  };

  /**
   * Toggle setting box.
   * @param {Boolean} value
   * @param {Boolean} save
   */
  app.toggleSettings = function(value, save) {
    if (value) {
      app.elements.ALA.geo.$box.classList.add('settings-enabled');
      app.elements.ALA.geo.$box.classList.remove('settings-disabled');
    } else {
      app.elements.ALA.geo.$box.classList.remove('settings-enabled');
      app.elements.ALA.geo.$box.classList.add('settings-disabled');
    }

    if (save) {
      app.settings.createLock().set({ 'ala.settings.enabled': value });
    }
  };


  /**
   * Change ALA type
   * @param {String} value
   * @param {Boolean} save
   */
  app.changeType = function(value, save) {

    if (save) {
      // save current type
      app.settings.createLock().set({'geolocation.type': value});
    }

    // hide all elements
    for (var $el of app.elements.ALA.type.$elements) {
      $el.classList.add('disabled');
      $el.classList.remove('enabled');
    }

    // hide alert
    app.elements.ALA.type.$alert.setAttribute('hidden', 'hidden');

    switch (value) {
      case 'user-defined':
        app.elements.ALA.type.$customBox.classList.add('enabled');
        app.elements.ALA.type.$customBox.classList.remove('disabled');

        if ( ! app.geolocationCords) {
          // show alert if geolocation is not set
          app.elements.ALA.type.$alert.removeAttribute('hidden');
        }
        break;
      case 'blur':
        app.elements.ALA.type.$blurBox.classList.add('enabled');
        app.elements.ALA.type.$blurBox.classList.remove('disabled');

        app.updateSliderLabel(app.elements.ALA.type.$blurSlider.value);
        break;
      case 'precise':
      case 'no-location':
        break;
      default:
        break;
    }
  };

  /**
   * Update slider label
   * @param {Number} value
   */
  app.updateSliderLabel = function(value) {
    app.elements.ALA.type.$blurLabel.textContent = app.getRadiusLabel(value);
  };

  /**
   * Change blur slider
   * @param {Number} value
   */
  app.changeBlurSlider = function(value) {
    // save slider value
    app.settings.createLock().set({ 'geolocation.blur.slider': value });

    // save radius
    app.settings.createLock()
      .set({ 'geolocation.approx_distance': app.getRadiusValue(value) });

    // set slider label
    app.updateSliderLabel(value);
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
    app.elements.Application.$box.style.display = 'none';
    app.elements.Exceptions.$box.style.display = 'block';

    // remove existing entries from application list
    var apps = app.elements.Exceptions.$appBox.querySelectorAll('.app-element');
    for (var $el of apps) {
      app.elements.Exceptions.$appBox.removeChild($el);
    }

    // render app list
    var manifest, icon, appSettings, type, li;

    app.elements.appList.forEach(function(item, index) {
      manifest = item.manifest || item.updateManifest;
      icon = AppList.icon(item);
      appSettings = app.elements.exceptionsList[item.origin];
      type = undefined;

      if (appSettings) {
        type = app.elements.exceptionsList[item.origin].type;
        switch (appSettings.type) {
          case 'user-defined':
            type = 'User defined';
            break;
          case 'blur':
            type = app.getRadiusLabel(appSettings.slider) + ' blur';
            break;
          case 'precise':
            type = 'Precise';
            break;
          case 'no-location':
            type = 'No location';
            break;
          default:
            break;
        }
      }

      li = app.genAppItemTemplate({
        origin: item.origin,
        name: manifest.name,
        index: index,
        iconSrc: icon,
        type: type
      });
      app.elements.Exceptions.$appBox.appendChild(li);
    });
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
    var name = document.createElement('span');

    icon.src = itemData.iconSrc;
    name.textContent = itemData.name;

    link.classList.add('menu-item');
    link.appendChild(icon);
    link.appendChild(name);

    if (itemData.type) {
      var type = document.createElement('small');
      type.textContent = itemData.type;
      link.appendChild(type);
    }

    link.addEventListener('click',
      function(){ app.showApplicationPanel(itemData); });
    item.classList.add('app-element');
    item.appendChild(link);
    return item;
  };

  /**
   * Go back to ALA panel
   */
  app.backToALA = function() {
    app.elements.ALA.$box.style.display = 'block';
    app.elements.Exceptions.$box.style.display = 'none';
  };

  /**** Application part ******************************************************/
  /**
   * Show Application Panel
   * @param itemData
   */
  app.showApplicationPanel = function(itemData) {

    app.elements.currentApp = itemData.origin;

    app.elements.Exceptions.$box.style.display = 'none';
    app.elements.Application.$box.style.display = 'block';

    // set application info
    app.elements.Application.type.$infoBox
      .querySelector('img').src = itemData.iconSrc;
    app.elements.Application.type.$infoBox
      .querySelector('span').textContent = itemData.name;

    var application = app.elements.exceptionsList[itemData.origin];
    if (!application) {
      // set default value (from general settings)
      app.elements.Application.type.$select.value = 'system-settings';
      app.changeAppType('system-settings', false);
    } else {
      //show item's values

      // set checkbox value
      app.elements.Application.type.$select.value = application.type;

      // change settings type
      app.changeAppType(application.type, false);

      // set slider value
      app.elements.Application.type.$blurSlider.value = application.slider;

      // set slider label
      app.updateAppSliderLabel(application.slider);
    }
  };

  /**
   * Change Application type
   * @param {String} value
   * @param {Boolean} save
   */
  app.changeAppType = function(value, save) {

    // hide all elements
    for (var $el of app.elements.Application.type.$elements) {
      $el.classList.add('disabled');
      $el.classList.remove('enabled');
    }

    // hide alert
    app.elements.Application.type.$alert.setAttribute('hidden', 'hidden');

    switch (value) {
      case 'user-defined':
        app.elements.Application.type.$customBox.classList.add('enabled');
        app.elements.Application.type.$customBox.classList.remove('disabled');

        if ( ! (app.elements.exceptionsList[app.elements.currentApp] &&
          app.elements.exceptionsList[app.elements.currentApp].coords)) {
          
          // show alert if geolocation is not set
          app.elements.Application.type.$alert.removeAttribute('hidden');
        }

        break;
      case 'blur':
        app.elements.Application.type.$blurBox.classList.add('enabled');
        app.elements.Application.type.$blurBox.classList.remove('disabled');

        app.updateAppSliderLabel(
          app.elements.Application.type.$blurSlider.value
        );
        break;
      case 'system-settings':
        // remove application
        if (save === true) {
          app.removeApplication();
        }
        return;
      case 'precise':
      case 'no-location':
        break;
      default:
        break;
    }

    // save current type
    save && app.saveApplications();
  };

  /**
   * Update slider label for application
   * @param {Number} value
   */
  app.updateAppSliderLabel = function(value) {
    app.elements.Application.type.$blurLabel.textContent =
      app.getRadiusLabel(value);
  };

  /**
   * Change blur slider for application
   * @param {Number} value
   */
  app.changeAppBlurSlider = function(value) {
    app.saveApplications();

    // set slider label
    app.updateAppSliderLabel(value);
  };

  /**
   * Show main Custom location screen.
   */
  app.showAppCustomLocationBox = function() {
    var application = app.elements.exceptionsList[app.elements.currentApp];
    var customSettings = {
      timeZone: app.timeZone,
      type: 'cc'
    };

    if (application.cl_type) {
      customSettings.type = application.cl_type;
    }
    if (application.cl_country) {
      customSettings.country = application.cl_country;
    }
    if (application.cl_city) {
      customSettings.city = application.cl_city;
    }
    if (application.cl_longitude) {
      customSettings.longitude = application.cl_longitude;
    }
    if (application.cl_latitude) {
      customSettings.latitude = application.cl_latitude;
    }

    app.elements.DCL.initAndShow(customSettings, app.saveAppCustomLocation);
  };

  /**
   * Save custom location settings for app.
   * @param {Object} settings
   */
  app.saveAppCustomLocation = function(settings) {
    var flag = settings.latitude && settings.longitude;

    app.saveApplications({
      coords:       flag ? '@'+settings.latitude+','+settings.longitude : '',
      cl_type:      settings.type,
      cl_country:   settings.country,
      cl_city:      settings.city,
      cl_longitude: settings.longitude,
      cl_latitude:  settings.latitude
    });
  };

  /**
   * Save application list.
   * @param {Object|Null} settings
   */
  app.saveApplications = function(settings) {
    var current = app.elements.exceptionsList[app.elements.currentApp] || {};
    var extraSettings = settings || {};

    app.elements.exceptionsList[app.elements.currentApp] = {
      type:   app.elements.Application.type.$select.value,
      slider: app.elements.Application.type.$blurSlider.value,
      radius: app.getRadiusValue(
        app.elements.Application.type.$blurSlider.value
      ),

      coords:       extraSettings.coords || current.coords || null,
      cl_type:      extraSettings.cl_type || current.cl_type || null,
      cl_country:   extraSettings.cl_country || current.cl_country || null,
      cl_city:      extraSettings.cl_city || current.cl_city || null,
      cl_longitude: extraSettings.cl_longitude || current.cl_longitude || null,
      cl_latitude:  extraSettings.cl_latitude || current.cl_latitude || null
    };

    app.settings.createLock()
      .set({ 'geolocation.app_settings': app.elements.exceptionsList });
  };

  /**
   * Remove application from list
   */
  app.removeApplication = function() {
    delete app.elements.exceptionsList[app.elements.currentApp];

    app.settings.createLock()
      .set({ 'geolocation.app_settings': app.elements.exceptionsList });
  };

  window.onload = app.init;
}());
