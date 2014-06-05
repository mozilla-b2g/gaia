'use strict';
/* global MozActivity */

(function(exports) {

  function Contextmenu(collection) {
    this.menu = document.getElementById('cloud-menu');
    this.grid = document.getElementById('grid');

    this.bookmarkButton = this.menu.querySelector('#bookmark-cloudapp');
    this.pinButton = this.menu.querySelector('#pin-cloudapp');

    this.grid.addEventListener('contextmenu', this);

    /**
     * The current contextmenu target.
     * @type {DomElement}
     */
    this.target = null;

    this.menu.addEventListener('gaiamenu-cancel', function() {
      this.target = null;
    });

    this.bookmarkButton.addEventListener('click', function bookmark() {
      var identifier = this.target.dataset.identifier;
      var icon = this.grid.getIcon(identifier);

      /* jshint nonew: false */
      new MozActivity({
        name: 'save-bookmark',
        data: {
          type: 'url',
          url: icon.detail.url,
          name: icon.name,
          icon: icon.icon
        }
      });

      this.target = null;
      this.menu.hide();
    }.bind(this));

    this.pinButton.addEventListener('click', function pin() {
      if (this.target) {
        var identifier = this.target.dataset.identifier;
        var icon = this.grid.getIcon(identifier);

        collection.pinWebResult(icon.detail);
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
              this.grid.start();
            }.bind(this));

            break;
      }
    }
  };

  exports.Contextmenu = Contextmenu;

}(window));
