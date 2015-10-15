/* global PagesStore, IconsHelper */
'use strict';

/**
 * The size in pixels of the icons in the pinned pages.
 */
const PAGES_ICON_SIZE = 30;

(function(exports) {

  function Pages() {
    // Element references
    this.panel = document.getElementById('pages-panel');
    this.panels = document.getElementById('panels');
    this.pages = document.getElementById('pages');
    this.shadow = document.querySelector('#pages-panel > .shadow');
    this.scrollable = document.querySelector('#pages-panel > .scrollable');

    // Scroll behaviour
    this.scrolled = false;

    // Tracking if the list is empty
    this.empty = true;

    // Signal handlers
    this.pages.addEventListener('click', this);
    this.pages.addEventListener('contextmenu', this);
    this.scrollable.addEventListener('scroll', this);
    window.addEventListener('hashchange', this);

    // Initialise and populate pinned pages
    this.pagesStore = new PagesStore('places');
    this.pagesStore.init().then(() => {
      var checkEmptyCallback = () => {
        if (!this.empty && this.pages.children.length === 0) {
          this.empty = true;
          this.panel.classList.add('empty');
        }
      };

      // Triggered when pages are added and updated.
      document.addEventListener('places-set', (e) => {
        var id = e.detail.id;
        this.pagesStore.get(id).then((page) => {
          if (!page.data.pinned) {
            return;
          }

          for (var child of this.pages.children) {
            if (child.dataset.id === id) {
              if (!page.data.pinned) {
                this.pages.removeChild(child, checkEmptyCallback);
              } else {
                this.updatePinnedPage(child, page.data);
              }
              return;
            }
          }

          // A new page was pinned.
          this.addPinnedPage(page.data);
        });
      });

      document.addEventListener('places-removed', (e) => {
        var id = e.detail.id;
        for (var child of this.pages.children) {
          if (child.dataset.id === id) {
            this.pages.removeChild(child, checkEmptyCallback);
            return;
          }
        }
      });

      document.addEventListener('places-cleared', () => {
        for (var child of this.pages.children) {
          this.pages.removeChild(child);
        }

        if (!this.empty) {
          this.empty = true;
          this.panel.classList.add('empty');
        }
      });
    },
    (e) => {
      console.error('Error initialising pinned pages', e);
    }).then(() => {
      return this.pagesStore.getAll().then((pages) => {
        for (var page of pages) {
          this.addPinnedPage(page.data);
        }

        // If there are no pinned pages, display helpful information.
        if (this.empty) {
          this.panel.classList.add('empty');
        }
      }, (e) => {
        console.error('Error getting pinned pages', e);
      });
    });
  }

  Pages.prototype = {
    updatePinnedPage: function(card, page) {
      card.title = page.title;
      card.dataset.id = page.url;
      card.style.order = -Math.round(page.pinTime / 1000);

      setTimeout(function(card, page) {
        var background = {};
        if (page.screenshot) {
          background.src = URL.createObjectURL(page.screenshot);
        }
        if (page.themeColor) {
          background.themeColor = page.themeColor;
        }
        card.background = background;

        IconsHelper.getIconBlob(page.url, PAGES_ICON_SIZE, page)
          .then((iconObj) => {
            if (iconObj.blob) {
              var iconURL = URL.createObjectURL(iconObj.blob);
              card.icon = `url(${iconURL})`;
            }
          })
          .catch((e) => {
            console.error('Failed to fetch icon', e);
          });
      }.bind(this, card, page));
    },

    addPinnedPage: function(page) {
      var pinCard = document.createElement('gaia-pin-card');
      this.updatePinnedPage(pinCard, page);
      this.pages.appendChild(pinCard);

      if (this.empty) {
        this.empty = false;
        this.panel.classList.remove('empty');
      }
    },

    handleEvent: function(e) {
      switch (e.type) {
      case 'click':
        if (e.target.nodeName !== 'GAIA-PIN-CARD') {
          return;
        }

        var features = {
          name: e.target.title,
          icon: e.target.icon,
          remote: true
        };

        window.open(e.target.dataset.id, '_blank', Object.keys(features).
          map(function eachFeature(key) {
            return encodeURIComponent(key) + '=' +
              encodeURIComponent(features[key]);
          }).join(','));
        break;

      case 'contextmenu':
        if (e.target.nodeName !== 'GAIA-PIN-CARD') {
          return;
        }

        e.preventDefault();
        e.stopImmediatePropagation();
        break;

      case 'scroll':
        var position = this.scrollable.scrollTop;
        var scrolled = position > 1;
        if (this.scrolled !== scrolled) {
          this.scrolled = scrolled;
          this.shadow.classList.toggle('visible', scrolled);
        }
        break;

      case 'hashchange':
        if (!document.hidden) {
          if (this.panels.scrollLeft ===
              this.scrollable.parentNode.offsetLeft) {
            this.scrollable.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
          }
        }
        break;
      }
    }
  };

  exports.Pages = Pages;

}(window));
