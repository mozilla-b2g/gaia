(function() {
  'use strict';

  function ALAException() {
    this.itemData = null;
    this.currentApp = null;
    this.currentAppSettings = null;
    this.blurSlider = new window.pp.BlurSlider();
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
          window.pp.panel.show({ id: 'ala-custom', options: this.itemData });
        }.bind(this)
      );

      this.alert.querySelector('button').addEventListener('click',
        function() {
          this.alert.setAttribute('hidden', 'hidden');
          window.pp.panel.show({ id: 'ala-custom', options: this.itemData });
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
        window.pp.alaExceptions.exceptionsList[this.itemData.origin];

      if ( ! this.currentAppSettings) {
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
          if ( ! (window.pp.alaExceptions.exceptionsList[this.currentApp] &&
            window.pp.alaExceptions.exceptionsList[this.currentApp].coords)) {

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

      window.pp.alaExceptions.exceptionsList[this.currentApp] = {
        type:   this.appType.value,
        slider: this.blurSlider.getValue(),
        radius: this.blurSlider.getRadius(this.blurSlider.getValue()),

        coords:       extraSettings.coords || current.coords || null,
        cl_type:      extraSettings.cl_type || current.cl_type || null,
        cl_country:   extraSettings.cl_country || current.cl_country || null,
        cl_city:      extraSettings.cl_city || current.cl_city || null,
        cl_longitude: extraSettings.cl_longitude || current.cl_longitude ||null,
        cl_latitude:  extraSettings.cl_latitude || current.cl_latitude || null
      };

      window.SettingsHelper('geolocation.app_settings')
        .set(window.pp.alaExceptions.exceptionsList);
    },

    /**
     * Remove exception from list.
     */
    removeException: function() {
      delete window.pp.alaExceptions.exceptionsList[this.currentApp];

      window.SettingsHelper('geolocation.app_settings')
        .set(window.pp.alaExceptions.exceptionsList);
    }
  };


  window.pp = window.pp || {};
  window.pp.alaException = new ALAException();
})();
