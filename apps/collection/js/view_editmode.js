'use strict';

(function(exports) {

  var elements = {
    grid: document.getElementById('grid'),
    done: document.getElementById('exit-edit-mode')
  };

  function ViewEditMode(collection) {
    this.collection = collection;

    window.addEventListener('hashchange', this);
    window.addEventListener('gaiagrid-dragdrop-finish', this);
    window.addEventListener('gaiagrid-uninstall-mozapp', this);
    window.addEventListener('collection-remove-webresult', this);

    elements.done.addEventListener('click', this.exitEditMode);
  }

  ViewEditMode.prototype = {

    /**
     * Called when we press 'Done' to exit edit mode.
     * Fires a custom event to use the same path as pressing the home button.
     */
    exitEditMode: function(e) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('hashchange'));
    },

    unpin: function(itemId) {
      var collection = this.collection;
      // unpin, then refresh grid
      collection.unpin(itemId)
        .then(() => collection.render(elements.grid));
    },

    handleEvent: function(e) {
      switch(e.type) {
        case 'gaiagrid-dragdrop-finish':
          // save new sorting
          var items = elements.grid.getItems();
          var identifiers = items.map(function(item) {
            return item.element.dataset.identifier;
          });
          this.collection.setPinned(identifiers);
          break;

        // home button or "done" clicked
        case 'hashchange':
          var dragdrop = elements.grid._grid.dragdrop;
          if (dragdrop.inEditMode) {
            dragdrop.exitEditMode();
            return;
          }
          break;

        case 'gaiagrid-uninstall-mozapp':
          this.unpin(e.detail.detail.manifestURL);
          break;

        case 'collection-remove-webresult':
          this.unpin(e.detail.identifier);
          break;
      }
    }
  };

  exports.ViewEditMode = ViewEditMode;

}(window));
