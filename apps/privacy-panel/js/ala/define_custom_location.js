/*jshint maxlen:120*/
/**
 * ALA define custom location panel.
 * 
 * @module ALADefineCustomLocation
 * @return {Object}
 */
define([
  'panels',
  'shared/settings_listener',
  'shared/settings_helper'
],

function(panels, SettingsListener, SettingsHelper) {
  'use strict';

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
      var lon = /^[-+]?((1[0-7]\d(\.\d{1,6})?)|(180(\.0+)?)|(\d\d(\.\d{1,6})?)|(\d(\.\d{1,6})?))$/;

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
