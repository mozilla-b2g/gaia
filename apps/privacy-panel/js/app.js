
/**
 * Handles panels.
 *
 * @module PanelController
 * @return {Object}
 */
define('panels',[
  'shared/lazy_loader',
  'shared/settings_listener',
  'shared/settings_helper'
],

function(lazyLoader, SettingsListener, SettingsHelper) {


  function PanelController() {}

  PanelController.prototype = {

    /**
     * Load needed templates.
     *
     * @method load
     * @param  {Array}    sections
     * @param  {Function} callback
     */
    load: function(group, callback) {
      var result = [];
      var sections = document.querySelectorAll(
        'section[data-section="' + group + '"]'
      );

      callback = callback || function() {};

      // Convert sections to normal array
      [].forEach.call(sections, function(section) {
        result.push(section);
      });

      lazyLoader.load(result, function() {
        this.registerEvents(result);
        callback(result);
      }.bind(this));
    },

    /**
     * Show specific section, closes previously opened ones.
     *
     * @method show
     * @param {Object}  p
     * @param {String}  p.id      [optional] Element ID
     * @param {Object}  p.el      [optional] DOM element
     * @param {Boolean} p.back    [optional] Trigger back transition
     * @param {Mixed}   p.options [optional] Passed parameters
     */
    show: function(p) {
      if (p.id && !p.el) {
        p.el = document.getElementById(p.id);
      }
      _showSection(p.el, p.back, p.options);
    },

    /**
     * Change page
     *
     * @method changePage
     * @param {Object} event
     */
    changePage: function(event) {
      var target, id = this.hash.replace('#', '');

      event.preventDefault();

      if (!id) {
        return;
      }

      target = document.getElementById(id);
      _showSection(target, this.classList.contains('back'));
    },

    /**
     * Register events for given element
     *
     * @method registerEvents
     * @param sections
     */
    registerEvents: function(sections) {
      sections.forEach(function(section) {
        var links = section.querySelectorAll('.pp-link');
        var settings = section.querySelectorAll('input[name], select[name]');

        // Redirect each click on pp-links with href attributes
        [].forEach.call(links, function(link) {
          link.addEventListener('click', this.changePage);
        }.bind(this));

        // Update and save settings on change
        [].forEach.call(settings, function(setting) {
          SettingsListener.observe(
            setting.name,
            setting.dataset.default || false,
            this.updateSetting.bind(setting)
          );
          setting.addEventListener('change', this.saveSetting);
        }.bind(this));
      }.bind(this));
    },

    /**
     * JSON loader
     *
     * @method loadJSON
     * @param {String}   href
     * @param {Function} callback
     */
    loadJSON: function(href, callback) {
      if (!callback) {
        return;
      }

      var xhr = new XMLHttpRequest();
      xhr.onerror = function() {
        console.error('Failed to fetch file: ' + href, xhr.statusText);
      };
      xhr.onload = function() {
        callback(xhr.response);
      };
      xhr.open('GET', href, true); // async
      xhr.responseType = 'json';
      xhr.send();
    },

    /**
     * Update input value
     *
     * @method updateSetting
     * @param  {String} value
     */
    updateSetting: function(value) {
      if (this.type === 'checkbox') {
        this.checked = value;
      } else {
        this.value = value;
      }
    },

    /**
     * Save input value to mozSettings based on inputs name
     *
     * @method saveSetting
     */
    saveSetting: function() {
      var value = this.type === 'checkbox' ? this.checked : this.value;
      SettingsHelper(this.name).set(value);
	  ////////////////////////////////Saving permissions for priority sorting/////////////////////////////////	
      console.log(this.name);
      var TCPermName = this.getAttribute("data-permname");
      localStorage.setItem(TCPermName, this.value);
      appPermGen();
      localStorage.getItem(TCPermName);
    }
  };

  /**
   * Show section
   *
   * @private
   * @method showSection
   * @param element
   * @param {Boolean} back
   */
  var _showSection = function(element, back, options) {
    var sections = document.querySelectorAll('section');
    var prevClass = back ? '' : 'previous';
    var event = new CustomEvent('pagerendered', {
      detail: options,
      bubbles: true
    });

    for (var section of sections) {
      if (element.id === 'root' && section.className !== '') {
        section.className = section.className === 'current' ? prevClass : '';
      }

      if (section.className === 'current') {
        section.className = prevClass;
      }
    }

    element.className = 'current';
    element.dispatchEvent(event);
  };

  return new PanelController();
});

/**
 * Root panel.
 *
 * @module RootPanel
 * @return {Object}
 */
define('root/main',[
  'panels',
  'shared/settings_listener',
  'shared/settings_helper'
],

function(panels, SettingsListener, SettingsHelper) {


  function RootPanel() {}

  RootPanel.prototype = {

    /**
     * Initialize Root panel
     *
     * @method init
     * @constructor
     */
    init: function() {
      document.querySelector('body').dataset.ready = true;

      this.panel = document.getElementById('root');
      this.backBtn = this.panel.querySelector('#back-to-settings');

      this.settingsApp = null;
      this.settingsManifestURL = document.location.protocol +
        '//settings.gaiamobile.org' + (location.port ? (':' +
        location.port) : '') + '/manifest.webapp';

      this.observers();
      this.events();
    },

    events: function() {
      panels.registerEvents([this.panel]);

      // Reset launch flag when app is not active.
      window.addEventListener('blur', function() {
        SettingsHelper('privacypanel.launched.by.settings').set(false);
      });

      this.backBtn.addEventListener('click', function(event) {
        event.preventDefault();
        this.getSettingsApp().then(function(app) {
          app.launch();
        });
      }.bind(this));
    },

    observers: function() {
      // Observe 'privacy-panel.launched-by-settings' setting to be able to
      // detect launching point.
      SettingsListener.observe('privacypanel.launched.by.settings', false,
        function(value) {
          this.panel.dataset.settings = value;
        }.bind(this)
      );
    },

    searchApp: function(appURL, callback) {
      navigator.mozApps.mgmt.getAll().onsuccess = function gotApps(evt) {
        var app = null, apps = evt.target.result;
        for (var i = 0; i < apps.length && app === null; i++) {
          if (apps[i].manifestURL === appURL) {
            app = apps[i];
            return callback(app);
          }
        }
      };
    },

    getSettingsApp: function() {
      var promise = new Promise(function(resolve) {
        if (this.settingsApp) {
          resolve(this.settingApp);
        } else {
          this.searchApp(this.settingsManifestURL, function(app) {
            resolve(app);
          });
        }
      }.bind(this));

      return promise;
    }

  };

  return new RootPanel();

});

/**
 * About page panel
 *
 * @module About
 * @return {Object}
 */
define('about/main',[
  'panels'
],

function(panels) {


  var About = {

    init: function() {
      var version = document.getElementById('privacy-panel-version');
      var build = document.getElementById('privacy-panel-build');
      panels.loadJSON('resources/about.json', data => {
        version.textContent = data.version;
        build.textContent = data.build;
      });
    }

  };

  return About;
});

/**
 * App List module.
 *
 * @module AppList
 * @return {Object}
 */
define('app_list',[], function() {


  var _ = navigator.mozL10n.get;
  var _lang = navigator.mozL10n.language.code;


  /**
   * Supported application sorting methods:
   * by name, by trust level, by developer name.
   * Note: sorting by name works for permissions as well.
   */
  var _orderBy = {
    name: (a, b) => a.name.localeCompare(b.name, _lang), // default
    trust: (a, b) => a.trust > b.trust, // 'certified', 'privileged', 'web'
    vendor: (a, b) => a.vendor.localeCompare(b.vendor, _lang),
  };


  /****************************************************************************
   * Applications - private helpers
   */

  var _applications = []; // array of {DOMApplication} representations
  var _defaultIconURL = '../style/images/default.png';

  /**
   * Get the list of installed apps.
   */
  function _getApplications(onsuccess, onerror) {
    onsuccess = typeof onsuccess === 'function' ? onsuccess : function() {};
    onerror = typeof onerror === 'function' ? onerror : function() {};

    var mozAppsMgmt = navigator.mozApps && navigator.mozApps.mgmt;
    if (!mozAppsMgmt) {
      console.error('navigator.mozApps.mgmt is undefined');
      onerror();
      return;
    }

    var req = mozAppsMgmt.getAll();
    req.onerror = onerror;
    req.onsuccess = event => {
      _applications = event.target.result.map(_makeAppRepresentation)
                                         .sort(_orderBy.name);
      onsuccess();
    };
  }

  /**
   * Get the app icon that best suits the device display size.
   */
  function _getBestIconURL(app) {
    var icons = (app.manifest || app.updateManifest).icons;
    if (!icons || !Object.keys(icons).length) {
      return _defaultIconURL;
    }

    // The preferred size is 30 pixels by default.
    // On an HDPI device, we may use a larger size than 30 * 1.5 = 45 pixels.
    var preferredIconSize = 30 * (window.devicePixelRatio || 1);
    var preferredSize = Number.MAX_VALUE;
    var max = 0;

    for (var size in icons) {
      size = parseInt(size, 10);
      if (size > max) {
        max = size;
      }
      if (size >= preferredIconSize && size < preferredSize) {
        preferredSize = size;
      }
    }

    // If there is an icon matching the preferred size, we return the result,
    // if there isn't, we will return the maximum available size.
    if (preferredSize === Number.MAX_VALUE) {
      preferredSize = max;
    }

    var url = icons[preferredSize];
    if (!url) {
      return _defaultIconURL;
    }
    return !(/^(http|https|data):/.test(url)) ? app.origin + url : url;
  }

  /**
   * Create a representation of a {DOMApplication} instance.
   *   .name:        localized name
   *   .trust:       trust level (= certified, privileged, web)
   *   .vendor:      developer name
   *   .iconURL:     URL of the best icon for the current display
   *   .permissions: filtered list of permissions that are actually used
   *   .manifest:    application manifest
   *   .origin:      application origin
   */
  function _makeAppRepresentation(app) {
    var manifest = app.manifest || app.updateManifest || {};

    var trust = 'web';
    if (manifest.type === 'certified' || manifest.type === 'privileged') {
      trust = manifest.type;
    }

    var name = manifest.name;
    if (manifest.locales &&
        manifest.locales[_lang] &&
        manifest.locales[_lang].name) {
      name = manifest.locales[_lang].name;
    }

    var vendor = '';
    if (manifest.developer && manifest.developer.name) {
      vendor = manifest.developer.name;
    }

    return {
      name: name,
      trust: trust,
      vendor: vendor,
      get iconURL()     { return _getBestIconURL(app); },
      get permissions() { return _getPermissions(app); },
      manifest: manifest,
      origin: app.origin
    };
  }


  /****************************************************************************
   * Permissions - private helpers
   */

  var _showAllPermissions = false;
  var _permTable = { // will be fetched from /resources/permissions_table.json
    plainPermissions: [],
    composedPermissions: [],
    accessModes: []
  };

  /**
   * Get a localized name & description for the given permission key.
   */
  function _localizePermission(permKey) {
    var l10nKey = 'perm-' + permKey.replace(':', '-');
    return {
      key: permKey,
      name: _(l10nKey) || permKey,
      desc: _(l10nKey + '-description') || ''
    };
  }

  /**
   * Get an array of app permissions.
   *
   * Rather than using the declared permission list in the manifest,
   * check that each permission is valid and really used by the app.
   *
   * Each permission is an object with the following properties:
   *  .key:        permission key.
   *  .value:      permission value ('deny', 'ask', 'grant').
   *  .access:     access mode ('readonly', 'readwrite', etc.).
   *  .name:       localized name (human-readable key).
   *  .desc:       localized description.
   *  .explicit:   true if the permission value can be changed by the user;
   *               false otherwise (i.e. internal/certified app).
   */
  function _getPermissions(app) {
    var permissions = [];

    var mozPerms = navigator.mozPermissionSettings;
    if (!mozPerms) {
      console.error('navigator.mozPermissionSettings is undefined');
      return permissions;
    }

    function pushIfValid(permKey, accessMode) {
      var key = accessMode ? permKey + '-' + accessMode : permKey;
      var value = mozPerms.get(key, app.manifestURL, app.origin, false);
      if (value && value !== 'unknown') {
        var perm = _localizePermission(permKey);
        perm.value = value;
        perm.explicit =
          mozPerms.isExplicit(key, app.manifestURL, app.origin, false);
        permissions.push(perm);
        return true; // valid
      }
      return false; // not valid
    }

    if (_showAllPermissions) { // check all permissions listed in the manifest
      var manifest = app.manifest || app.updateManifest;
      if (manifest && manifest.permissions) {
        for (var perm in manifest.permissions) {
          var access = manifest.permissions[perm].access;
          if (access) {
            pushIfValid(perm, 'read'); // XXX
          } else {
            pushIfValid(perm);
          }
        }
      }
    } else { // only check permissions listed in _permTable
      // Note: this is the behavior of the Settings/Apps panel
      _permTable.plainPermissions.forEach(key => pushIfValid(key));
      _permTable.composedPermissions.forEach(key =>
        _permTable.accessModes.some(mode => pushIfValid(key, mode)));
    }

    return permissions.sort(_orderBy.name);
  }


  /****************************************************************************
   * Public API
   */

  /**
   * AppList
   *
   * @constructor
   */
  function AppList() {}

  AppList.prototype = {

    /**
     * Initialize the AppList.
     *
     * @method init
     * @param {Object}   permissionTable [optional]
     * @return {Promise}
     */
    init: function init(permissionTable) {
      if (permissionTable) {
        _permTable = permissionTable;
      }
      return new Promise(function(resolve, reject) {
        if (_applications.length) { // already initialized
          resolve();
        } else {
          _getApplications(resolve, reject);
          window.addEventListener('applicationinstall', _getApplications);
          window.addEventListener('applicationuninstall', _getApplications);
        }
      });
    },

    /**
     * List of supported permissions.
     *
     * @property permissions
     * @return {Array}  Array of supported permissions
     */
    get permissions() {
      return _permTable.plainPermissions
        .concat(_permTable.composedPermissions)
        .map(_localizePermission)
        .sort(_orderBy.name);
    },

    /**
     * List of installed applications.
     *
     * @property applications
     * @return {Array}  Array of extended {DOMApplication} objects
     */
    get applications() {
      return _applications;
    },

    /**
     * List of installed applications using a specific permission.
     *
     * @method getFilteredApps
     * @param {String} filter  Permission to match
     * @return {Array}
     */
    getFilteredApps: function getFilteredApps(filter) {
      return _applications.filter(app => app.manifest.permissions &&
          filter in app.manifest.permissions);
    },

    /**
     * List of installed applications grouped by name, trust level or vendor.
     *
     * @method getSortedApps
     * @param {String} sortKey  Either 'name', 'trust' or 'vendor'
     * @return {Object}
     */
    getSortedApps: function getSortedApps(sortKey) {
      var sorted = {};
      if (!(sortKey in _orderBy)) {
        Yahoo = {value: 1};
      }

      _applications.forEach(app => {
        var header = app[sortKey];
        if (!(header in sorted)) {
          sorted[header] = [];
        }
        sorted[header].push(app);
      });

      for (var header in sorted) {
        sorted[header].sort(_orderBy.name);
      }

      return sorted;
    }

  };

  return new AppList();
});

