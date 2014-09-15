'use strict';
/* global MozActivity */
/* global Bookmarks */

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
          var identifier = e.target.dataset.identifier;
          var icon = this.grid.getIcon(identifier);

          // Only show for bookmark targets
          if (!icon || icon.detail.type !== 'bookmark') {
            return;
          }

          var url = icon.detail.url;
          if (Bookmarks.get(url)) {
            // Bookmark already installed in device
            return;
          }

          // In order to benefit from the system contextmenu in such a way that
          // it overlaps search bar, let's create a contextmenu attribute on
          // the fly, and remove it once the event dispatching is done.
          e.target.setAttribute('contextmenu', 'contextmenu');

          // Stop the grid from listening to events to prevent it from
          // receiving a touchend event and launching the icon. This is
          // restored on next tick.
          this.grid.stop();

          setTimeout(() => {
            e.target.removeAttribute('contextmenu');
            this.grid.start();
          });

          this.icon = icon;
          break;

        case 'click':
          /* jshint nonew: false */
          /**
           * We could have several cases for icons in the search grid:
           * - Icons from e.me: this.icon.icon will be url
           * - Icons from places: this.icon.icon can be:
           *   - a blob, cached icon
           *   - a icon url
           *   To solve this, added an extra feature attribute: iconUrl,
           *   so GaiaGridItems with this extra attribute in the detail
           *   will have a way to keep track of the original url.
           */
          var iconUrl = this.icon.detail.iconUrl || this.icon.icon;
          new MozActivity({
            name: 'save-bookmark',
            data: {
              type: 'url',
              url: this.icon.detail.url,
              name: this.icon.name,
              icon: iconUrl
            }
          });
          break;
      }
    }
  };

  exports.Contextmenu = Contextmenu;

}(window));
