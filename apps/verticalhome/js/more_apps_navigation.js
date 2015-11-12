'use strict';
(function (exports) {

  var MoreAppsNavigation = {
    items: null,
    selectedElemIndex: 0,

    /**
     * Initialize navigation list in MoreAppsNavigation when all items are
     * loaded
     */
    init: function () {
      this.items = app.grid.getItems();
    },

    /**
     * Called when 'More Apps' screen has been opened. This function resets
     * selected element to a first element and adds listener on keydown event
     */
    reset: function () {
      document.getElementsByTagName('gaia-grid-rs')[0].scrollTo(0, 0);
      if (this.items[this.selectedElemIndex].element) {
        this.items[this.selectedElemIndex].element.classList.remove('selected');
      }
      this.selectedElemIndex = 0;
      this.items[this.selectedElemIndex].element.classList.add('selected');
      window.addEventListener('keydown', this);
    },

    /**
     * Removes listener of keydown event.
     * Note: called when "More Apps" screen is closed
     */
    stopListeningKeydownEvents: function () {
      window.removeEventListener('keydown', this);
    },

    /**
     * Handles keydown event on 'More Apps' screen
     */
    handleEvent: function (e) {
      var deltaIndex = 0;
      switch (e.key) {
        case 'ArrowUp':
          deltaIndex = -2;
          this.changeSelectElem(deltaIndex, 'top');
          e.preventDefault();
          break;
        case 'ArrowDown':
          deltaIndex = 2;
          this.changeSelectElem(deltaIndex, 'bottom');
          e.preventDefault();
          break;
        case 'ArrowLeft':
          deltaIndex = -1;
          this.changeSelectElem(deltaIndex, 'top');
          e.preventDefault();
          break;
        case 'ArrowRight':
          deltaIndex = 1;
          this.changeSelectElem(deltaIndex, 'bottom');
          e.preventDefault();
          break;
        case 'Accept':
          /**
           * Launch the selected app. Don't need to call hideMoreApps(), because
           * it is called when app is closed
           */
          this.items[this.selectedElemIndex].element.click();
          e.preventDefault();
          break;
      }
    },

    /**
     * Change old selected item to new selected item and scroll it into view if
     * it doesn't fully visible. If new selectedElemIndex is out of 'items'
     * array range, then currently selected item  remains unchanged
     */
    changeSelectElem: function (deltaIndex, behavior) {
      var trialIndex = this.selectedElemIndex + deltaIndex;
      if (trialIndex >= 0 && trialIndex < this.items.length) {
        this.items[this.selectedElemIndex].element.classList.remove('selected');
        this.selectedElemIndex = trialIndex;
        this.items[this.selectedElemIndex].element.classList.add('selected');
      } else {
        return;
      }
      if (!this.isFullyVisible(this.items[this.selectedElemIndex].element)) {
        /**
         * 'childNodes[0]' - it is a container for element's title
         * When we move to bottom element we use scrollIntoView for
         * childNodes[0], because title container is a bit outside of parent
         * element.
         * It should be changed after refactoring of 'gaia_grid_rs' styles
         */
        if (behavior === 'bottom') {
          this.items[this.selectedElemIndex].element.childNodes[0].
                  scrollIntoView({behavior: 'smooth', block: 'end'});
        } else if (behavior === 'top') {
          this.items[this.selectedElemIndex].element.
                  scrollIntoView({behavior: 'smooth', block: 'start'});
        }
      }
    },

    /**
     * Check that selected element is fully visible on the screen
     */
    isFullyVisible: function (element) {
      var gaiaGrid = document.getElementsByTagName('gaia-grid-rs')[0];
      var gridRect = gaiaGrid.getBoundingClientRect();
      var elementRect = element.getBoundingClientRect();
      if (elementRect.bottom > gridRect.bottom) {
        return false;
      } else if (elementRect.top < gridRect.top) {
        return false;
      }
      return true;
    }
  };

  exports.MoreAppsNavigation = MoreAppsNavigation;
})(window);
