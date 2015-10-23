/* global PagesStore, IconsHelper */
'use strict';

/**
 * The size in pixels of the icons in the pinned pages.
 */
const PAGES_ICON_SIZE = 30;

(function(exports) {

  /**
   * The height of the delete-app bar at the bottom of the container when
   * dragging a deletable app.
   */
  const DELETE_DISTANCE = 60;

  function Pages() {
    // Element references
    this.panel = document.getElementById('pages-panel');
    this.panels = document.getElementById('panels');
    this.pages = document.getElementById('pages');
    this.shadow = document.querySelector('#pages-panel > .shadow');
    this.scrollable = document.querySelector('#pages-panel > .scrollable');
    this.bottombar = document.getElementById('bottombar');
    this.remove = document.getElementById('remove');

    // Scroll behaviour
    this.scrolled = false;

    // Tracking if the list is empty
    this.empty = true;

    // Signal handlers
    this.pages.addEventListener('click', this);
    this.pages.addEventListener('keydown', this);
    this.pages.addEventListener('drag-start', this);
    this.pages.addEventListener('drag-move', this);
    this.pages.addEventListener('drag-end', this);
    this.pages.addEventListener('drag-finish', this);
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

          if (!page.data.pinned) {
            return;
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

      // Make the card accessible/allow activation
      pinCard.tabIndex = 0;
      pinCard.setAttribute('role', 'link');

      this.updatePinnedPage(pinCard, page);
      this.pages.appendChild(pinCard);

      if (this.empty) {
        this.empty = false;
        this.panel.classList.remove('empty');
      }
    },

    launchCard: function(card) {
      var features = {
        name: card.title,
        icon: card.icon,
        remote: true
      };

      window.open(card.dataset.id, '_blank', Object.keys(features).map(
        key => encodeURIComponent(key) + '=' + encodeURIComponent(features[key])
      ).join(','));
    },

    handleEvent: function(e) {
      switch (e.type) {
      case 'click':
        if (e.target.nodeName !== 'GAIA-PIN-CARD') {
          break;
        }

        this.launchCard(e.target);
        break;

      case 'keydown':
        if (e.target.nodeName !== 'GAIA-PIN-CARD') {
          break;
        }

        switch (e.keyCode) {
          case 32: // Space
          case 13: // Enter
            this.launchCard(e.target);
        }
        break;

      case 'drag-start':
        document.body.classList.add('dragging');
        this.bottombar.classList.toggle('editable', false);
        this.bottombar.classList.toggle('removable', true);
        this.bottombar.classList.add('active');
        break;

      case 'drag-move':
        this.remove.classList.toggle('active',
          e.detail.clientY > window.innerHeight - DELETE_DISTANCE);
        break;

      case 'drag-end':
        e.preventDefault();
        if (e.detail.clientY <= window.innerHeight - DELETE_DISTANCE) {
          return;
        }

        var card = e.detail.target;
        var id = card.dataset.id;

        // Take the child out of flow so it doesn't return to its original
        // position before being removed.
        card.classList.add('unpinning');
        card.style.transform = card.parentNode.style.transform;

        this.pagesStore.get(id).then(entry => {
          entry.data.pinned = false;
          this.pagesStore.datastore.put(entry.data, id).then(() => {},
            e => {
              card.classList.remove('unpinning');
              card.style.transform = '';
              console.error('Error unpinning page:', e);
            });
        }, e => {
          card.classList.remove('unpinning');
          card.style.transform = '';
          console.error('Error retrieving page to unpin:', e);
        });
        break;

      case 'drag-finish':
        document.body.classList.remove('dragging');
        this.bottombar.classList.remove('active');
        this.remove.classList.remove('active');
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
