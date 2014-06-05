'use strict';
/* global verticalPreferences, SettingsListener */

if (!window.verticalHomescreen) {
  (function(exports) {

    function VerticalHomescreen() {
      this.gridSelect = document.querySelector('[name="grid.layout.cols"]');
      verticalPreferences.addEventListener('updated', this);
      this.gridSelect.addEventListener('change', this);
      verticalPreferences.get('grid.cols').then(this.updateCols.bind(this));

      this.searchUrlTemplate = null;
      this.getCurrentSearchEngine();
      this.initSearchEngineSelect();
      // Listen for search engine selection
      this.searchEngineSelect = document.querySelector(
        '[name="search.urlTemplate"]');
    }

    VerticalHomescreen.prototype = {
      handleEvent: function(e) {
        switch(e.type) {
          case 'change':
            var select = this.gridSelect;
            var selection = select.options[select.selectedIndex];
            verticalPreferences.put('grid.cols', selection.value);

            break;

          case 'updated':
            var prop = e.target;
            if (prop.name === 'grid.cols') {
              this.updateCols(prop.value);
            }

            break;
        }
      },

      updateCols: function(num) {
        if (!num) {
          return;
        }

        var option = this.gridSelect.querySelector('[value="' + num + '"]');
        if (option) {
          option.selected = true;
        }
      },

      getCurrentSearchEngine: function() {
        var searchUrlTemplateRequest = SettingsListener.getSettingsLock().
          get('search.urlTemplate');
        searchUrlTemplateRequest.onsuccess = (function() {
          this.searchUrlTemplate = searchUrlTemplateRequest.
            result['search.urlTemplate'];
        }).bind(this);
      },

      initSearchEngineSelect: function() {
        // Get search provider list from settings
        var searchProvidersRequest = SettingsListener.getSettingsLock().
          get('search.providers');
        searchProvidersRequest.onsuccess = (function() {
          var searchEngineList = searchProvidersRequest.
            result['search.providers'];
          // If the list is empty, populate it from default JSON file
          if (!searchEngineList) {
            this.populateSearchEngines(
              this.generateSearchEngineOptions.bind(this));
            return;
          }

          // Otherwise just go ahead and generate the options
          this.generateSearchEngineOptions(searchEngineList);
        }).bind(this);
      },

      /**
       * Populate search engine list in settings from default JSON file.
       *
       * @param {Function} callback Function to call with retrieved data.
       */
      populateSearchEngines: function(callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/resources/search/providers.json', true);

        xhr.onload = function () {
          if (!(xhr.status === 200 | xhr.status === 0)) {
            console.error('Unable to get default search provider file.');
            return;
          }

          var data = JSON.parse(xhr.responseText);
          if (!data) {
            return;
          }

          if (callback) {
            callback(data);
          }
          var result = SettingsListener.getSettingsLock().set({
            'search.providers': data
          });
          result.onerror = function() {
            console.error('Unable to set search providers setting');
          };
        };

        xhr.send();
      },

      /**
       * Generate <options> for the search engine <select> element.
       *
       * @param {Array} data An array of engine objects.
       */
      generateSearchEngineOptions: function(data) {
        if (!data) {
          return;
        }

        this.searchEngineSelect.innerHTML = '';

        var selectFragment = document.createDocumentFragment();
        var optionNode = document.createElement('option');

        for (var i = 0; i < data.length; i++) {
          var engine = data[i];
          var option = optionNode.cloneNode();
          option.value = engine.urlTemplate;
          option.text = engine.title;
          if (engine.urlTemplate == this.searchUrlTemplate) {
            option.selected = true;
          }
          selectFragment.appendChild(option);
        }
        this.searchEngineSelect.appendChild(selectFragment);
      }
    };

    exports.verticalHomescreen = new VerticalHomescreen();

  }(window));
}
