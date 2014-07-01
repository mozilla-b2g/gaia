'use strict';
/* global MozActivity */

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

          // In order to benefit from the system contextmenu in such a way that
          // it overlaps search bar, let's create a contextmenu attribute on
          // the fly, and remove it once the event dispatching is done.
          e.target.setAttribute('contextmenu', 'contextmenu');
          setTimeout(function() {
            e.target.removeAttribute('contextmenu');
          });

          this.icon = icon;
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
          this.hide();
          break;
      }
    }
  };

  exports.Contextmenu = Contextmenu;

}(window));