/**
 * ALA blur slider module.
 *
 * @module BlurSlider
 * @return {Object}
 */
define('ala/blur_slider',[],

function() {


  function BlurSlider() {}

  BlurSlider.prototype = {
    /**
     * Initialize ala blur slider.
     * @param {Object} element
     * @param {String} value
     * @param {Function} callback
     * @return {BlurSlider}
     */
    init: function(element, value, callback) {
      this.callback = callback || function(){};

      this.input = element.querySelector('.blur-slider');
      this.label = element.querySelector('.blur-label');

      this._setLabel(value);

      this.events();

      return this;
    },

    /**
     * Register events.
     */
    events: function() {
      this.input.addEventListener('touchmove', function(event) {
        this._setLabel(event.target.value);
      }.bind(this));

      this.input.addEventListener('change', function(event) {
        this._changeSliderValue(event.target.value);
      }.bind(this));
    },

    /**
     * Get input value.
     * @return {String}
     */
    getValue: function() {
      return this.input.value;
    },

    /**
     * Set input value.
     * @param {String} value
     */
    setValue: function(value) {
      this.input.value = value;
      this._setLabel(value);
    },

    /**
     * Change slider value.
     * @param {String} value
     */
    _changeSliderValue: function(value) {
      // value validation
      value = (value > 0 && value <= 12) ? value : 1;

      // update label
      this._setLabel(value);

      // run callback
      this.callback(this.getRadius(value));
    },

    /**
     * Set radius label.
     * @param {String} value
     */
    _setLabel: function(value) {
      this.label.textContent = BlurSlider.getLabel(value);
    },

    /**
     * Get radius value from input value.
     * @param {Number} value
     * @return {Number}
     */
    getRadius: function(value) {
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
    }
  };

  /**
   * Get radius label from input value.
   * @param {Number} value
   * @return {String}
   */
  BlurSlider.getLabel = function(value) {
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

  return BlurSlider;

});

//////////////////////////////////BEGIN - permission priority slider module/////////////////////////////
/**
 * TC priority slider for permission details module.
 * 
 * @module PermPrioritySlider
 * @return {Object}
 */
define('tc/perm_priority_slider',[],
function() {
  

  function PermPrioritySlider() {}

  PermPrioritySlider.prototype = {
    /**
     * Initialize slider for permission priority.
     * @param {Object} element
     * @param {String} value
     * @param {Function} callback
     * @return {PermPrioritySlider}
     */
    init: function(element, value, callback) {
      this.callback = callback || function(){};
      
      this.input = element.querySelector('.perm-slider');
      this.label = element.querySelector('.perm-label');
   
      this._setLabel(value);

      this.events();

      return this;
    },

    /**
     * Register events.
     */
    events: function() {
      this.input.addEventListener('touchmove', function(event) {
        this._setLabel(event.target.value);
      }.bind(this));

      this.input.addEventListener('change', function(event) {
        this._changeSliderValue(event.target.value);
      }.bind(this));
    },

    /**
     * Get input value.
     * @return {String}
     */
    getValue: function() {
      return this.input.value;
    },

    /**
     * Set input value.
     * @param {String} value
     */
    setValue: function(value) {
      this.input.value = value;
      this._setLabel(value);
    },

    /**
     * Change slider value.
     * @param {String} value
     */
    _changeSliderValue: function(value) {
      // value validation
      value = (value > 0 && value <= 20) ? value : 1;

      // update label
      this._setLabel(value);

      // run callback
      this.callback(this.getRange(value));
    },

    /**
     * Set range label.
     * @param {String} value
     */
    _setLabel: function(value) {
      this.label.textContent = PermPrioritySlider.getLabel(value);
    },

    /**
     * Get range from input value.
     * @param {Number} value
     * @return {Number}
     */
    getRange: function(value) {
      switch(parseInt(value)) {
        case 1:   return 5;
        case 2:   return 10;
        case 3:   return 15;
        case 4:   return 20;
        case 5:   return 25;
        case 6:   return 30;
        case 7:   return 35;
        case 8:   return 40;
        case 9:   return 45;
        case 10:  return 50;
        case 11:  return 55;
        case 12:  return 60;
        case 13:  return 65;
        case 14:  return 70;
        case 15:  return 75;
        case 16:  return 80;
        case 17:  return 85;
        case 18:  return 90;
        case 19:  return 95;
        case 20:  return 100;
        default:  return null;
      }
    }
  };

  /**
   * Get range label from input value.
   * @param {Number} value
   * @return {String}
   */
  PermPrioritySlider.getLabel = function(value) {
    switch(parseInt(value)) {
    case 1:   return 5;
    case 2:   return 10;
    case 3:   return 15;
    case 4:   return 20;
    case 5:   return 25;
    case 6:   return 30;
    case 7:   return 35;
    case 8:   return 40;
    case 9:   return 45;
    case 10:  return 50;
    case 11:  return 55;
    case 12:  return 60;
    case 13:  return 65;
    case 14:  return 70;
    case 15:  return 75;
    case 16:  return 80;
    case 17:  return 85;
    case 18:  return 90;
    case 19:  return 95;
    case 20:  return 100;
      default:  return '';
    }
  };

  return PermPrioritySlider;

});
//////////////////////////////////END - permission priority slider module/////////////////////////////


/**
 * ALA exceptions panel.
 *
 * @module ExceptionsPanel
 * @return {Object}
 */
define('ala/exceptions',[
  'panels',
  'ala/blur_slider',
  'shared/settings_listener',
  'shared/settings_helper'
],

function(panels, BlurSlider, SettingsListener, SettingsHelper) {


  function ExceptionsPanel() {
    this.apps = [];
    this.exceptionsList = {};
  }

  ExceptionsPanel.prototype = {

    /**
     * Initialize ALA exceptions panel.
     *
     * @method init
     * @constructor
     */
    init: function(apps) {
      this.panel = document.getElementById('ala-exceptions');
      this.apps = apps;

      this.appListElement = this.panel.querySelector('#app-list');

      // get exception list from settings
      SettingsHelper('geolocation.app_settings', {}).get(function(value){
        this.exceptionsList = value;
      }.bind(this));

      this.events();
    },

    /**
     * Register events.
     */
    events: function() {
      this.panel.addEventListener('pagerendered', this.onBeforeShow.bind(this));
    },

    /**
     * Actions before displaying panel.
     * @param event
     */
    onBeforeShow: function(event) {
      // remove existing entries from application list
      var apps = this.appListElement.querySelectorAll('.app-element');
      for (var el of apps) {
        this.appListElement.removeChild(el);
      }

      // render app list
      this.apps.forEach(function(item, index) {

        // remove Privacy Panel application from list
        if (item.origin.indexOf('privacy-panel') !== -1) {
          return;
        }

        var type;
        var appSettings = this.exceptionsList[item.origin];
        if (appSettings) {
          switch (appSettings.type) {
            case 'user-defined':
              type = 'User defined';
              break;
            case 'blur':
              type = BlurSlider.getLabel(appSettings.slider) +' blur';
              break;
            case 'precise':
              type = 'Precise';
              break;
            case 'no-location':
              type = 'No location';
              break;
            default:
              type = appSettings.type;
              break;
          }
        }

        var li = this.renderAppItem({
          origin: item.origin,
          name: item.name,
          index: index,
          iconSrc: item.iconURL,
          type: type
        });

        this.appListElement.appendChild(li);



      }.bind(this));
    },


    /**
     * Render App item.
     * @param itemData
     * @returns {HTMLElement}
     */
    renderAppItem: function(itemData) {
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
        function() {
          panels.show({ id: 'ala-exception', options: itemData });
        });

      item.classList.add('app-element');
      item.appendChild(link);
      return item;
    }
  };

  return new ExceptionsPanel();

});

