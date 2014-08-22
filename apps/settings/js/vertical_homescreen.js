'use strict';
/* global verticalPreferences */

if (!window.verticalHomescreen) {
  (function(exports) {

    function VerticalHomescreen() {
      this.gridSelect = document.querySelector('[name="grid.layout.cols"]');
      verticalPreferences.addEventListener('updated', this);
      this.gridSelect.addEventListener('change', this);
      verticalPreferences.get('grid.cols').then(this.updateCols.bind(this));
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
      }
    };

    exports.verticalHomescreen = new VerticalHomescreen();

  }(window));
}
