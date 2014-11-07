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
      countryChange: this.toggleCountry.bind(this),
      cityChange: this.toggleCity.bind(this),
      longitudeChange: this.toggleLongitude.bind(this),
      latitudeChange: this.toggleLatitude.bind(this)
    };

    this.citiesList = {};
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
      this.typeCC =     this.panel.querySelector('.dcl-type-cc');
      this.typeGPS =    this.panel.querySelector('.dcl-type-gps');
      this.countries =  this.panel.querySelector('.dcl-country');
      this.cities =     this.panel.querySelector('.dcl-city');
      this.longitude =  this.panel.querySelector('.dcl-longitude');
      this.latitude =   this.panel.querySelector('.dcl-latitude');

      panels.loadJSON('resources/countries.json', function(data) {
        this.countriesAndCities = data;
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
      this.typeCC.addEventListener('change', this.listeners.typeChange);
      this.typeGPS.addEventListener('change', this.listeners.typeChange);

      this.countries.addEventListener('change', this.listeners.countryChange);
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
      this.config.type = this.config.type || 'cc';

      this.callback =
        this.context.saveDCLData.bind(this.context) || function(){};

      this.updateCountriesList();
      this.updateType();

      this.runCallback();
    },

    toggleType: function(event) {
      this.config.type = event.target.value;
      this.updateType();
      this.runCallback();
    },

    toggleCountry: function(event) {
      this.config.country = event.target.value;
      this.updateCountry();
      this.updateLongitudeAndLatitudeForCity();
      this.runCallback();
    },

    toggleCity: function(event) {
      this.config.city = event.target.value;
      this.updateCity();
      this.updateLongitudeAndLatitudeForCity();
      this.runCallback();
    },

    toggleLongitude: function(event) {
      this.config.longitude = event.target.value;
      this.runCallback();
    },

    toggleLatitude: function(event) {
      this.config.latitude = event.target.value;
      this.runCallback();
    },

    updateCountriesList: function() {
      this.citiesList = this.countriesAndCities[this.config.country];

      this.countries.innerHTML = '';

      for (var countryName in this.countriesAndCities) {
        if (this.countriesAndCities.hasOwnProperty(countryName)) {
          var option = document.createElement('option');
          option.value = countryName;
          option.setAttribute('data-l10n-id', countryName);
          this.countries.add(option);
        }
      }
    },

    updateType: function() {
      this.config.type =
        this.config.type === undefined ? 'gps' : this.config.type;

      this.panel.dataset.type = this.config.type;

      this.updateCountry();

      var modeCC = (this.config.type === 'cc');

      if (modeCC) {
        this.updateLongitudeAndLatitudeForCity();
      } else {
        this.updateLongitudeAndLatitude();
      }

      this.typeCC.checked = modeCC;
      this.longitude.disabled = modeCC;
      this.latitude.disabled = modeCC;

      this.typeGPS.checked = ! modeCC;
      this.countries.disabled = ! modeCC;
      this.cities.disabled = ! modeCC;
    },

    updateCountry: function() {
      if ( ! this.countriesAndCities[this.config.country] ||
        this.config.country === undefined) {
        this.config.country =
          (this.timeZone &&
          this.countriesAndCities.hasOwnProperty(this.timeZone.region)) ?
            this.timeZone.region :
            this.getFirstCountry();
      }

      this.countries.value = this.config.country;

      this.updateCitiesList();
      this.updateCity();
    },

    getFirstCountry: function() {
      for (var countryName in this.countriesAndCities) {
        if (this.countriesAndCities.hasOwnProperty(countryName)) {
          return countryName;
        }
      }

      return null;
    },

    updateCitiesList: function() {
      this.citiesList = this.countriesAndCities[this.config.country];

      this.cities.innerHTML = '';

      for (var cityName in this.citiesList) {
        if (this.citiesList.hasOwnProperty(cityName)) {
          var option = document.createElement('option');
          option.value = cityName;
          option.setAttribute('data-l10n-id', cityName);
          this.cities.add(option);
        }
      }
    },

    updateCity: function() {
      if (this.config.city === undefined ||
        ! this.citiesList.hasOwnProperty(this.config.city)) {
        this.config.city =
          (this.timeZone &&
          this.citiesList.hasOwnProperty(this.timeZone.city)) ?
            this.timeZone.city :
            this.getFirstCityFromCountry();
      }

      if (this.config.city !== null) {
        this.cities.value = this.config.city;
      }
    },

    updateLongitudeAndLatitudeForCity: function() {
      if (this.config.city !== null) {
        var city = this.citiesList[this.config.city];
        this.config.longitude = city.lon;
        this.config.latitude = city.lat;
      } else {
        this.config.longitude = 0;
        this.config.latitude = 0;
      }

      this.updateLongitudeAndLatitude();
    },

    getFirstCityFromCountry: function() {
      for (var cityName in this.citiesList) {
        if (this.citiesList.hasOwnProperty(cityName)) {
          return cityName;
        }
      }

      return null;
    },

    updateLongitudeAndLatitude: function() {
      this.longitude.value = this.config.longitude || 0;
      this.latitude.value = this.config.latitude || 0;
    },

    runCallback: function() {
      this.callback(this.config);
    }
  };

  return new ALADefineCustomLocation();

});
