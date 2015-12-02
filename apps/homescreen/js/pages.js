/* global PagesStore, IconsHelper */
'use strict';

(function(exports) {

  /**
   * The size in pixels of the icons in the pinned pages.
   */
  const PAGES_ICON_SIZE = 30;

  function Pages() {
    // Element references
    this.panel = document.getElementById('pages-panel');
    this.panels = document.getElementById('panels');
    this.pages = document.getElementById('pages');
    this.scrollable = document.querySelector('#pages-panel > .scrollable');
    this.bottombar = document.getElementById('bottombar');
    this.remove = document.getElementById('remove');
    this.done = document.getElementById('done');

    // Tracking if the list is empty
    this.empty = true;

    // Edit mode
    this.editMode = false;

    // Dialogs
    this.dialogs = [];

    // Signal handlers
    this.pages.addEventListener('click', this);
    this.pages.addEventListener('contextmenu', this);
    this.pages.addEventListener('keydown', this);
    window.addEventListener('resize', this);

    this.done.addEventListener('click', e => {
      e.preventDefault();
      this.exitEditMode();
    });

    this.remove.addEventListener('click', e => {
      e.preventDefault();
      this.unpinSelectedCard();
    });

    // Initialise and populate pinned pages
    this.pagesStore = new PagesStore('places');
    this.pagesStore.init().then(() => {
      // Triggered when pages are added and updated.
      document.addEventListener('places-set', (e) => {
        var id = e.detail.id;
        this.pagesStore.get(id).then((page) => {
          for (var child of this.pages.children) {
            if (child.dataset.id === id) {
              if (!page.data.pinned) {
                this.removeCard(child);
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
            this.removeCard(child);
            return;
          }
        }
      });

      document.addEventListener('places-cleared', () => {
        this.exitEditMode();

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
        card.meta = page.meta;
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

    enterEditMode: function(card) {
      if (this.selectedCard) {
        this.selectedCard.classList.remove('selected');
      }
      if (card) {
        this.selectedCard = card;
        card.classList.add('selected');
      }

      this.editMode = true;
      document.body.classList.add('edit-mode');
      this.remove.classList.add('active');
    },

    exitEditMode: function() {
      if (!this.editMode) {
        return;
      }

      this.editMode = false;
      document.body.classList.remove('edit-mode');
      this.remove.classList.remove('active');
      if (this.selectedCard) {
        this.selectedCard.classList.remove('selected');
        this.selectedCard = null;
      }
    },

    removeCard: function(card) {
      if (this.selectedCard === card) {
        this.selectedCard = null;
      }
      this.pages.removeChild(card, () => {
        if (!this.empty && this.pages.children.length === 0) {
          this.exitEditMode();
          this.empty = true;
          this.panel.classList.add('empty');
        }
      });
    },

    unpinSelectedCard: function() {
      if (!this.selectedCard) {
        return;
      }

      var id = this.selectedCard.dataset.id;

      // Remove child immediately, datastore operations can be quite slow
      this.removeCard(this.selectedCard);

      this.pagesStore.get(id).then(entry => {
        entry.data.pinned = false;
        this.pagesStore.datastore.put(entry.data, id).then(() => {},
          e => {
            console.error('Error unpinning page:', e);
          });
      }, e => {
        console.error('Error retrieving page to unpin:', e);
      });
    },

    handleEvent: function(e) {
      switch (e.type) {
      case 'click':
        if (e.target.nodeName !== 'GAIA-PIN-CARD') {
          break;
        }

        if (this.editMode) {
          this.enterEditMode(e.target);
        } else {
          this.launchCard(e.target);
        }
        break;

      case 'contextmenu':
        if (e.target.nodeName !== 'GAIA-PIN-CARD') {
          break;
        }
        this.enterEditMode(e.target);
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

      case 'resize':
        this.pages.synchronise();
        break;
      }
    }
  };

  exports.Pages = Pages;

}(window));
