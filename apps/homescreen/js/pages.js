/* global PagesMetadata, PagesStore, IconsHelper, Settings */
'use strict';

(function(exports) {
  /**
   * The size in pixels of the icons in the pinned pages.
   */
  const PAGES_ICON_SIZE = 30;

  /**
   * Timeout before resizing the apps grid after apps change.
   */
  const RESIZE_TIMEOUT = 500;

  /**
   * The distance at the top and bottom of the icon container that when hovering
   * an icon in will cause scrolling.
   */
  const AUTOSCROLL_DISTANCE = 40;

  /**
   * The timeout before auto-scrolling a page when hovering at the edges
   * of the grid.
   */
  const AUTOSCROLL_DELAY = 750;

  /**
   * The time to wait after setting a scroll-position before disabling
   * overflow during drag-and-drop.
   */
  const AUTOSCROLL_OVERFLOW_DELAY = 500;

  function Pages() {
    // Element references
    this.panel = document.getElementById('pages-panel');
    this.pages = document.getElementById('pages');
    this.scrollable = document.querySelector('#pages-panel > .scrollable');
    this.remove = document.getElementById('remove');
    this.done = document.getElementById('done');

    // Tracking if the list is empty
    this.empty = true;

    // Paging
    this.resizeTimeout = null;
    this.pageHeight = 1;
    this.pendingGridHeight = 1;
    this.iconsLeft = 0;
    this.iconsRight = 0;

    // Drag-and-drop
    this.dragging = false;
    this.draggedIndex = -1;
    this.autoScrollInterval = null;
    this.autoScrollOverflowTimeout = null;
    this.hoverIcon = null;

    // Edit mode
    this.editMode = false;

    // Icon and grid sizing behaviour
    this.lastWindowHeight = window.innerHeight;

    // Signal handlers
    this.pages.addEventListener('click', this);
    this.pages.addEventListener('contextmenu', this);
    this.pages.addEventListener('keydown', this);
    this.pages.addEventListener('drag-start', this);
    this.pages.addEventListener('drag-move', this);
    this.pages.addEventListener('drag-end', this);
    this.pages.addEventListener('drag-rearrange', this);
    this.pages.addEventListener('drag-finish', this);
    window.addEventListener('resize', this);
    window.addEventListener('settings-changed', this);

    this.done.addEventListener('click', e => {
      e.preventDefault();
      this.exitEditMode();
    });

    this.remove.addEventListener('click', e => {
      e.preventDefault();
      this.unpinSelectedCard();
    });

    // Settings
    this.settings = new Settings();
    this.scrollable.classList.toggle('snapping', this.settings.scrollSnapping);

    // Populate pinned pages asynchronously
    this.startupMetadata = [];
    this.metadata = new PagesMetadata();
    this.pagesStore = new PagesStore('places');

    Promise.all([
      this.metadata.init().then(() => {
          return this.metadata.getAll(result => {
            this.startupMetadata.push(result);
          }).then(Promise.resolve(),
            e => {
              console.error('Failed to retrieve metadata entries', e);
              return Promise.resolve();
            });
        },
        (e) => {
          console.error('Failed to initialise metadata db', e);
          return Promise.resolve();
        }),

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
                    this.storePagesOrder();
                  }
                  return;
                }
              }

              if (!page.data.pinned) {
                return;
              }

              // A new page was pinned.
              this.addPinnedPage(page.data);
              this.storePagesOrder();
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
            this.storePagesOrder();
            this.refreshGridSize();
            this.snapScrollPosition();
          });
        },
        (e) => {
          console.error('Error initialising pinned pages', e);
        })
        .then(() => {
          return this.pagesStore.getAll()
            .catch((e) => {
              console.error('Error getting pinned pages', e);
            });
        })
    ]).then((result) => {
      var pages = result[1];

      for (var page of pages) {
        this.addPinnedPage(page.data);
      }

      // If there are no pinned pages, display helpful information.
      if (this.empty) {
        this.panel.classList.add('empty');
      }
      this.storePagesOrder();
      this.refreshGridSize();
      this.snapScrollPosition();
    });
  }

  Pages.prototype = {
    updatePinnedPage: function(card, page) {
      if (this.startupMetadata !== null) {
        var entry = this.startupMetadata.findIndex(data => data.id === page.id);

        // Try to insert the card in the right order
        if (entry !== -1 && this.startupMetadata[entry].order >= 0) {
          card.order = this.startupMetadata[entry].order;
          this.startupMetadata.splice(entry, 1);
          var children = this.pages.children;
          for (var i = 0, iLen = children.length; i < iLen; i++) {
            var child = children[i];
            if (child.order !== -1 && child.order < card.order) {
              continue;
            }
            this.pages.insertBefore(card, child);
            break;
          }
        }
      }

      if (!card.parentNode) {
        this.pages.insertBefore(card, this.pages.firstChild);
      }

      card.title = page.title;
      card.dataset.id = page.url;
      page.meta = page.meta || {};

      if (page.screenshot) {
        page.meta.screenshot = page.screenshot;
      }

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

      if (this.empty) {
        this.empty = false;
        this.panel.classList.remove('empty');
      }
      this.refreshGridSize();
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
        this.storePagesOrder();
        this.refreshGridSize();
        this.snapScrollPosition();
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

    getChildIndex: function(child) {
      // XXX Note, we're taking advantage of gaia-container using
      //     Array instead of HTMLCollection here.
      return this.pages.children.indexOf(child);
    },

    storePagesOrder: function() {
      var storedOrders = [];
      var children = this.pages.children;
      for (var i = 0, iLen = children.length; i < iLen; i++) {
        var id = children[i].dataset.id;
        storedOrders.push({ id: id, order: i });
        children[i].order = i;
      }

      this.metadata.set(storedOrders).then(
        () => {},
        (e) => {
          console.error('Error storing app order', e);
        });
    },

    toggleScrollSnapping: function(scrollSnapping) {
      if (this.scrollable.classList.contains('snapping') === scrollSnapping) {
        return;
      }

      this.scrollable.classList.toggle('snapping', scrollSnapping);
      this.snapScrollPosition();
    },

    refreshGridSize: function() {
      var children = this.pages.children;
      var cols = 2;

      if (children[0]) {
        this.iconsLeft = this.pages.getChildOffsetRect(children[0]).left;
      }
      if (children[1]) {
        this.iconsRight =
          this.pages.getChildOffsetRect(children[cols - 1]).right;
      }

      if (children.length < 1) {
        // Reset these to default values when all children have been removed
        this.pendingGridHeight = this.gridHeight = 0;
        this.pageHeight = this.scrollable.clientHeight;
      } else {
        var iconHeight = Math.round(children[0].offsetHeight);
        var scrollHeight = this.scrollable.clientHeight;
        var rowsPerPage = Math.floor(scrollHeight / iconHeight);
        var pageHeight = rowsPerPage * iconHeight;
        var gridHeight;

        if (this.settings.scrollSnapping) {
          gridHeight = (Math.ceil((iconHeight *
              Math.ceil(children.length / cols)) / pageHeight) *
            pageHeight) + (scrollHeight - pageHeight);
        } else {
          gridHeight = (Math.ceil(children.length / cols) + 1) * iconHeight;
        }

        this.pageHeight = pageHeight;
        this.pendingGridHeight = gridHeight;
        this.iconsPerPage = rowsPerPage * cols;
      }

      // Reset scroll-snap points
      this.scrollable.style.scrollSnapPointsY = `repeat(${this.pageHeight}px)`;

      // Set page border background
      this.pages.style.backgroundSize = `100% ${(this.pageHeight * 2)}px`;

      // Make sure the grid is a multiple of the page size. If the size has
      // shrunk we do this in a timeout so that the page scrolls has time
      // to scroll into place before we shrink the container.
      if (this.resizeTimeout !== null) {
        clearTimeout(this.resizeTimeout);
      }
      var setGridHeight = () => {
        this.resizeTimeout = null;
        this.pages.style.height = gridHeight + 'px';
        this.gridHeight = this.pendingGridHeight;
      };
      if (this.pendingGridHeight > this.gridHeight) {
        setGridHeight();
      } else if (this.pendingGridHeight !== this.gridHeight) {
        this.resizeTimeout = setTimeout(setGridHeight, RESIZE_TIMEOUT);
      }
    },

    snapScrollPosition: function(bias) {
      bias = bias || 0;
      var gridHeight = this.pendingGridHeight;
      var currentScroll = this.scrollable.scrollTop;
      var scrollHeight = this.scrollable.clientHeight;

      var destination;
      if (this.settings.scrollSnapping) {
        destination = Math.min(gridHeight - scrollHeight,
          Math.round(currentScroll / this.pageHeight + bias) * this.pageHeight);
      } else {
        destination = Math.min(gridHeight - scrollHeight,
          currentScroll + (this.pageHeight * bias));
      }

      if (Math.abs(destination - currentScroll) > 1) {
        this.scrollable.style.overflow = '';
        this.scrollable.scrollTo(
          { left: 0, top: destination, behavior: 'smooth' });

        if (this.autoScrollOverflowTimeout !== null) {
          clearTimeout(this.autoScrollOverflowTimeout);
          this.autoScrollOverflowTimeout = null;
        }

        if (this.dragging) {
          document.body.classList.add('autoscroll');
          this.autoScrollOverflowTimeout = setTimeout(() => {
            this.autoScrollOverflowTimeout = null;
            this.scrollable.style.overflow = 'hidden';
            document.body.classList.remove('autoscroll');
            this.scrollable.scrollTop = destination;
          }, AUTOSCROLL_OVERFLOW_DELAY);
        }
      }
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

      // Disable scrolling during dragging, and display bottom-bar
      case 'drag-start':
        console.debug('Drag-start on ' + e.detail.target.dataset.id);
        this.dragging = true;
        this.shouldEnterEditMode = true;
        document.body.classList.add('dragging');
        this.scrollable.style.overflow = 'hidden';
        this.draggedIndex = this.getChildIndex(e.detail.target);
        break;

      case 'drag-finish':
        console.debug('Drag-finish');
        this.dragging = false;
        document.body.classList.remove('dragging');
        document.body.classList.remove('autoscroll');
        this.scrollable.style.overflow = '';

        if (this.autoScrollInterval !== null) {
          clearInterval(this.autoScrollInterval);
          this.autoScrollInterval = null;
        }

        if (this.autoScrollOverflowTimeout !== null) {
          clearTimeout(this.autoScrollOverflowTimeout);
          this.autoScrollOverflowTimeout = null;
        }

        if (this.hoverIcon) {
          this.hoverIcon.classList.remove('hover-before', 'hover-after');
          this.hoverIcon = null;
        }

        // Restore normal drag-and-drop after dragging selected icons
        this.pages.dragAndDropTimeout = -1;
        break;

      // Handle app/site editing and dragging to the end of the icon grid.
      case 'drag-end':
        console.debug('Drag-end, target: ' + (e.detail.dropTarget ?
            e.detail.dropTarget.dataset.id : 'none'));
        if (e.detail.dropTarget === null &&
          e.detail.clientX >= this.iconsLeft &&
          e.detail.clientX < this.iconsRight) {
          // If the drop target is null, and the client coordinates are
          // within the panel, we must be dropping over the start or end of
          // the container.
          e.preventDefault();
          var bottom = e.detail.clientY < this.lastWindowHeight / 2;
          console.debug('Reordering dragged icon to ' +
            (bottom ? 'bottom' : 'top'));
          this.pages.reorderChild(e.detail.target,
            bottom ? this.pages.firstChild : null,
            this.storePagesOrder.bind(this));
          break;
        }

        if (e.detail.dropTarget === e.detail.target) {
          var icon = e.detail.target;
          if (this.editMode || this.shouldEnterEditMode) {
            e.preventDefault();
            this.enterEditMode(icon);
          }
        }
        break;

      // Save the app grid after rearrangement
      case 'drag-rearrange':
        console.debug('Drag rearrange');
        this.storePagesOrder();
        break;

      // Handle app-uninstall bar highlight and auto-scroll
      case 'drag-move':
        var inAutoscroll = false;

        if (e.detail.clientY > this.lastWindowHeight - AUTOSCROLL_DISTANCE) {
          // User is dragging in the lower auto-scroll area
          inAutoscroll = true;
          if (this.autoScrollInterval === null) {
            this.autoScrollInterval = setInterval(() => {
              this.shouldEnterEditMode = false;
              this.snapScrollPosition(1);
              return true;
            }, AUTOSCROLL_DELAY);
          }
        } else if (e.detail.clientY < AUTOSCROLL_DISTANCE) {
          // User is dragging in the upper auto-scroll area
          inAutoscroll = true;
          if (this.autoScrollInterval === null) {
            this.autoScrollInterval = setInterval(() => {
              this.shouldEnterEditMode = false;
              this.snapScrollPosition(-1);
              return true;
            }, AUTOSCROLL_DELAY);
          }
        } else {
          // User is dragging in the grid, provide some visual feedback
          var hoverIcon = this.pages.getChildFromPoint(e.detail.clientX,
            e.detail.clientY);
          if (this.hoverIcon !== hoverIcon) {
            if (this.hoverIcon) {
              this.shouldEnterEditMode = false;
              this.hoverIcon.classList.remove('hover-before', 'hover-after');
            }
            this.hoverIcon = (hoverIcon !== e.detail.target) ?
              hoverIcon : null;

            if (this.hoverIcon) {
              var offset = this.draggedIndex -
                this.getChildIndex(this.hoverIcon);
              this.hoverIcon.classList.add((offset >= 0) ?
                'hover-before' : 'hover-after');
            }
          }
        }

        if (!inAutoscroll && this.autoScrollInterval !== null) {
          clearInterval(this.autoScrollInterval);
          this.autoScrollInterval = null;
        }
        break;

      case 'resize':
        this.pages.synchronise();
        break;

      case 'settings-changed':
        this.toggleScrollSnapping(this.settings.scrollSnapping);
        break;
      }
    }
  };

  exports.Pages = Pages;

}(window));
