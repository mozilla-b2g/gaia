define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var Homescreen = require('panels/homescreen/homescreen');

  return function ctor_homescreen_panel() {
    return SettingsPanel({
      onInit: function(panel) {
        this._elements = {};
        this._elements.gridSelect =
          panel.querySelector('[name="grid.layout.cols"]');

        this._elements.gridSelect.addEventListener('change', function() {
          Homescreen.setCols(this.value);
        });

        this._updateCols(Homescreen.cols);

        Homescreen.observe('cols', (newValue) => {
          this._updateCols(newValue);
        });
      },
      _updateCols: function(number) {
        if (!number) {
          return;
        }

        var option =
          this._elements.gridSelect.querySelector('[value="' + number + '"]');

        if (option) {
          option.selected = true;
        }
      }
    });
  };
});
