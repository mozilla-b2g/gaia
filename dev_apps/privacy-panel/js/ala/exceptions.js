(function() {
  'use strict';

  function ALAExceptions() {
    this.exceptionsList = {};
  }

  ALAExceptions.prototype = {

    /**
     * Initialize ALA exceptions panel.
     * 
     * @method init
     * @constructor
     */
    init: function() {
      this.settings = window.navigator.mozSettings;
      this.panel = document.getElementById('ala-exceptions');

      this.appListElement = this.panel.querySelector('#app-list');

      // get exception list from settings
      window.SettingsHelper('geolocation.app_settings', {}).get(function(value){
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
      var manifest, icon, appSettings, type, li;

      window.pp.ala.apps.forEach(function(item, index) {

        // remove Privacy Panel application from list
        if (item.origin.indexOf('privacy-panel') !== -1) {
          return;
        }

        manifest = item.manifest || item.updateManifest;
        icon = window.pp.appList.icon(item);

        type = undefined;
        appSettings = this.exceptionsList[item.origin];

        if (appSettings) {
          type = appSettings.type;
          switch (appSettings.type) {
            case 'user-defined':
              type = 'User defined';
              break;
            case 'blur':
              type = window.pp.BlurSlider.getLabel(appSettings.slider) +' blur';
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

        li = this.renderAppItem({
          origin: item.origin,
          name: manifest.name,
          index: index,
          iconSrc: icon,
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
          window.pp.panel.show({ id: 'ala-exception', options: itemData });
        });

      item.classList.add('app-element');
      item.appendChild(link);
      return item;
    }
  };


  window.pp = window.pp || {};
  window.pp.alaExceptions = new ALAExceptions();
})();
