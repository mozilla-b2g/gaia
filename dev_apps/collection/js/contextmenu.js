'use strict';

(function(exports) {

  function Contextmenu(menu, grid, collection) {
    this.menu = menu;
    this.pinButton = menu.querySelector('#pin-cloudapp');

    this.grid = grid;
    this.grid.addEventListener('contextmenu', this);

    /**
     * The current contextmenu target.
     * @type {DomElement}
     */
    this.target = null;

    this.menu.addEventListener('gaiamenu-cancel', function() {
      this.target = null;
    });

    this.pinButton.addEventListener('click', function pin() {
      if (this.target) {
        var identifier = this.target.dataset.identifier;
        var icon = this.grid.getIcon(identifier);

        collection.pin(icon.detail);
        collection.render(this.grid);
      }

      this.target = null;
      this.menu.hide();

    }.bind(this));
  }

  Contextmenu.prototype = {
    /**
     * General event handler.
     */
    handleEvent: function(e) {
      switch(e.type) {
          case 'contextmenu':

            // prevent click events from firing
            this.grid.stop();

            e.stopImmediatePropagation();
            e.preventDefault();

            this.target = e.target;
            this.menu.show();

            setTimeout(function nextTick() {
              this.grid.start()
            }.bind(this));

            break;
      }
    }
  };

  exports.Contextmenu = Contextmenu;

}(window));
