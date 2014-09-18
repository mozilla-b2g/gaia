'use strict';

function CustomLocationPanel(rootPanelId) {

  // TODO: remove fallback when simulator allows us to
  // access mozL10n (on device works ok)
  this.l10n = navigator.mozL10n || { get: function(b) { return b;} };

  this.$root = document.getElementById(rootPanelId ? rootPanelId : 'root');
  this.$box = document.getElementById('DCL');
  this.$back = document.getElementById('DCL-back');
  this.$typeCC = document.getElementById('dcl-type-cc');
  this.$typeGPS = document.getElementById('dcl-type-gps');
  this.$ccArea = document.getElementById('dcl-cc-area');
  this.$gpsArea = document.getElementById('dcl-gps-area');
  this.$countries = document.getElementById('dcl-country');
  this.$cities = document.getElementById('dcl-city');
  this.$longitude = document.getElementById('dcl-longitude');
  this.$latitude = document.getElementById('dcl-latitude');

  this.listeners = {
    backClick: this.close.bind(this),
    typeChange: this.toggleType.bind(this),
    countryChange: this.toggleCountry.bind(this),
    cityChange: this.toggleCity.bind(this),
    longitudeChange: this.toggleLongitude.bind(this),
    latitudeChange: this.toggleLatitude.bind(this)
  };

  this.countriesAndCities = {
    'poland': {
      'warsaw': { lon: 15, lat: 51 },
      'zielona-gora': { lon: 16, lat: 51 },
      'wroclaw': { lon: 17, lat: 51 },
      'poznan': { lon: 18, lat: 51 },
    },
    'germany': {
      'berlin': { lon: 13, lat:42},
      'colln': {lon:13, lat:41},
      'frankfurt': {lon:14, lat:43},
      'hannover': {lon:15, lat:41}
    }
  };

  this.cities = {};
  this.settings = {};
}

CustomLocationPanel.prototype = {

  initAndShow: function(customLocationSettings, callback) {
    this.callback = callback || function(){};

    this.settings = customLocationSettings || { type: 'gps' };

    this.updateCountriesList();
    this.updateType();

    this.show();
  },

  show: function() {
    this.$root.style.display = 'none';
    this.$box.style.display = 'block';

    this.addListeners();
  },

  close: function() {
    this.$root.style.display = 'block';
    this.$box.style.display = 'none';

    this.removeListeners();
  },

  addListeners: function() {
    this.$back.addEventListener('click', this.listeners.backClick);
    this.$typeCC.addEventListener('change', this.listeners.typeChange);
    this.$typeGPS.addEventListener('change', this.listeners.typeChange);

    this.$countries.addEventListener('change', this.listeners.countryChange);
    this.$cities.addEventListener('change', this.listeners.cityChange);

    this.$longitude.addEventListener('change', this.listeners.longitudeChange);
    this.$latitude.addEventListener('change', this.listeners.latitudeChange);
  },

  removeListeners: function() {
    this.$back.removeEventListener('click', this.listeners.backClick);
    this.$typeCC.removeEventListener('change', this.listeners.typeChange);
    this.$typeGPS.removeEventListener('change', this.listeners.typeChange);

    this.$countries.removeEventListener('change', this.listeners.countryChange);
    this.$cities.removeEventListener('change', this.listeners.cityChange);

    this.$longitude.removeEventListener('change', this.listeners.longitudeChange);
    this.$latitude.removeEventListener('change', this.listeners.latitudeChange);
  },

  toggleType: function(event) {
    this.settings.type = event.target.value;
    this.updateType();
    this.changedParameters();
  },

  toggleCountry: function(event) {
    this.settings.country = event.target.value;
    this.updateCountry();
    this.updateLongitudeAndLatitudeForCity();
    this.changedParameters();
  },

  toggleCity: function(event) {
    this.settings.city = event.target.value;
    this.updateCity();
    this.updateLongitudeAndLatitudeForCity();
    this.changedParameters();
  },

  toggleLongitude: function(event) {
    this.settings.longitude = event.target.value;
    this.changedParameters();
  },

  toggleLatitude: function(event) {
    this.settings.latitude = event.target.value;
    this.changedParameters();
  },

  updateCountriesList: function() {
    this.cities = this.countriesAndCities[this.settings.country];

    this.$countries.innerHTML = '';

    for (var countryName in this.countriesAndCities) {
      if (this.countriesAndCities.hasOwnProperty(countryName)) {
        var option = document.createElement('option');
        option.value = countryName;
        option.text = this.l10n.get(countryName);
        this.$countries.add(option);
      }
    }
  },

  updateType: function() {
    this.settings.type = this.settings.type === undefined ? 'gps' : this.settings.type;

    this.$typeCC.checked = this.settings.type === 'cc';
    this.$typeGPS.checked = this.settings.type !== 'cc';

    this.updateCountry();

    if(this.settings.type === 'cc') {
      this.updateLongitudeAndLatitudeForCity();
      this.disableGPSControls();
      this.enableCCControls();
    } else {
      this.updateLongitudeAndLatitude();
      this.disableCCControls();
      this.enableGPSControls();
    }
  },

  updateCountry: function() {
    if(this.settings.country === undefined) {
      this.settings.country = this.getFirstCountry();
    }

    this.$countries.value = this.settings.country;

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
    this.cities = this.countriesAndCities[this.settings.country];

    this.$cities.innerHTML = '';

    for (var cityName in this.cities) {
      if (this.cities.hasOwnProperty(cityName)) {
        var option = document.createElement('option');
        option.value = cityName;
        option.text = this.l10n.get(cityName);
        this.$cities.add(option);
      }
    }
  },

  updateCity: function() {
    if(this.settings.city === undefined || !this.cities.hasOwnProperty(this.settings.city)) {
      this.settings.city = this.getFirstCityFromCountry();
    }

    if(this.settings.city !== null)
    {
      this.$cities.value = this.settings.city;
    }
  },

  updateLongitudeAndLatitudeForCity: function() {
    if(this.settings.city !== null)
    {
      var city = this.cities[this.settings.city];
      this.settings.longitude = city.lon;
      this.settings.latitude = city.lat;
    } else {
      this.settings.longitude = 0;
      this.settings.latitude = 0;
    }

    this.updateLongitudeAndLatitude();
  },

  getFirstCityFromCountry: function() {
    for (var cityName in this.cities) {
      if (this.cities.hasOwnProperty(cityName)) {
        return cityName;
      }
    }

    return null;
  },

  updateLongitudeAndLatitude: function() {
    if(this.settings.longitude === undefined) {
      this.settings.longitude = 0;
    }

    if(this.settings.latitude === undefined) {
      this.settings.latitude = 0;
    }

    this.$longitude.value = this.settings.longitude;
    this.$latitude.value = this.settings.latitude;
  },

  enableCCControls: function() {
    this.$countries.disabled = false;
    this.$cities.disabled = false;
    this.$ccArea.style.opacity = "1";
  },

  enableGPSControls: function() {
    this.$longitude.disabled = false;
    this.$latitude.disabled = false;
    this.$gpsArea.style.opacity = "1";
  },

  disableCCControls: function() {
    this.$countries.disabled = true;
    this.$cities.disabled = true;
    this.$ccArea.style.opacity = "0.3";
  },

  disableGPSControls: function() {
    this.$longitude.disabled = true;
    this.$latitude.disabled = true;
    this.$gpsArea.style.opacity = "0.3";
  },

  changedParameters: function() {
    this.callback(this.settings);
  }
};
