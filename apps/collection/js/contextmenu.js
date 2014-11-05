'use strict';
/* global GaiaGrid */
/* global MozActivity */
/* global BookmarksDatabase */

(function(exports) {

  function Contextmenu(collection) {
    this.collection = collection;

    this.menu = document.getElementById('cloud-menu');
    this.grid = document.getElementById('grid');

    this.bookmarkButton = this.menu.querySelector('#bookmark-cloudapp');
    this.pinButton = this.menu.querySelector('#pin-cloudapp');

    this.grid.addEventListener('contextmenu', this, true);

    /**
     * The current contextmenu icon.
     * @type {DomElement}
     */
    this.icon = null;

    this.menu.addEventListener('gaiamenu-cancel', function() {
      this.icon = null;
    });

    this.bookmarkButton.addEventListener('click', function bookmark() {
      var icon = this.icon;

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

      this.icon = null;
      this.menu.hide();
    }.bind(this));

    this.pinButton.addEventListener('click', function pin() {
      if (this.icon) {
        var icon = this.icon;

        collection.pinWebResult(icon.detail);

        // The pinned result has slightly different properties.
        // Set properties and update to not have to do a full re-render.
        // We specifically override the methods here because the object
        // maintains a reference to the features object which we don't want
        // to pollute.
        icon.isRemovable = () => { return true; };
        icon.isDraggable = () => { return true; };
        icon.element.dataset.isDraggable = true;

        // Remove links are not present for web results
        var removeEl = document.createElement('span');
        removeEl.className = 'remove';
        icon.element.appendChild(removeEl);

        // Change the location of the icon in the grid to be after the current
        // pinned items, then re-render results.
        this.grid.removeIconByIdentifier(this.identifier);
        this.grid.removeItemByIndex(icon.detail.index);
        this.grid.add(icon, collection.pinned.length - 1);

        // Add a divider if it's our first pinned result.
        if (collection.pinned.length === 1) {
          this.grid.add(new GaiaGrid.Divider(), 1);
        }

        this.grid.render();

        collection.renderIcon().then(() => {
          collection.save();
        });
      }

      this.icon = null;
      this.menu.hide();

    }.bind(this));
  }

  Contextmenu.prototype = {
    isPinned: function(identifier) {
      return this.collection.isPinned({
        identifier: identifier
      });
    },

    show: function() {
      this.menu.show();

      setTimeout(function nextTick() {
        this.grid.start();
      }.bind(this));
    },

    /**
     * General event handler.
     */
    handleEvent: function(e) {
      switch(e.type) {
          case 'contextmenu':
            var identifier = this.identifier = e.target.dataset.identifier;
            if (!identifier) {
              return;
            }

            if (!this.isPinned(identifier)) {
              // prevent click events from firing
              this.grid.stop();

              e.preventDefault();

              var icon = this.icon = this.grid.getIcon(identifier);
              return BookmarksDatabase.get(icon.detail.url).then((bookmark) => {
                this.bookmarkButton.hidden = bookmark ? true : false;
              }, () => {
                this.bookmarkButton.hidden = false;
              }).then(this.show.bind(this));
            }

            break;
      }
    }
  };

  exports.Contextmenu = Contextmenu;

}(window));
