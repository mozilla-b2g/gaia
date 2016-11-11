/**
 * ALA exception panel.
 * 
 * @module ALAException
 * @return {Object}
 */
define([
  'panels',
  'ala/blur_slider',
  'ala/app_list',
  'ala/exceptions',
  'shared/settings_listener',
  'shared/settings_helper'
],

function(panels, BlurSlider, appList, alaExceptions, SettingsListener,
  SettingsHelper) {
  'use strict';

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