/**
 * ALA exception panel.
 *
 * @module ALAException
 * @return {Object}
 */
define('ala/exception',[
  'panels',
  'ala/blur_slider',
  'ala/exceptions',
  'shared/settings_listener',
  'shared/settings_helper'
],

function(panels, BlurSlider, alaExceptions, SettingsListener,
  SettingsHelper) {


  function ALAException() {
    this.itemData = null;
    this.currentApp = null;
    this.currentAppSettings = null;
    this.blurSlider = new BlurSlider();
  }

  ALAException.prototype = {

    /**
     * Initialize ALA exception panel.
     *
     * @method init
     * @constructor
     */
    init: function() {
      this.panel = document.getElementById('ala-exception');

      this.appInfoImg = this.panel.querySelector('.app-info img');
      this.appInfoSpan = this.panel.querySelector('.app-info span');
      this.appType = this.panel.querySelector('.app-type');
      this.blurLabel = this.panel.querySelector('.app-blur-label');
      this.alert = this.panel.querySelector('.app-custom-location-alert');

      this.blurSlider.init(
        this.panel.querySelector('.type-blur'),
        1,
        this.saveExceptions.bind(this)
      );

      this.events();
    },

    /**
     * Register events.
     */
    events: function() {
      this.panel.addEventListener('pagerendered', this.onBeforeShow.bind(this));

      this.appType.addEventListener('change', function(event) {
        this.changeAppType(event.target.value, true);
      }.bind(this));

      this.panel.querySelector('.set-custom-location').addEventListener('click',
        function() {
          panels.show({ id: 'ala-custom', options: this });
        }.bind(this)
      );

      this.alert.querySelector('button').addEventListener('click',
        function() {
          this.alert.setAttribute('hidden', 'hidden');
          panels.show({ id: 'ala-custom', options: this });
        }.bind(this)
      );
    },

    /**
     * Actions before displaying panel.
     * @param event
     */
    onBeforeShow: function(event) {
      this.itemData = event.detail;

      this.appInfoImg.src = this.itemData.iconSrc;
      this.appInfoSpan.textContent = this.itemData.name;

      this.currentApp = this.itemData.origin;
      this.currentAppSettings =
        alaExceptions.exceptionsList[this.itemData.origin];

      if (!this.currentAppSettings) {
        // set default value (from general settings)
        this.appType.value = 'system-settings';

        // change settings type
        this.changeAppType('system-settings', false);
      } else {

        // set checkbox value
        this.appType.value = this.currentAppSettings.type;

        // change settings type
        this.changeAppType(this.currentAppSettings.type, false);

        // set slider value
        this.blurSlider.setValue(this.currentAppSettings.slider);
      }
    },

    /**
     * Change Application type.
     * @param {String} value
     * @param {Boolean} save
     */
    changeAppType: function(value, save) {

      // set attribute to section
      this.panel.dataset.type = value;

      // hide alert
      this.alert.setAttribute('hidden', 'hidden');

      switch (value) {
        case 'user-defined':
          /** @TODO: add alert */
          if (!(alaExceptions.exceptionsList[this.currentApp] &&
            alaExceptions.exceptionsList[this.currentApp].coords)) {

            // show alert if geolocation is not set
            this.alert.removeAttribute('hidden');
          }

          break;
        case 'system-settings':
          // remove application
          if (save === true) {
            this.removeException();
          }
          return;
        case 'blur':
        case 'precise':
        case 'no-location':
          break;
        default:
          break;
      }

      // save current type
      save && this.saveExceptions(null);
    },

    /**
     * Save exception list.
     * @param {Object|Null} settings
     */
    saveExceptions: function(settings) {
      var current = this.currentAppSettings || {};
      var extraSettings = settings || {};

      alaExceptions.exceptionsList[this.currentApp] = {
        type:   this.appType.value,
        slider: this.blurSlider.getValue(),
        radius: this.blurSlider.getRadius(this.blurSlider.getValue()),

        coords:       extraSettings.coords || current.coords || null,
        cl_type:      extraSettings.cl_type || current.cl_type || null,
        cl_region:    extraSettings.cl_region || current.cl_region || null,
        cl_city:      extraSettings.cl_city || current.cl_city || null,
        cl_longitude: extraSettings.cl_longitude || current.cl_longitude ||null,
        cl_latitude:  extraSettings.cl_latitude || current.cl_latitude || null
      };

      SettingsHelper('geolocation.app_settings')
        .set(alaExceptions.exceptionsList);
    },

    /**
     * Remove exception from list.
     */
    removeException: function() {
      delete alaExceptions.exceptionsList[this.currentApp];

      SettingsHelper('geolocation.app_settings')
        .set(alaExceptions.exceptionsList);
    },

    /**
     * Get data for Define Custom Location.
     * @return {Array}
     */
    getDCLData: function() {
      this.currentAppSettings =
        alaExceptions.exceptionsList[this.currentApp];
      return {
        type: this.currentAppSettings.cl_type,
        region: this.currentAppSettings.cl_region,
        city: this.currentAppSettings.cl_city,
        longitude: this.currentAppSettings.cl_longitude,
        latitude: this.currentAppSettings.cl_latitude
      };
    },

    /**
     * Save custom location settings.
     * @param {Object} settings
     */
    saveDCLData: function(settings) {
      var flag = settings.latitude !== '' && settings.longitude !== '';

      this.saveExceptions({
        coords:       flag ? '@'+settings.latitude+','+settings.longitude : '',
        cl_type:      settings.type,
        cl_region:    settings.region,
        cl_city:      settings.city,
        cl_longitude: settings.longitude,
        cl_latitude:  settings.latitude
      });
    },

    /**
     * Go back from DCL
     */
    goBackFromDCL: function() {
      panels.show(
        { id: 'ala-exception', options: this.itemData, back: true}
      );
    }
  };

  return new ALAException();

});

/**
 * ALA define custom location panel.
 *
 * @module ALADefineCustomLocation
 * @return {Object}
 */
