'use strict';
/* global MozActivity */
/* global Search */

(function(exports) {

  /**
   * The search context menu handles bookmarking of search
   * results when the users long presses them.
   */
  function Contextmenu() {
    this.menu = document.getElementById('contextmenu');
    this.grid = document.getElementById('icons');

    this.bookmarkButton = this.menu.querySelector('#add-to-homescreen');

    this.grid.addEventListener('contextmenu', this);
    this.bookmarkButton.addEventListener('click', this);
  }

  Contextmenu.prototype = {

    /**
     * The current icon target.
     */
    icon: null,

    handleEvent: function(e) {
      switch(e.type) {
        case 'contextmenu':
          e.stopImmediatePropagation();
          e.preventDefault();

          var identifier = e.target.dataset.identifier;
          var icon = this.grid.getIcon(identifier);

          // Only show for bookmark targets
          if (!icon || icon.detail.type !== 'bookmark') {
            return;
          }

          this.icon = icon;
          this.menu.show();
          break;
        case 'click':
          /* jshint nonew: false */
          new MozActivity({
            name: 'save-bookmark',
            data: {
              type: 'url',
              url: this.icon.detail.url,
              name: this.icon.name,
              icon: this.icon.icon
            }
          });

          this.icon = null;
          this.menu.hide();

          // XXX Bug 1027374, close search. If we do not the activity window
          // is hidden behind the search window.
          Search.close();

          break;
      }
    }
  };

  exports.Contextmenu = Contextmenu;

}(window));
