/**
 * ALA exceptions panel.
 *
 * @module ExceptionsPanel
 * @return {Object}
 */
define([
  'panels',
  'ala/blur_slider',
  'shared/settings_listener',
  'shared/settings_helper'
],

function(panels, BlurSlider, SettingsListener, SettingsHelper) {
  'use strict';

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

        var type, typeArg;
        var appSettings = this.exceptionsList[item.origin];
        if (appSettings) {
          switch (appSettings.type) {
            case 'user-defined':
              type = 'type-user-defined';
              break;
            case 'blur':
              type = 'type-blur';
              typeArg = { blurRadius: BlurSlider.getLabel(appSettings.slider) };
              break;
            case 'precise':
              type = 'type-precise';
              break;
            case 'no-location':
              type = 'type-no-location';
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
        navigator.mozL10n.setAttributes('type', itemData.type);
        if (itemData.typeArg) {
          navigator.mozL10n.setAttributes('type', itemData.type,
                                        itemData.typeArg);
        }

        link.appendChild(itemData.type);
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