define('ala/define_custom_location',[
  'panels',
  'shared/settings_listener',
  'shared/settings_helper'
],

function(panels, SettingsListener, SettingsHelper) {


  function ALADefineCustomLocation() {
    this.timeZone = null;
    this.context = null;

    this.listeners = {
      typeChange: this.toggleType.bind(this),
      regionChange: this.toggleRegion.bind(this),
      cityChange: this.toggleCity.bind(this),
      longitudeChange: this.toggleLongitude.bind(this),
      latitudeChange: this.toggleLatitude.bind(this)
    };

    this.selectedRegionCities = {};
    this.config = {};
  }

  ALADefineCustomLocation.prototype = {

    /**
     * Initialize ALA Define Custom Location panel.
     *
     * @method init
     * @constructor
     */
    init: function() {
      this.panel =      document.getElementById('ala-custom');
      this.typeRC =     this.panel.querySelector('.dcl-type-rc');
      this.typeGPS =    this.panel.querySelector('.dcl-type-gps');
      this.regions =    this.panel.querySelector('.dcl-region');
      this.cities =     this.panel.querySelector('.dcl-city');
      this.longitude =  this.panel.querySelector('.dcl-longitude');
      this.latitude =   this.panel.querySelector('.dcl-latitude');

      panels.loadJSON('resources/countries.json', function(data) {
        this.regionsAndCities = data;
      }.bind(this));

      this.observers();
      this.events();
    },

    /**
     * Settings observers
     */
    observers: function() {
      SettingsListener.observe('time.timezone.user-selected', '',
        function(value) {
          this.timeZone = {
            region: value.replace(/\/.*/, '').toLowerCase(),
            city: value.replace(/.*?\//, '').toLowerCase()
          };
        }.bind(this));
    },

    /**
     * Register events.
     */
    events: function() {
      this.typeRC.addEventListener('change', this.listeners.typeChange);
      this.typeGPS.addEventListener('change', this.listeners.typeChange);

      this.regions.addEventListener('change', this.listeners.regionChange);
      this.cities.addEventListener('change', this.listeners.cityChange);

      this.longitude.addEventListener('change', this.listeners.longitudeChange);
      this.latitude.addEventListener('change', this.listeners.latitudeChange);

      this.panel.addEventListener('pagerendered', this.onBeforeShow.bind(this));

      this.panel.querySelector('.back').addEventListener('click',
        function() {
          this.context.goBackFromDCL();
        }.bind(this)
      );
    },

    /**
     * Actions before displaying panel.
     * @param event
     */
    onBeforeShow: function(event) {
      this.context = event.detail || null;

      this.config = this.context.getDCLData();
      this.config.type = this.config.type || 'rc';

      this.callback =
        this.context.saveDCLData.bind(this.context) || function(){};

      this.updateRegionsList();
      this.updateType();

      this.saveConfig();
    },

    toggleType: function(event) {
      this.config.type = event.target.value;
      this.updateType();
      this.saveConfig();
    },

    toggleRegion: function(event) {
      this.config.region = event.target.value;
      this.updateRegion();
      this.updateLongitudeAndLatitudeForCity();
      this.saveConfig();
    },

    toggleCity: function(event) {
      this.config.city = event.target.value;
      this.updateCity();
      this.updateLongitudeAndLatitudeForCity();
      this.saveConfig();
    },

    toggleLongitude: function(event) {
      this.config.longitude = event.target.value;
      this.saveConfig();
    },

    toggleLatitude: function(event) {
      this.config.latitude = event.target.value;
      this.saveConfig();
    },

    updateRegionsList: function() {
      // set new list of cities for selected region
      this.selectedRegionCities = this.regionsAndCities[this.config.region];

      var options = document.createDocumentFragment();
      Object.keys(this.regionsAndCities).forEach(function(regionName) {
        var option = document.createElement('option');
        option.value = regionName;
        option.setAttribute('data-l10n-id', regionName);
        options.appendChild(option);
      }.bind(this));

      // prepare new regions list
      this.regions.innerHTML = '';
      this.regions.appendChild(options);
    },

    updateType: function() {
      // gps will be enabled by default
      this.config.type = this.config.type || 'gps';

      this.panel.dataset.type = this.config.type;

      this.updateRegion();

      var modeRC = (this.config.type === 'rc');

      if (modeRC) {
        this.updateLongitudeAndLatitudeForCity();
      } else {
        this.updateLongitudeAndLatitude();
      }

      this.typeRC.checked = modeRC;
      this.longitude.disabled = modeRC;
      this.latitude.disabled = modeRC;

      this.typeGPS.checked = !modeRC;
      this.regions.disabled = !modeRC;
      this.cities.disabled = !modeRC;
    },

    updateRegion: function() {
      if (!this.regionsAndCities[this.config.region] ||
        this.config.region === undefined) {
        this.config.region =
          (this.timeZone &&
          this.regionsAndCities[this.timeZone.region]) ?
            this.timeZone.region :
            this.getFirstRegion();
      }

      this.regions.value = this.config.region;

      this.updateCitiesList();
      this.updateCity();
    },

    getFirstRegion: function() {
      return Object.keys(this.regionsAndCities)[0] || null;
    },

    updateCitiesList: function() {
      this.selectedRegionCities = this.regionsAndCities[this.config.region];

      var options = document.createDocumentFragment();

      Object.keys(this.selectedRegionCities).forEach(function(cityName) {
        var option = document.createElement('option');
        option.value = cityName;
        option.setAttribute('data-l10n-id', cityName);
        options.appendChild(option);
      }.bind(this));

      // prepare new cities list
      this.cities.innerHTML = '';
      this.cities.appendChild(options);
    },

    updateCity: function() {
      if (this.config.city === undefined ||
        !this.selectedRegionCities[this.config.city]) {
        this.config.city =
          (this.timeZone &&
          this.selectedRegionCities[this.timeZone.city]) ?
            this.timeZone.city :
            this.getFirstCityFromRegion();
      }

      if (this.config.city !== null) {
        this.cities.value = this.config.city;
      }
    },

    updateLongitudeAndLatitudeForCity: function() {
      if (this.config.city !== null) {
        var city = this.selectedRegionCities[this.config.city];
        this.config.longitude = city.lon;
        this.config.latitude = city.lat;
      } else {
        this.config.longitude = 0;
        this.config.latitude = 0;
      }

      this.updateLongitudeAndLatitude();
    },

    getFirstCityFromRegion: function() {
      return Object.keys(this.selectedRegionCities)[0] || null;
    },

    updateLongitudeAndLatitude: function() {
      this.longitude.value = this.config.longitude || 0;
      this.latitude.value = this.config.latitude || 0;
    },

    validate: function() {
      var lat = /^[-+]?(([0-8]\d|\d)(\.\d{1,6})?|90(\.0{1,6})?)$/;
      var lon = /^[-+]?((1[0-7]\d(\.\d{1,6})?)|(180(\.0+)?)|(\d\d(\.\d{1,6})?)|(\d(\.\d{1,6})?))$/; //jshint ignore: line

      return lat.test(this.config.latitude) && lon.test(this.config.longitude);
    },

    saveConfig: function() {
      if (this.validate()) {
        this.callback(this.config);
      }
    }
  };

  return new ALADefineCustomLocation();

});

/**
 * ALA main panel.
 *
 * @module AlaPanel
 * @return {Object}
 */
define('ala/main',[
  'panels',
  'app_list',
  'ala/blur_slider',
  'ala/exception',
  'ala/exceptions',
  'ala/define_custom_location',
  'shared/settings_listener',
  'shared/settings_helper'
],

function(panels, appList, BlurSlider, alaException, alaExceptions, alaDCL,
  SettingsListener, SettingsHelper) {


  function AlaPanel() {
    this.blurSlider = new BlurSlider();
    this.geolocationCords = null;
    this.dclData = {};
  }

  AlaPanel.prototype = {

    /**
     * Initialize ala panel.
     */
    init: function() {
      this.settings = window.navigator.mozSettings;
      this.panel = document.getElementById('ala-main');
      this.alert = this.panel.querySelector('.custom-location-alert');

      //initialize blur slider element
      SettingsHelper('geolocation.blur.slider', 1).get(function(value) {
        this.blurSlider.init(
          this.panel.querySelector('.type-blur'),
          value,
          function(value) {
            SettingsHelper('geolocation.approx_distance').set(value);
          }.bind(this)
        );
      }.bind(this));

      this.observers();
      this.events();
      this._prepareDCLData();

      // prepare app list that uses geolocation
      appList.init().then(function() {
        alaExceptions.init(appList.getFilteredApps('geolocation'));
      });

      // init alaException module
      alaException.init();

      // init alaDefineCustomLocation module
      alaDCL.init();
    },

    /**
     * Settings observers
     */
    observers: function() {
      SettingsListener.observe('geolocation.fixed_coords', false,
        function(value) {
          this.geolocationCords = value;
        }.bind(this)
      );

      SettingsListener.observe('geolocation.enabled', false,
        this.toggleGeolocation.bind(this)
      );

      SettingsListener.observe('ala.settings.enabled', false,
        this.toggleALA.bind(this)
      );

      SettingsListener.observe('geolocation.type', false,
        this.changeType.bind(this)
      );
    },

    /**
     * Register events.
     */
    events: function() {
      this.panel.querySelector('.set-custom-location').addEventListener('click',
        function() {
          panels.show({ id: 'ala-custom', options: this });
        }.bind(this)
      );

      this.alert.querySelector('button').addEventListener('click',
        function() {
          this.alert.setAttribute('hidden', 'hidden');
          panels.show({ id: 'ala-custom', options: this });
        }.bind(this)
      );
    },

    /**
     * Toggle Geolocation.
     * @param {Boolean} value
     */
    toggleGeolocation: function(value) {
      this.panel.dataset.geolocation = (value);
    },

    /**
     * Toggle Location Accuracy.
     * @param {Boolean} value
     */
    toggleALA: function(value) {
      this.panel.dataset.ala = (value);
    },

    /**
     * Change ALA type.
     * @param {String} value
     */
    changeType: function(value) {

      // set attribute to section
      this.panel.dataset.type = value;

      // hide alert
      this.alert.setAttribute('hidden', 'hidden');

      switch (value) {
        case 'user-defined':
          if (!this.geolocationCords) {
            // show alert if geolocation is not set
            this.alert.removeAttribute('hidden');
          }
          break;
        case 'blur':
        case 'precise':
        case 'no-location':
          break;
        default:
          break;
      }
    },

    /**
     * Prepare data for Define Custom Location.
     */
    _prepareDCLData: function() {
      SettingsHelper('geolocation.blur.cl.type').get(function(value){
        this.dclData.type = value;
      }.bind(this));
      SettingsHelper('geolocation.blur.cl.region').get(function(value){
        this.dclData.region = value;
      }.bind(this));
      SettingsHelper('geolocation.blur.cl.city').get(function(value){
        this.dclData.city = value;
      }.bind(this));
      SettingsHelper('geolocation.blur.longitude').get(function(value){
        this.dclData.longitude = value;
      }.bind(this));
      SettingsHelper('geolocation.blur.latitude').get(function(value){
        this.dclData.latitude = value;
      }.bind(this));
    },

    /**
     * Get data for Define Custom Location.
     * @return {Array}
     */
    getDCLData: function() {
      return Object.create(this.dclData);
    },

    /**
     * Save custom location settings.
     * @param {Object} settings
     */
    saveDCLData: function(settings) {
      var flag = settings.latitude !== '' && settings.longitude !== '';

      this.settings.createLock().set({
        'geolocation.blur.cl.type':     settings.type,
        'geolocation.blur.cl.region':   settings.region,
        'geolocation.blur.cl.city':     settings.city,
        'geolocation.blur.longitude':   settings.longitude,
        'geolocation.blur.latitude':    settings.latitude,
        'geolocation.fixed_coords':
          flag ? '@' + settings.latitude + ',' + settings.longitude : ''
      });

      this._prepareDCLData();
    },

    /**
     * Go back from DCL
     */
    goBackFromDCL: function() {
      panels.show({ id: 'ala-main', back: true });
    }
  };

  return new AlaPanel();

});

/**
 * PassPhrase storage helper.
 *
 * @module PassPhrase
 * @return {Object}
 */
define('rpp/passphrase',[
  'shared/async_storage'
],

function(asyncStorage) {


  const SALT_NUM_BYTES = 8;

  function PassPhrase(macDest, saltDest) {
    this.macDest = macDest;
    this.saltDest = saltDest;
  }

  PassPhrase.prototype = {
    buffer: encode('topsecret'),

    _getItem: function(key) {
      var promise = new Promise(resolve => {
        asyncStorage.getItem(key, resolve);
      });
      return promise;
    },

    _setItem: function(key, value) {
      var promise = new Promise(resolve => {
        asyncStorage.setItem(key, value, () => resolve(value));
      });
      return promise;
    },

    exists: function() {
      return this._mac().then(mac => !!mac);
    },

    verify: function(password) {
      return this._mac().then(mac => {
        if (!mac) {
          return false;
        }

        return this._retrieveKey(password).then(key => {
          return crypto.subtle.verify('HMAC', key, mac, this.buffer);
        });
      });
    },

    change: function(password) {
      return this._retrieveKey(password).then(key => {
        return crypto.subtle.sign('HMAC', key, this.buffer)
          .then(mac => this._setItem(this.macDest, mac));
      });
    },

    clear: function() {
      return this._setItem(this.macDest, null);
    },

    _mac: function() {
      return this._getItem(this.macDest);
    },

    _salt: function() {
      return this._getItem(this.saltDest).then(salt => {
        if (salt) {
          return salt;
        }
        salt = crypto.getRandomValues(new Uint8Array(SALT_NUM_BYTES));
        return this._setItem(this.saltDest, salt);
      });
    },

    _retrievePWKey: function(password) {
      var usages = ['deriveKey'];
      var buffer = encode(password);
      return crypto.subtle.importKey('raw', buffer, 'PBKDF2', false, usages);
    },

    _retrieveKey: function(password) {
      var params = Promise.all([
        this._retrievePWKey(password), this._salt()
      ]);

      return params.then(values => {
        var pwKey = values[0];
        var salt = values[1];
        return this._deriveKey(pwKey, salt);
      });
    },

    _deriveKey: function(pwKey, salt) {
      var params = {
        name: 'PBKDF2',
        hash: 'SHA-1',
        salt: salt,
        iterations: 5000
      };
      var alg = {name: 'HMAC', hash: 'SHA-256'};
      var usages = ['sign', 'verify'];
      return crypto.subtle.deriveKey(params, pwKey, alg, false, usages);
    }

  };

  function encode(str) {
    return new TextEncoder('utf-8').encode(str);
  }

  return PassPhrase;

});

/**
 * Auth panels (login/register/change passphrase).
 *
 * @module AuthPanel
 * @return {Object}
 */
define('rpp/auth',[
  'panels',
  'rpp/passphrase',
  'shared/settings_listener'
],

function(panels, PassPhrase, SettingsListener) {


  function AuthPanel() {
    this.passphrase;
    this.lsPasscode = false;
    this.lsPasscodeEnabled = false;
    this.simcards = null;
  }

  AuthPanel.prototype = {

    /**
     * Initialize RPP panel and all its sections
     *
     * @method init
     * @constructor
     */
    init: function() {
      this.mainPanel = document.getElementById('rpp-main');
      this.changePanel = document.getElementById('rpp-change-pass');
      this.loginForm = document.getElementById('rpp-login-form');
      this.registerForm = document.getElementById('rpp-register-form');
      this.changeForm = document.getElementById('rpp-change-pass-form');

      this.passphrase = new PassPhrase('rppmac', 'rppsalt');

      // Define first time use to eventualy show register page
      this.defineFTU();
      this.getSIMCards();

      this.observers();
      this.events();
    },

    events: function() {
      // Submit events
      this.loginForm.addEventListener('submit',
        this.loginUser.bind(this));
      this.registerForm.addEventListener('submit',
        this.registerUser.bind(this));
      this.changeForm.addEventListener('submit',
        this.changePassphrase.bind(this));

      // On show events
      this.mainPanel.addEventListener('pagerendered', function() {
        this.clearLoginForm();
        this.clearRegisterForm();
      }.bind(this));
      this.changePanel.addEventListener('pagerendered', function() {
        this.clearChangeForm();
      }.bind(this));

      this.changeForm.querySelector('.pin-type').addEventListener('change',
        this.onPinTypeChange.bind(this));
    },

    observers: function() {
      SettingsListener.observe('lockscreen.passcode-lock.code', false,
        function(value) {
          this.lsPasscode = value;
        }.bind(this)
      );

      SettingsListener.observe('lockscreen.passcode-lock.enabled', false,
        function(value) {
          this.lsPasscodeEnabled = value;

          // Each time user decides to disable passcode, show him that he can't
          // use rpp features.
          this.toggleAlertBox();
          this.fillChangeOptions();
          this.changePanel.querySelector('.pin-type')
            .dispatchEvent(new Event('change'));
        }.bind(this)
      );
    },

    /**
     * Defines whenever we can login to rpp setting or do we need to register
     * new passphrase.
     *
     * @method defineFTU
     */
    defineFTU: function() {
      this.passphrase.exists().then(function(status) {
        this.mainPanel.dataset.loginBox = status;
      }.bind(this));
    },

    /**
     * [getSIMStatus description]
     * @return {[type]} [description]
     */
    getSIMCards: function() {
      var mc = navigator.mozMobileConnections;

      if (!mc) {
        return;
      }

      [].forEach.call(mc, function(connection, key) {
        var icc, label;
        if (connection.iccId) {
          icc = navigator.mozIccManager.getIccById(connection.iccId);
          if (icc.cardState === 'ready') {
            label = 'SIM ' + (key + 1);
            this.simcards = this.simcards ? this.simcards : {};
            this.simcards[label] = icc;
          }
        }
      }.bind(this));
    },

    fillChangeOptions: function() {
      var element, select = this.changePanel.querySelector('.pin-type');
      select.innerHTML = '';

      for (var simcard in this.simcards) {
        if (this.simcards.hasOwnProperty(simcard)) {
          element = document.createElement('option');
          element.value = simcard;
          element.textContent = simcard;

          var simcardL10n = simcard.toLowerCase().replace(' ', '');
          element.setAttribute('data-l10n-id', simcardL10n);
          select.appendChild(element);
        }
      }

      if (this.lsPasscodeEnabled) {
        element = document.createElement('option');
        element.value = 'passcode';
        element.setAttribute('data-l10n-id', 'passcode');
        select.appendChild(element);
      }
    },

    onPinTypeChange: function(event) {
      var value = event.target.value.toString();
      var input = this.changeForm.querySelector('.pin');

      value = 'enter-' + value.toLowerCase().replace(' ', '');
      input.setAttribute('data-l10n-id', value);
    },

    /**
     * Compares and validates two strings. Returns error strings.
     *
     * @param  {String} pass1 First password
     * @param  {String} pass2 Second password
     * @return {String}       Empty string when success
     */
    comparePasswords: function(pass1, pass2) {
      var rgx = /^([a-z0-9]+)$/i;

      if (!pass1) {
        return 'passphrase-empty';
      }

      if (pass1.length > 100) {
        return 'passphrase-too-long';
      }

      if (!rgx.test(pass1)) {
        return 'passphrase-invalid';
      }

      if (pass1 !== pass2) {
        return 'passphrase-different';
      }

      return '';
    },

    /**
     * Compares and validates two strings. Returns error strings.
     *
     * @param  {String} pass1 First password
     * @param  {String} pass2 Second password
     * @return {String}       Empty string when success
     */
    comparePINs: function(pass1, pass2) {
      var rgx = /^([0-9]{1,4})$/i;

      if (!pass1) {
        return 'pin-empty';
      }

      if (!rgx.test(pass1)) {
        return 'pin-invalid';
      }

      if (pass1 !== pass2) {
        return 'pin-different';
      }

      return '';
    },

    /**
     * Register new user so he can use all rpp features.
     *
     * @method registerUser
     * @param {Object} event JavaScript event
     */
    registerUser: function(event) {
      var form    = this.registerForm;
      var pass1   = form.querySelector('.pass1').value;
      var pass2   = form.querySelector('.pass2').value;
      var message = form.querySelector('.validation-message');
      var error;

      event.preventDefault();

      error = this.comparePasswords(pass1, pass2);
      if (error) {
        message.setAttribute('data-l10n-id', error);
        return;
      }

      this.passphrase.change(pass1).then(function() {
        panels.show({ id: 'rpp-features' });
        this.defineFTU();
      }.bind(this));
    },

    /**
     * Clear form and validation messages
     *
     * @method clearRegisterForm
     */
    clearRegisterForm: function() {
      var form    = this.registerForm;
      var message = form.querySelector('.validation-message');

      form.reset();
      message.textContent = '';
    },

    /**
     * Login user to rpp panel
     *
     * @method loginUser
     * @param {Object} event JavaScript event
     */
    loginUser: function(event) {
      var form    = this.loginForm;
      var pass    = form.querySelector('.pass1').value;
      var message = form.querySelector('.validation-message');

      event.preventDefault();

      this.passphrase.verify(pass).then(function(status) {
        if (!status) {
          message.setAttribute('data-l10n-id', 'passphrase-wrong');
          return;
        }

        panels.show({ id: 'rpp-features' });
      }.bind(this));
    },

    /**
     * Clear form and validation messages
     *
     * @method clearLoginForm
     */
    clearLoginForm: function() {
      var form    = this.loginForm;
      var message = form.querySelector('.validation-message');

      form.reset();
      message.textContent = '';
    },

    /**
     * Change passphrase.
     *
     * @method changePassphrase
     * @param {Object} event JavaScript event
     */
    changePassphrase: function(event) {
      var form    = this.changeForm;
      var pin     = form.querySelector('.pin').value;
      var pass1   = form.querySelector('.pass1').value;
      var pass2   = form.querySelector('.pass2').value;
      var type    = form.querySelector('.pin-type').value;
      var passmsg = form.querySelector('.validation-message');
      var pinmsg  = form.querySelector('.pin-validation-message');
      var passError;

      event.preventDefault();

      passmsg.textContent = '';
      pinmsg.textContent = '';

      var resultCallback = function(pinError) {
        if (pinError) {
          pinmsg.setAttribute('data-l10n-id', pinError);
          return;
        }

        passError = this.comparePasswords(pass1, pass2);
        if (passError) {
          passmsg.setAttribute('data-l10n-id', passError);
          return;
        }

        this.passphrase.change(pass1).then(function() {
          panels.show({ id: 'rpp-features' });
        });
      }.bind(this);

      if (type === 'passcode') {
        this.verifyPassCode(pin, resultCallback);
      } else {
        this.verifySIMPIN(this.simcards[type], pin, resultCallback);
      }
    },

    verifySIMPIN: function(simcard, pin, callback) {
      var unlock = simcard.unlockCardLock({ lockType : 'pin', pin: pin });
      unlock.onsuccess = callback.bind(this, '');
      unlock.onerror = callback.bind(this, 'sim-invalid');
    },

    verifyPassCode: function(pin, callback) {
      var status = this.comparePINs(pin, this.lsPasscode);
      callback = callback || function() {};

      callback(status);
    },

    /**
     * Clear form and validation messages
     *
     * @method clearChangeForm
     */
    clearChangeForm: function() {
      var form    = this.changeForm;
      var passmsg = form.querySelector('.validation-message');
      var pinmsg  = form.querySelector('.pin-validation-message');

      form.reset();
      passmsg.textContent = '';
      pinmsg.textContent = '';
    },

    /**
     * Toggle alert box, show it when user doesn't have passcode enabled
     *
     * @method toggleAlertBox
     */
    toggleAlertBox: function() {
      var modal = document.querySelector('#rpp-features .overlay');

      if (this.lsPasscodeEnabled) {
        modal.setAttribute('hidden', 'hidden');
      } else {
        modal.removeAttribute('hidden');
      }
    }

  };

  return new AuthPanel();

});

/**
 * Auth panels (login/register/change passphrase).
 *
 * @module ScreenLockPanel
 * @return {Object}
 */
define('rpp/screenlock',[
  'panels',
  'shared/settings_listener',
],

function(panels, SettingsListener) {


  function ScreenLockPanel() {}

  ScreenLockPanel.prototype = {

    _settings: {
      passcodeEnabled: false,
      lockscreenEnabled: false
    },

    init: function() {
      this.panel = document.getElementById('rpp-screenlock');

      this._getAllElements();
      this.passcodeEnable.addEventListener('click', this);
      this.lockscreenEnable.addEventListener('click', this);
      this.passcodeEditButton.addEventListener('click', this);
      this._fetchSettings();
    },

    _getAllElements: function sl_getAllElements() {
      this.screenlockPanel = this.panel;
      this.lockscreenEnable = this.panel.querySelector('.lockscreen-enable');
      this.passcodeEnable = this.panel.querySelector('.passcode-enable');
      this.passcodeEditButton = this.panel.querySelector('.passcode-edit');
    },

    _fetchSettings: function sl_fetchSettings() {
      SettingsListener.observe('lockscreen.enabled', false,
        function(enabled) {
          this._toggleLockscreen(enabled);
      }.bind(this));

      SettingsListener.observe('lockscreen.passcode-lock.enabled', false,
        function(enabled) {
          this._togglePasscode(enabled);
      }.bind(this));
    },

    _togglePasscode: function sl_togglePasscode(enabled) {
      this._settings.passcodeEnabled = enabled;
      this.screenlockPanel.dataset.passcodeEnabled = enabled;
      this.passcodeEnable.checked = enabled;
    },

    _toggleLockscreen: function sl_toggleLockscreen(enabled) {
      this._settings.lockscreenEnabled = enabled;
      this.screenlockPanel.dataset.lockscreenEnabled = enabled;
      this.lockscreenEnable.checked = enabled;
    },

    _showDialog: function sl_showDialog(mode) {
      panels.show({ id: 'rpp-passcode', options: mode });
    },

    handleEvent: function sl_handleEvent(evt) {
      switch (evt.target) {
        case this.passcodeEnable:
          evt.preventDefault();
          if (this._settings.passcodeEnabled) {
            this._showDialog('confirm');
          } else {
            this._showDialog('create');
          }
          break;
        case this.lockscreenEnable:
          if (this._settings.lockscreenEnabled === true &&
            this._settings.passcodeEnabled === true) {
            evt.preventDefault();
            this._showDialog('confirmLock');
          }
          break;
        case this.passcodeEditButton:
          this._showDialog('edit');
          break;
      }
    }

  };

  return new ScreenLockPanel();

});

/**
 * PassCode panel.
 *
 * @module PassCodePanel
 * @return {Object}
 */
define('rpp/passcode',[
  'panels',
  'shared/settings_listener',
],

function(panels, SettingsListener) {


  function PassCodePanel() {}

  PassCodePanel.prototype = {

    panel: null,

    /**
     * create  : when the user turns on passcode settings
     * edit    : when the user presses edit passcode button
     * confirm : when the user turns off passcode settings
     * new     : when the user is editing passcode
     *                and has entered old passcode successfully
     */
    _MODE: 'create',

    _settings: {
      passcode: '0000'
    },

    _checkingLength: {
      'create': 8,
      'new': 8,
      'edit': 4,
      'confirm': 4,
      'confirmLock': 4
    },

    _passcodeBuffer: '',

    init: function() {
      this.panel = document.getElementById('rpp-passcode');
      this._getAllElements();
      this.passcodeInput.addEventListener('keypress', this);
      this.createPasscodeButton.addEventListener('click', this);
      this.changePasscodeButton.addEventListener('click', this);

      // If the pseudo-input loses focus, then allow the user to restore focus
      // by touching the container around the pseudo-input.
      this.passcodeContainer.addEventListener('click', function(evt) {
        this.passcodeInput.focus();
        evt.preventDefault();
      }.bind(this));

      this._fetchSettings();

      this.panel.addEventListener('pagerendered',
        this.onBeforeShow.bind(this));
    },

    /**
     * Re-runs the font-fit title
     * centering logic.
     *
     * The gaia-header has mutation observers
     * that listen for changes in the header
     * title and re-run the font-fit logic.
     *
     * If buttons around the title are shown/hidden
     * then these mutation observers won't be
     * triggered, but we want the font-fit logic
     * to be re-run.
     *
     * This is a deficiency of <gaia-header>. If
     * anyone knows a way to listen for changes
     * in visibility, we won't need this anymore.
     *
     * @param {GaiaHeader} header
     * @private
     */
    runHeaderFontFit: function su_runHeaderFontFit(header) {
      var titles = header.querySelectorAll('h1');
      [].forEach.call(titles, function(title) {
        title.textContent = title.textContent;
      });
    },

    _getAllElements: function sld_getAllElements() {
      this.passcodePanel = this.panel;
      this.header = this.panel.querySelector('header');
      this.passcodeInput = this.panel.querySelector('.passcode-input');
      this.passcodeDigits = this.panel.querySelectorAll('.passcode-digit');
      this.passcodeContainer =
        this.panel.querySelector('.passcode-container');
      this.createPasscodeButton =
        this.panel.querySelector('.passcode-create');
      this.changePasscodeButton =
        this.panel.querySelector('.passcode-change');
    },

    onBeforeShow: function sld_onBeforeShow(event) {
      this._showDialogInMode(event.detail || 'create');
      setTimeout(this.onShow.bind(this), 100);
    },

    onShow: function sld_onShow() {
      this.passcodeInput.focus();
    },

    _showDialogInMode: function sld_showDialogInMode(mode) {
      this._hideErrorMessage();
      this._MODE = mode;
      this.passcodePanel.dataset.mode = mode;
      this._updatePassCodeUI();
      this.runHeaderFontFit(this.header);
    },

    handleEvent: function sld_handleEvent(evt) {
      var settings;
      var passcode;
      var lock;

      switch (evt.target) {
        case this.passcodeInput:
          evt.preventDefault();
          if (this._passcodeBuffer === '') {
            this._hideErrorMessage();
          }

          var code = evt.charCode;
          if (code !== 0 && (code < 0x30 || code > 0x39)) {
            return;
          }

          var key = String.fromCharCode(code);
          if (evt.charCode === 0) {
            if (this._passcodeBuffer.length > 0) {
              this._passcodeBuffer = this._passcodeBuffer.substring(0,
                this._passcodeBuffer.length - 1);
              if (this.passcodePanel.dataset.passcodeStatus === 'success') {
                this._resetPasscodeStatus();
              }
            }
          } else if (this._passcodeBuffer.length < 8) {
            this._passcodeBuffer += key;
          }

          this._updatePassCodeUI();
          this._enablePasscode();
          break;
        case this.createPasscodeButton:
        case this.changePasscodeButton:
          evt.stopPropagation();
          if (this.passcodePanel.dataset.passcodeStatus !== 'success') {
            this._showErrorMessage();
            this.passcodeInput.focus();
            return;
          }
          passcode = this._passcodeBuffer.substring(0, 4);
          settings = navigator.mozSettings;
          lock = settings.createLock();
          lock.set({
            'lockscreen.passcode-lock.code': passcode
          });
          lock.set({
            'lockscreen.passcode-lock.enabled': true
          });
          this._backToScreenLock();
          break;
      }
    },

    _enablePasscode: function sld_enablePasscode() {
      var settings;
      var passcode;
      var lock;

      if (this._passcodeBuffer.length === this._checkingLength[this._MODE]) {
        switch (this._MODE) {
          case 'create':
          case 'new':
            passcode = this._passcodeBuffer.substring(0, 4);
            var passcodeToConfirm = this._passcodeBuffer.substring(4, 8);
            if (passcode != passcodeToConfirm) {
              this._passcodeBuffer = '';
              this._showErrorMessage();
            } else {
              this._enableButton();
            }
            break;
          case 'confirm':
            if (this._checkPasscode()) {
              settings = navigator.mozSettings;
              lock = settings.createLock();
              lock.set({
                'lockscreen.passcode-lock.enabled': false
              });
              this._backToScreenLock();
            } else {
              this._passcodeBuffer = '';
            }
            break;
          case 'confirmLock':
            if (this._checkPasscode()) {
              settings = navigator.mozSettings;
              lock = settings.createLock();
              lock.set({
                'lockscreen.enabled': false,
                'lockscreen.passcode-lock.enabled': false
              });
              this._backToScreenLock();
            } else {
              this._passcodeBuffer = '';
            }
            break;
          case 'edit':
            if (this._checkPasscode()) {
              this._passcodeBuffer = '';
              this._updatePassCodeUI();
              this._showDialogInMode('new');
            } else {
              this._passcodeBuffer = '';
            }
            break;
        }
      }
    },

    _fetchSettings: function sld_fetchSettings() {
      SettingsListener.observe('lockscreen.passcode-lock.code', '0000',
        function(passcode) {
          this._settings.passcode = passcode;
      }.bind(this));
    },

    _showErrorMessage: function sld_showErrorMessage(message) {
      this.passcodePanel.dataset.passcodeStatus = 'error';
    },

    _hideErrorMessage: function sld_hideErrorMessage() {
      this.passcodePanel.dataset.passcodeStatus = '';
    },

    _resetPasscodeStatus: function sld_resetPasscodeStatus() {
      this.passcodePanel.dataset.passcodeStatus = '';
    },

    _enableButton: function sld_enableButton() {
      this.passcodePanel.dataset.passcodeStatus = 'success';
    },

    _updatePassCodeUI: function sld_updatePassCodeUI() {
      for (var i = 0; i < 8; i++) {
        if (i < this._passcodeBuffer.length) {
          this.passcodeDigits[i].dataset.dot = true;
        } else {
          delete this.passcodeDigits[i].dataset.dot;
        }
      }
    },

    _checkPasscode: function sld_checkPasscode() {
      if (this._settings.passcode != this._passcodeBuffer) {
        this._showErrorMessage();
        return false;
      } else {
        this._hideErrorMessage();
        return true;
      }
    },

    _backToScreenLock: function sld_backToScreenLock() {
      this._passcodeBuffer = '';
      this.passcodeInput.blur();
      panels.show({ id: 'rpp-screenlock', back: true });
    }

  };

  return new PassCodePanel();

});

/**
 * Remote Privacy Protection panel.
 *
 * @module RppPanel
 * @return {Object}
 */
define('rpp/main',[
  'rpp/auth',
  'rpp/screenlock',
  'rpp/passcode',
],

function(rppAuth, rppScreenLock, rppPassCode) {


  function RppPanel() {}

  RppPanel.prototype = {

    /**
     * Initialize RPP panel and all its sections
     *
     * @method init
     * @constructor
     */
    init: function() {
      rppAuth.init();
      rppScreenLock.init();
      rppPassCode.init();
    }

  };

  return new RppPanel();

});

/**
 * App Details panel: list all permissions for the current application.
 *
 * @module TcAppDetailsPanel
 * @return {Object}
 */

define('tc/app_details',[], function() {


  var _debug = false; // display the manifest 'permissions' object

  var _panel = null;
  var _explicitPermContainer = null;
  var _implicitPermContainer = null;

  var _currentApp = null;


  /**
   * Helper object for the app_permissions subpanel.
   *
   * @constructor
   */
  function TcAppDetailsPanel() {}

  TcAppDetailsPanel.prototype = {

    /**
     * Initialize the App Permissions panel.
     *
     * @method init
     */
    init: function init(permissionTable) {
      _panel = document.getElementById('tc-appDetails');
      _panel.addEventListener('pagerendered', event =>
          this.renderAppDetails(event.detail));

      _explicitPermContainer = document.getElementById('tc-perm-explicit');
      _implicitPermContainer = document.getElementById('tc-perm-implicit');

      // re-order the permission list
      window.addEventListener('localized', function tcAppPanelLangChange() {
        this.renderPermDetails(_currentApp);
      }.bind(this));

      // in case some explicit permissions have been changed in the Settings app
      window.addEventListener('visibilitychange', function tcAppPanelVis() {
        if (!document.hidden) {
          this.renderAppDetails(_currentApp);
        }
      }.bind(this));
    },

    /**
     * Render the App Permissions panel.
     *
     * @method renderAppDetails
     * @param {DOMApplication} app
     */
    renderAppDetails: function renderAppDetails(app) {
      if (!app) {
        return;
      }

      _currentApp = app; // in case we need to refresh this panel
      _panel.querySelector('h1').textContent = app.name;

      if (_debug) {
        _panel.querySelector('.debug').hidden = false;
        _panel.querySelector('.debug pre').textContent =
          '    origin: ' + app.origin + '\n' +
          JSON.stringify(app.manifest.permissions, null, 4);
      }

      var appInfo = _panel.querySelector('.app-info a');
      appInfo.querySelector('img').src = app.iconURL;
      appInfo.querySelector('span').textContent = app.name;

      var explicit = [];
      var implicit = [];
      app.permissions.forEach(perm => {
        if (perm.explicit) {
          explicit.push(perm);
        } else {
          implicit.push(perm);
        }
      });
      this._showPermissionList(_explicitPermContainer, explicit);
      this._showPermissionList(_implicitPermContainer, implicit);
    },

    _showPermissionList: function _showPermissionList(container, permissions) {
      container.hidden = true;
      if (!permissions.length) {
        return;
      }

      var list = container.querySelector('.permission-list');
      list.innerHTML = '';

      permissions.forEach(perm => {
        var item = document.createElement('li');
        var link = document.createElement('a');
        var name = document.createElement('span');
        name.textContent = perm.name;
        link.appendChild(name);

        // Note: the value is always 'allow' for non-explicit permissions
        if (perm.explicit) {
          var value = document.createElement('span');
          value.setAttribute('data-l10n-id', 'tc-explicit-' + perm.value);
          link.appendChild(value);
        }

        item.classList.add('perm-info');
        item.dataset.key = perm.key; // Marionette hook
        item.appendChild(link);

        if (perm.desc) {
          var desc = document.createElement('p');
          desc.classList.add('description');
          desc.textContent = perm.desc;
          item.appendChild(desc);
        }
        //////////// Showing user-defined priority //////////////////
        if (localStorage.getItem(perm.key) != null) {
        var priorityValue = document.createElement('p');
        priorityValue.classList.add('description');
        priorityValue.textContent = "Priority: " + localStorage.getItem(perm.key) * 5;
        item.appendChild(priorityValue);
        }
        list.appendChild(item);
      });

      container.hidden = false;
    },

  };

  return new TcAppDetailsPanel();
});

/**
 * Transparency Control -- Application List panel.
 *
 * @module TcApplicationsPanel
 * @return {Object}
 */
define('tc/applications',[
  'panels',
  'app_list',
  'tc/app_details'
],

function(panels, appList, appDetails) {


  var _appListContainer;

  /**
   * TC-Applications panel
   *
   * @constructor
   */
  function TcApplicationsPanel() {}

  TcApplicationsPanel.prototype = {

    /**
     * Initialize the Applications panel and its subpanel
     *
     * @method init
     * @param {Object} permissionTable  List of supported permissions.
     */
    init: function init(permissionTable) {
      _appListContainer = document.getElementById('tc-appList');
      var sortKeySelect = document.getElementById('tc-sortKey');

      var refreshAppList = function refreshAppList() {
        this.renderAppList(sortKeySelect.value);

      }.bind(this);
      sortKeySelect.addEventListener('change', refreshAppList);
      window.addEventListener('applicationinstall', refreshAppList);
      window.addEventListener('applicationuninstall', refreshAppList);

      // some apps might have a localized name in their manifest
      window.addEventListener('localized', refreshAppList);

      appList.init(permissionTable).then(this.renderAppList.bind(this),
          error => console.error(error));

      appDetails.init();
    },

    /**
     * Render the Applications panel.
     *
     * @method renderAppList
     * @param {String} sortKey [optional]  Either 'name', 'trust', 'vendor'.
     */
    renderAppList: function renderAppList(sortKey) {
      this._clear();
      if (!sortKey || sortKey === 'name') {
        // apps are already sorted by name, just display them
        this._showAppList(appList.applications);
        appPermGen();
      }
      else {
        var apps = appList.getSortedApps(sortKey);
        // sorting by headers work because the sort key is either:
        // - a "vendor" name, in which case it makes sense to sort by name
        // - 'certified|privileged|web', which luckily matches the order we want
        Object.keys(apps).sort().forEach(header => {
          var l10nPrefix = (sortKey === 'trust') ? 'tc-trust-' : '';
          this._showAppSeparator(header, l10nPrefix);
          this._showAppList(apps[header], header);
          appPermGen();
        });
      }

      if (sortKey === 'permpriority') {
        // apps are already sorted by name, just display them
        x = 1
      }

    },

    _clear: function _clear() {
      _appListContainer.innerHTML = '';
    },

    _showAppSeparator: function _showAppSeparator(separator, l10nPrefix) {
      if (!separator) {
        return;
      }
      var header = document.createElement('header');
      var title = document.createElement('h2');
      if (l10nPrefix) {
        title.setAttribute('data-l10n-id', l10nPrefix + separator);
      } else { // vendor names don't need any localization
        title.textContent = separator;
      }
      header.appendChild(title);
      _appListContainer.appendChild(header);
    },

    _showAppList: function _showAppList(apps, groupKey) {
      var list = document.createElement('ul');
      if (groupKey) {
        list.dataset.key = groupKey; // Marionette key
      }

      apps.forEach(app => {
        var item = document.createElement('li');
        var link = document.createElement('a');
        var icon = document.createElement('img');
        var name = document.createElement('span');

        icon.src = app.iconURL;
        name.textContent = app.name;
        link.classList.add('menu-item');
        link.appendChild(icon);
        link.appendChild(name);
        link.addEventListener('click', function showAppDetails() {
          panels.show({ id: 'tc-appDetails', options: app });
        });

        item.classList.add('app-element');
        item.dataset.key = app.name; // Marionette hook
        item.appendChild(link);

        list.appendChild(item);
      });

      _appListContainer.appendChild(list);
    }

  };

  return new TcApplicationsPanel();
});

/**
 * Permission Details panel: list all applications for the current permission.
 *
 * @module TcPermDetailsPanel
 * @return {Object}
 */
define('tc/perm_details',['app_list', 'tc/perm_priority_slider'], function(appList, PermPrioritySlider) {


  var _panel = null;
  var _permInfo = null;
  var _permApps = null;
  var _permGroup = null;

  var _currentPerm = null;
  var prioritySlider = null; 

  /**
   * Helper object for the perm_applications subpanel.
   *
   * @constructor
   */
  function TcPermDetailsPanel() { this.prioritySlider = new PermPrioritySlider(); } 

  TcPermDetailsPanel.prototype = {

    /**
     * Initialize the Permission Details panel.
     *
     * @method init
     */
    init: function init() {
      _panel = document.getElementById('tc-permDetails');
      _panel.addEventListener('pagerendered',
          event => this.renderPermDetails(event.detail));

      _permInfo = _panel.querySelector('.perm-info');
      _permApps = _panel.querySelector('.app-list');
      _permGroup = _panel.querySelector('.permission-group');

            //initialize blur slider element
      /*SettingsHelper('geolocation.blur.slider', 1).get(function(value) {
        this.blurSlider.init(
          this.panel.querySelector('.type-blur'),
          value,
          function(value) {
            SettingsHelper('geolocation.approx_distance').set(value);
          }.bind(this)
        );
      }.bind(this));
      */
      
      ///////////////////////initializing .... ////////////////////
      this.prioritySlider.init(
          _panel.querySelector('.type-blur'),
          1,
          function(value) {
            this.prioritySlider.getValue();
          }.bind(this)
        );
      //////////////////////////////////////////////////////////
      
      window.addEventListener('localized', function tcPermDetailsLangChange() {
        this.renderPermDetails(_currentPerm);
      }.bind(this));

      // in case some explicit permissions have been changed in the Settings app
      window.addEventListener('visibilitychange', function tcPermDetailsVis() {
        if (!document.hidden) {
          this.renderPermDetails(_currentPerm);
        }
      }.bind(this));
    },

    /**
     * Render the Permission Details panel.
     *
     * @method renderPermDetails
     * @param {Object} perm
     */
    renderPermDetails: function renderPermDetails(perm) {
      if (!perm) {
        return;
      }

      _currentPerm = perm; // in case we need to refresh this panel
      _panel.querySelector('h1').textContent = perm.name;
      
      /////////////// updating the priority slider for each permission /////////////////
      var slider = this.prioritySlider; 
      var sliderValue = localStorage.getItem(perm.key);
      //console.log(sliderValue);
      if(sliderValue > 0) {
    	  slider.setValue(sliderValue);
      }else { 
    	  slider.setValue("0");
      }
      //////////////////////////////////  //////////////////////////////////////////
      
      _permInfo.querySelector('span').textContent = perm.name;
      _permInfo.querySelector('p').textContent = perm.desc;

      var apps = appList.getFilteredApps(perm.key);
      _permGroup.hidden = !apps.length;

      _permApps.innerHTML = '';
      apps.forEach(app => {
        var item = document.createElement('li');
        var link = document.createElement('a');
        var icon = document.createElement('img');
        var name = document.createElement('span');

        icon.src = app.iconURL;
        name.textContent = app.name;

        link.classList.add('menu-item');
        link.appendChild(icon);
        link.appendChild(name);

        item.classList.add('app-element');
        item.classList.add('app-info'); // hide the menu arrow
        item.dataset.key = app.name; // Marionette hook
        item.appendChild(link);

        _permApps.appendChild(item);
      });
    }

  };

  return new TcPermDetailsPanel();
});

/**
 * Transparency Control -- Permissions List panel.
 *
 * @module TcPermissionsPanel
 * @return {Object}
 */
define('tc/permissions',[
  'panels',
  'app_list',
  'tc/perm_details'
],

function(panels, appList, permDetails) {


  var _permListContainer;

  /**
   * TC-Permissions panel
   *
   * @constructor
   */
  function TcPermissionsPanel() {}

  TcPermissionsPanel.prototype = {

    /**
     * Initialize the Permissions panel and its subpanel
     *
     * @method init
     * @param {Object} permissionTable  List of supported permissions.
     */
    init: function init(permissionTable) {
      _permListContainer = document.getElementById('tc-permList');
      var sortingKeySelect = document.getElementById('tc-sortingKey');
//////////// Priotiy Threshold select /////////////////////////////////
      PrioritySelect = document.querySelector('.priorityselect');
      PrioritySelect.onchange = function(){ 
        PriorityValue = PrioritySelect.selectedOptions[0].value;
        PrioritySelectedDOM = PrioritySelect.selectedIndex;
        localStorage.setItem("PriorityThreshold", PriorityValue);
        localStorage.setItem("PrioritySelectedDOM", PrioritySelectedDOM);
      };

      if(localStorage.getItem("PrioritySelectedDOM") == null){
        PrioritySelect.selectedIndex = 0;
      } else {
        PrioritySelect.selectedIndex = localStorage.getItem("PrioritySelectedDOM");
      }//////////////////////////////////////////////////////////////////////

      var refreshPermList = function refreshPermList() {
          this.renderPermissionList("name");
        }.bind(this);
      sortingKeySelect.addEventListener('change', refreshPermList);
      window.addEventListener('applicationinstall', refreshPermList);
      window.addEventListener('applicationuninstall', refreshPermList);
   // some permissions might have a localized name in their manifest
      window.addEventListener('localized', refreshPermList);

      appList.init(permissionTable).then(this.renderPermissionList.bind(this),
          error => console.error(error));

      permDetails.init();

      // in case some explicit permissions have been changed in the Settings app
      window.addEventListener('visibilitychange', function tcPermPanelVis() {
        if (!document.hidden) {
          this.renderPermissionList();
        }
      }.bind(this));

      // when the language is changed, permissions must be re-ordered
      window.addEventListener('localized',
          this.renderPermissionList.bind(this));
    },

    /**
     * Render the Permissions panel.
     *
     * @method renderAppList
     * @param {String} sortKey [optional]  Either 'name', 'trust', 'vendor'.
     */
    renderPermissionList: function renderPermissionList(sortKey) {
      //_permListContainer.innerHTML = '';
    	this._clear();
        if (!sortKey || sortKey === 'name') {
          // apps are already sorted by name, just display them
          this._showPermList(appList.permissions);
        }
        else {
          var perms = appList.getSortedPerms(sortKey);
          // sorting by headers work because the sort key is either:
          // - a "vendor" name, in which case it makes sense to sort by name
          // - 'certified|privileged|web', which luckily matches the order we want
          Object.keys(apps).sort().forEach(header => {
            var l10nPrefix = (sortKey === 'trust') ? 'tc-trust-' : '';
            this._showPermSeparator(header, l10nPrefix);
            this._showPermList(perms[header], header);
          });
        }
      },

    _clear: function _clear() {
        _permListContainer.innerHTML = '';
      },

    _showPermSeparator: function _showPermSeparator(separator, l10nPrefix) {
        if (!separator) {
          return;
        }
        var header = document.createElement('header');
        var title = document.createElement('h2');
        if (l10nPrefix) {
          title.setAttribute('data-l10n-id', l10nPrefix + separator);
        } else { // vendor names don't need any localization
          title.textContent = separator;
        }
        header.appendChild(title);
        _permListContainer.appendChild(header);
      },

    _showPermList: function _showPermList(apps, groupKey){
      var list = document.createElement('ul');
      if (groupKey){
    	  list.dataset.key = groupKey; // Marionette Key
      }
      appList.permissions.forEach(perm => {
        var item = document.createElement('li');
        var link = document.createElement('a');
        var name = document.createElement('span');

        name.textContent = perm.name;
        link.dataset.key = perm.key; // easy Marionette hook
        link.appendChild(name);
        link.classList.add('menu-item');
        link.classList.add('panel-link');
        link.addEventListener('click', function showAppDetails() {
          panels.show({ id: 'tc-permDetails', options: perm });
		
          //////////////priority slider for permissions///////////////////////////////////////////
          document.querySelector('input.perm-slider').setAttribute("data-permname", perm.key);
          //console.log(document.querySelector('input.perm-slider').getAttribute("data-permname"));
		  document.querySelector('input.perm-slider').max = "20";		
		  document.querySelector('p.perm-label').innerHTML = (localStorage.getItem(perm.key) * 5);
		  ///////////////////////////////////////////////////////////////////////////////////////////////////
        });

        item.appendChild(link);
        list.appendChild(item);
      });

      _permListContainer.appendChild(list);
    }

  };

  return new TcPermissionsPanel();
});

/**
 * Transparency Control panel.
 *
 * @module TcPanel
 * @return {Object}
 */
define('tc/main',[
  'panels',
  'tc/applications',
  'tc/permissions'
],

function(panels, applicationsPanel, permissionsPanel) {


  /**
   * Transparency Control panel.
   *
   * @constructor
   */
  function TcPanel() {}

  TcPanel.prototype = {

    /**
     * Initialize the Transparency Control panel and its sub-panels.
     *
     * @method init
     */
    init: function init() {
      panels.loadJSON('resources/permissions_table.json', data => {
        applicationsPanel.init(data);
        permissionsPanel.init(data);
      });
    }

  };

  return new TcPanel();
});

/**
 * Command module to handle lock, ring, locate features.
 *
 * @module Commands
 * @return {Object}
 */
define('sms/commands',[
  'shared/settings_listener',
  'shared/settings_helper',
  'shared/settings_url'
],

function(SettingsListener, SettingsHelper, SettingsURL) {


  var Commands = {
    TRACK_UPDATE_INTERVAL_MS: 10000,

    _ringer: null,

    _lockscreenEnabled: false,

    _lockscreenPassCodeEnabled: false,

    _geolocationEnabled: false,

    init: function fmdc_init() {
      var ringer = this._ringer = new Audio();
      ringer.mozAudioChannelType = 'ringer';
      ringer.loop = true;

      var ringtoneURL = new SettingsURL();
      SettingsListener.observe('dialer.ringtone', '', function(value) {
        var ringing = !ringer.paused;

        ringer.pause();
        ringer.src = ringtoneURL.set(value);
        if (ringing) {
          ringer.play();
        }
      });

      var self = this;
      SettingsListener.observe('lockscreen.enabled', false, function(value) {
        self._lockscreenEnabled = value;
      });

      SettingsListener.observe('lockscreen.passcode-lock.enabled', false,
        function(value) {
          self._lockscreenPassCodeEnabled = value;
        }
      );

      SettingsListener.observe('geolocation.enabled', false, function(value) {
        self._geolocationEnabled = value;
      });
    },

    invokeCommand: function fmdc_get_command(name, args) {
      this._commands[name].apply(this, args);
    },

    deviceHasPasscode: function fmdc_device_has_passcode() {
      return !!(this._lockscreenEnabled && this._lockscreenPassCodeEnabled);
    },

    _ringTimeoutId: null,

    _commands: {
      locate: function fmdc_track(duration, reply) {
        var options = {
          enableHighAccuracy: true,
          timeout: duration * 1000,
          maximumAge: 0
        };

        reply = reply || function() {};

        function success(position) {
          reply(true, position);
        }

        function error(err) {
          reply(false, err.message);
        }

        navigator.geolocation.getCurrentPosition(success, error, options);
      },

      lock: function fmdc_lock(message, passcode, reply) {
        var settings = {
          'lockscreen.enabled': true,
          'lockscreen.passcode-lock.enabled': true,
          'lockscreen.lock-immediately': true
        };

        if (message) {
          settings['lockscreen.lock-message'] = message;
        }

        if (!this.deviceHasPasscode() && passcode) {
          settings['lockscreen.passcode-lock.code'] = passcode;
        }

        var request = SettingsListener.getSettingsLock().set(settings);
        request.onsuccess = function() {
          reply(true);
        };

        request.onerror = function() {
          reply(false, 'failed to set settings');
        };
      },

      ring: function fmdc_ring(duration, reply) {
        var ringer = this._ringer;

        var stop = function() {
          ringer.pause();
          ringer.currentTime = 0;
          clearTimeout(this._ringTimeoutId);
          this._ringTimeoutId = null;
        }.bind(this);

        var ringing = !ringer.paused || this._ringTimeoutId !== null;
        if (ringing || duration === 0) {
          if (ringing && duration === 0) {
            stop();
          }

          if (reply) {
            reply(true);
          }
          return;
        }

        var request = SettingsListener.getSettingsLock().set({
          // hard-coded max volume taken from
          // https://wiki.mozilla.org/WebAPI/AudioChannels
          'audio.volume.notification': 15
        });

        request.onsuccess = function() {
          ringer.play();
          reply(true);
        };

        request.onerror = function() {
          reply(false, 'failed to set volume');
        };

        this._ringTimeoutId = setTimeout(stop, duration * 1000);
      }
    }
  };

  return Commands;

});

/**
 * Command module to handle lock, ring, locate features.
 *
 * @module RPPExecuteCommands
 * @return {Object}
 */
define('sms/main',[
  'sms/commands',
  'rpp/passphrase',
  'shared/settings_listener',
  'shared/settings_helper'
],

function(Commands, PassPhrase, SettingsListener, SettingsHelper) {


  const RING_ENABLED = 'rpp.ring.enabled';
  const LOCK_ENABLED = 'rpp.lock.enabled';
  const LOCATE_ENABLED = 'rpp.locate.enabled';
  const PASSCODE_ENABLED = 'lockscreen.passcode-lock.enabled';
  const LOCKSCREEN_ENABLED = 'lockscreen.enabled';
  const LOCKSCREEN_LOCKED = 'lockscreen.locked';

  var RPPExecuteCommands = {

    _ringEnabled: false,
    _lockEnabled: false,
    _locateEnabled: false,
    _passcodeEnabled : false,
    _lockscreenEnabled : false,

    init: function() {
      Commands.init();
      this.passphrase = new PassPhrase('rppmac', 'rppsalt');

      this.observers();
      this.events();
    },

    observers: function() {
      SettingsListener.observe(LOCKSCREEN_ENABLED, false, value => {
        this._lockscreenEnabled = value;
      });

      SettingsListener.observe(PASSCODE_ENABLED, false, value => {
        this._passcodeEnabled = value;
      });

      SettingsListener.observe(RING_ENABLED, false, value => {
        this._ringEnabled = value;
      });

      SettingsListener.observe(LOCK_ENABLED, false, value => {
        this._lockEnabled = value;
      });

      SettingsListener.observe(LOCATE_ENABLED, false, value => {
        this._locateEnabled = value;
      });

      SettingsListener.observe(LOCKSCREEN_LOCKED, false, value => {
        if (!value) {
          Commands.invokeCommand('ring', [0]);
        }
      });
    },

    events: function() {
      navigator.mozSetMessageHandler('sms-received',
        this._onSMSReceived.bind(this));
    },

    /**
     * Search for RPP commands and execute them.
     *
     * @param {Object} event Object recieved from SMS listener event 'recieved'
     */
    _onSMSReceived: function(event) {
      var match, cmd, passkey, body = event.body,
          rgx = /^rpp\s(lock|ring|locate)\s([a-z0-9]{1,100})$/i,
          sender = event.sender;

      // If there is no passcode, do nothing.
      if (!this._passcodeEnabled || !this._lockscreenEnabled) {
        return;
      }

      match = body.match(rgx);

      if (match) {
        cmd = match[1];
        passkey = match[2];

        this.passphrase.verify(passkey).then(function(status) {
          if (!status) {
            return;
          }

          switch(cmd.toLowerCase()) {
            case 'lock':
              this._lock(sender);
              break;
            case 'ring':
              this._ring(sender);
              break;
            case 'locate':
              this._locate(sender);
              break;
            default:
              break;
          }
        }.bind(this));
      }
    },

    _sendSMS : function(number, messageL10n) {
      var message;
      if (typeof(messageL10n) === 'string') {
        message = navigator.mozL10n.get(messageL10n);
      } else if (messageL10n.id) {
        message = navigator.mozL10n.get(messageL10n.id, messageL10n.args);
      } else {
        return;
      }

      if (navigator.mozMobileMessage) {
        navigator.mozMobileMessage.send(number, message);
      }
    },

    /**
     * Remotely rings the device
     *
     * @param  {Number} number Phone number
     */
    _ring : function(number) {
      if (!this._ringEnabled) {
        return;
      }

      var ringReply = function(res, err) {
        if (!res) {
          console.warn('Error while trying to ring a phone, ' + err);
          return;
        }

        this._sendSMS(number, 'sms-ring');

        // Lock phone
        setTimeout(function() {
          this._doLock(number);
        }.bind(this), 3000);
      }.bind(this);

      Commands.invokeCommand('ring', [600, ringReply]);
    },

    /**
     * Remotely locks the screen
     *
     * @param  {Number} number Phone number
     */
    _lock : function(number) {
      if (!this._lockEnabled) {
        return;
      }

      var lockReply = function(status, result) {
        if (!status) {
          console.warn('Error while trying to lock a phone, ' + result);
          return;
        }
        this._sendSMS(number, 'sms-lock');
      }.bind(this);

      // Lock screen
      this._doLock(number, lockReply);
    },

    /**
     * Remotely locates device and sends back reply SMS.
     *
     * @param  {Number} number Phone number
     */
    _locate : function(number) {
      if (!this._locateEnabled) {
        return;
      }

      var locateReply = function(status, result) {
        if (!status) {
          console.warn('Error while trying to locate a phone: ' + result);
        }
	else {
          this._sendSMS(number, {
            id: 'sms-locate',
            args: {
              latitude: result.coords.latitude,
              longitude: result.coords.longitude
            }
          });
        }
        // Lock phone
        setTimeout(function() {
          this._doLock(number);
        }.bind(this), 3000);
      }.bind(this);

      Commands.invokeCommand('locate', [10, locateReply]);
    },

    /**
     * Perform lockscreen
     *
     * @param  {Number} number Phone number
     */
    _doLock : function(number, reply) {
      reply = reply || function() {};
      Commands.invokeCommand('lock', [null, null, reply]);
    }

  };

  return RPPExecuteCommands;

});



require.config({
  baseUrl: '/js',
  paths: {
    'shared': '../shared/js'
  },
  shim: {
    'shared/lazy_loader': {
      exports: 'LazyLoader'
    },
    'shared/settings_listener': {
      exports: 'SettingsListener'
    },
    'shared/settings_helper': {
      exports: 'SettingsHelper'
    },
    'shared/settings_url': {
      exports: 'SettingsURL'
    },
    'shared/async_storage': {
      exports: 'asyncStorage'
    },
    'shared/l10n': {
      exports: 'navigator.mozL10n'
    }
  }
});

(function() {
  var ppFTU = navigator.mozSettings.createLock()
    .get('privacy-panel-gt-complete');
  ppFTU.onsuccess = function() {
    var ftu = ppFTU.result['privacy-panel-gt-complete'];

    if (!ftu) {
      var rootPanel = document.getElementById('root');
      rootPanel.classList.remove('current');
      rootPanel.classList.add('previous');
      document.getElementById('gt-main').classList.add('current');

      navigator.mozSettings.createLock().set({
        'privacy-panel-gt-complete': true
      });
    }
  };
})();

require([
  'panels',
  'root/main',
  'about/main',
  'shared/l10n'
],

function(panels, root, about) {
  root.init();

  // load all templates for guided tour sections
  panels.load('gt');
  panels.load('about', function() {
    about.init();
  });

  require([
    'ala/main',
    'rpp/main',
    'tc/main',
    'sms/main'
  ],

  function(ala, rpp, tc, commands) {
    // load all templates for location accuracy sections
    panels.load('ala', function() {
      ala.init();
    });

    // load all templates for remote privacy sections
    panels.load('rpp', function() {
      rpp.init();
    });

    // load all templates for transparency control
    panels.load('tc', function() {
      tc.init();
    });

    commands.init();
  });
});

define("app", function(){});
