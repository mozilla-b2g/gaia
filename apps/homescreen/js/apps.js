/* global MozActivity, AppsMetadata, LazyLoader, FirstRun,
          IconsHelper, Settings, PinnedPlaces */
'use strict';

(function(exports) {
  /**
   * Timeout before resizing the apps grid after apps change.
   */
  const RESIZE_TIMEOUT = 500;

  /**
   * Timeout before showing a dialog. Without this, the click that comes through
   * after an activate event from gaia-container will close the dialog.
   */
  const DIALOG_SHOW_TIMEOUT = 50;

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

  /**
   * Delay before storing app order. Used so that multiple calls to
   * storeAppOrder coalesce into a single call.
   */
  const STORE_APP_ORDER_DELAY = 250;

  /**
   * The horizontal padding, in px around the icon grid and the horizontal
   * border size, in px, around individual icons. Used to calculate icon
   * size.
   */
  const GRID_PADDING = 6;
  const ICON_BORDER = 8;
  const SMALL_ICON_BORDER = 4;

  /**
   * App roles that will be skipped on the homescreen.
   */
  const HIDDEN_ROLES = [
    'system', 'input', 'homescreen', 'theme', 'addon', 'langpack'
  ];

  /**
   * Strings that are matched against to black-list app origins.
   * TODO: This should not be hard-coded.
   */
  const BLACKLIST = [];

  function Apps() {
    // Chrome is displayed
    window.performance.mark('navigationLoaded');

    // Element references
    this.panel = document.getElementById('apps-panel');
    this.scrollable = document.querySelector('#apps-panel > .scrollable');
    this.icons = document.getElementById('apps');
    this.remove = document.getElementById('remove');
    this.rename = document.getElementById('rename');
    this.done = document.getElementById('done');
    this.cancelDownload = document.getElementById('cancel-download');
    this.resumeDownload = document.getElementById('resume-download');
    this.confirmUnpin = document.getElementById('confirm-unpin-site');
    this.dialogs =
      [this.cancelDownload, this.resumeDownload, this.confirmUnpin];

    // Paging
    this.resizeTimeout = null;
    this.pageHeight = 1;
    this.gridHeight = 1;
    this.pendingGridHeight = 1;
    this.iconsPerPage = 0;
    this.iconsLeft = 0;
    this.iconsRight = 0;

    // Scroll behaviour
    this.appsVisible = false;

    // Drag-and-drop
    this.container = null;
    this.dragging = false;
    this.draggedIndex = -1;
    this.autoScrollInterval = null;
    this.autoScrollOverflowTimeout = null;
    this.hoverIcon = null;
    this.openGroup = null;

    // Edit mode
    this.editMode = false;
    this.shouldEnterEditMode = false;
    this.shouldCreateGroup = false;
    this.draggingGroup = false;
    this.selectedIcon = null;
    this.rename.addEventListener('click', e => {
      e.preventDefault();
      this.renameSelectedIcon();
    });
    this.remove.addEventListener('click', e => {
      e.preventDefault();
      this.removeSelectedIcon();
    });
    this.done.addEventListener('click', e => {
      e.preventDefault();
      this.exitEditMode();
    });

    // Icon and grid sizing behaviour
    this._iconSize = 0;
    this.lastWindowWidth = window.innerWidth;
    this.lastWindowHeight = window.innerHeight;

    // Signal handlers
    this.attachInputHandlers(this.icons);
    this.touchSelectedIcon = this.touchSelectedIcon.bind(this);
    this.icons.addEventListener('touchstart', this);
    window.addEventListener('localized', this);
    window.addEventListener('online', this);
    window.addEventListener('resize', this);
    window.addEventListener('settings-changed', this);
    window.addEventListener('settings-ready', this);

    // Settings
    this.settings = new Settings();
  }

  Apps.prototype = {
    init: function() {
      this.icons.classList.toggle('small', this.settings.small);
      this.scrollable.classList.toggle('snapping',
        this.settings.scrollSnapping);
      this.storeAppOrderTimeout = null;

      // Populate apps and bookmarks asynchronously
      this.metadataLoaded = 0;
      this.startupMetadata = [];
      this.iconsToRetry = [];
      this.pendingIcons = {};
      this.metadata = new AppsMetadata();
      this.places = new PinnedPlaces();

      // Make sure icons isn't doing lots of unnecessary work while we're
      // loading the first screen of apps.
      this.visualLoadComplete = false;
      this.icons.freeze();
      this.icons.classList.add('loading');

      Promise.all([
        // Load app metadata. If metadata loading fails, continue populating
        // apps anyway - it means they'll be in the default order and their
        // order won't save, but it's better than showing a blank screen.
        // If this is the first run, get the app order from the first-run
        // script after initialising the metadata database.
        this.metadata.init().then(this.settings.firstRun ? () => {
          return LazyLoader.load('js/firstrun.js').then(
            () => {
              return FirstRun().then((results) => {
                this.toggleSmall(results.small);
                this.startupMetadata = results.order;
                this.settings.small = results.small;
                this.settings.save();
                return Promise.resolve();
              }, (e) => {
                console.error('Error running first-run script', e);
                return Promise.resolve();
              });
            },
            (e) => {
              console.error('Failed to load first-run script');
              return Promise.resolve();
            });
          } :
          () => {
            return this.metadata.getAll(result => {
              this.startupMetadata.push(result);
              this.metadataLoaded++;

              // Process results in batches as they come in
              var processResult = data => {
                if (this.pendingIcons[data.id]) {
                  var args = this.pendingIcons[data.id];
                  delete this.pendingIcons[data.id];
                  this.addAppIcon.apply(this, args);
                }
              };

              if (!this.visualLoadComplete) {
                processResult(result);
                this.refreshGridSize();
              } else if ((this.metadataLoaded % this.iconsPerPage) === 0) {
                this.icons.freeze();
                for (var entry of this.startupMetadata) {
                  processResult(entry);
                }
                this.refreshGridSize();
                this.icons.thaw();
              }
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

        // Initialise and populate pinned sites
        this.places.init('sites').then(() => {
          document.addEventListener('sites-pinned', (e) => {
            var url = e.detail.url;
            this.places.get(url).then((bookmark) => {
              this.iterateIcons(icon => {
                if (icon.bookmark && icon.bookmark.id === url) {
                  icon.bookmark = bookmark;
                  icon.refresh();
                }
              });
              this.addAppIcon(bookmark);
              this.storeAppOrder();
            });
          });

          document.addEventListener('sites-unpinned', (e) => {
            var url = e.detail.url;
            this.iterateIcons((icon, container, parent) => {
              if (icon.bookmark && icon.bookmark.id === url) {
                parent.removeChild(container, () => {
                  this.storeAppOrder();
                  this.refreshGridSize();
                  this.snapScrollPosition();
                });
                this.metadata.remove(url);

                if (this.selectedIcon === icon) {
                  this.updateSelectedIcon(null);
                }
              }
            });
          });

          return this.places.getAll().then(sites => {
            for (var site of sites) {
              this.addAppIcon(site);
            }
          }, e => {
            console.error('Error initialising sites DB', e);
            return Promise.resolve();
          });
        })
      ]).then(() => {
        // Add any applications that were missed and are in the startup metadata
        var id;
        var pendingIcons = this.pendingIcons;
        this.pendingIcons = {};
        for (id in pendingIcons) {
          this.addAppIcon.apply(this, pendingIcons[id]);
        }

        // Make sure icons has been thawed
        if (!this.visualLoadComplete) {
          this.onVisualLoad();
        }

        // Remove unknown entries from the startup metadata
        if (!this.settings.firstRun) {
          for (var data of this.startupMetadata) {
            console.log('Removing unknown app metadata entry', data.id);
            this.metadata.remove(data.id).then(
              () => {},
              (e) => {
                console.error('Error removing unknown app metadata entry', e);
              });
          }
        }
        this.startupMetadata = null;

        // Update icons that we've added from the startup metadata in case
        // their icons have updated or the icon size has changed.
        this.iterateIcons(icon => {
          this.refreshIcon(icon);
        });

        // Add any applications that aren't in the startup metadata
        var newIcons = false;
        pendingIcons = this.pendingIcons;
        for (id in pendingIcons) {
          this.addAppIcon.apply(this, pendingIcons[id]);
          newIcons = true;
        }
        this.pendingIcons = null;

        // Store app order of new icons
        if (newIcons) {
          this.storeAppOrder();
        } else {
          // Grid size is only refreshed in the non-startup path, so unless we
          // added new icons post-startup, refresh here to make sure it's the
          // correct size.
          this.refreshGridSize();
        }

        // All asynchronous loading has finished
        window.performance.mark('fullyLoaded');
      });
    },

    attachInputHandlers: function(container) {
      if (this.container) {
        if (this.container === container) {
          return;
        }

        this.container.removeEventListener('activate', this);
        this.container.removeEventListener('drag-start', this);
        this.container.removeEventListener('drag-move', this);
        this.container.removeEventListener('drag-end', this);
        this.container.removeEventListener('drag-rearrange', this);
        this.container.removeEventListener('drag-finish', this);
      }

      this.container = container;
      container.addEventListener('activate', this);
      container.addEventListener('drag-start', this);
      container.addEventListener('drag-move', this);
      container.addEventListener('drag-end', this);
      container.addEventListener('drag-rearrange', this);
      container.addEventListener('drag-finish', this);
    },

    get iconSize() {
      // If this._iconSize is 0, let's refresh the value.
      if (!this._iconSize) {
        var minColumns = 3;
        this._iconSize = Math.round(
          (this.icons.clientWidth - 2 * GRID_PADDING) / minColumns -
          2 * (this.settings.small ? SMALL_ICON_BORDER : ICON_BORDER));
      }

      return this._iconSize;
    },

    toggleSmall: function(small) {
      if (this.icons.classList.contains('small') === small) {
        return;
      }

      this.icons.classList.toggle('small', small);
      this.icons.synchronise();
      for (var container of this.icons.children) {
        var child = container.firstElementChild;
        if (child.localName === 'homescreen-group') {
          child.container.synchronise();
        }
      }
      this.refreshGridSize();
      this.snapScrollPosition();
    },

    toggleScrollSnapping: function(scrollSnapping) {
      if (this.scrollable.classList.contains('snapping') === scrollSnapping) {
        return;
      }

      this.scrollable.classList.toggle('snapping', scrollSnapping);
      this.snapScrollPosition();
    },

    onVisualLoad: function() {
      this.visualLoadComplete = true;
      this.icons.thaw();
      this.icons.classList.remove('loading');

      // App/bookmark loading happens asynchronously and we call this function
      // when we've loaded as many apps as necessary to fill the screen.
      window.performance.mark('visuallyLoaded');
      window.performance.mark('contentInteractive');
    },

    /**
     * Iterate over icons in the panel.
     * @callback: Callback to call, given three parameters;
     *   icon: The icon element
     *   container: The top-level container of the icon
     *   parent: The parent of the container housing the icon
     */
    iterateIcons: function(callback) {
      for (var container of this.icons.children) {
        var child = container.firstElementChild;
        if (child.localName === 'homescreen-group') {
          for (var subContainer of child.container.children) {
            callback(subContainer.firstElementChild,
                     subContainer, child.container);
          }
        } else {
          callback(child, container, this.icons);
        }
      }
    },

    addGroup: function(before) {
      var group = document.createElement('homescreen-group');
      var container = document.createElement('div');
      container.classList.add('group-container');
      container.order = -1;
      container.appendChild(group);
      this.icons.insertBefore(container, before);

      return group;
    },

    addApp: function(app) {
      var manifest = app.manifest || app.updateManifest;
      if (!manifest) {
        //console.log('Skipping app with no manifest', app);
        return;
      }

      // Do not add blacklisted apps
      if (BLACKLIST.includes(app.origin)) {
        return;
      }

      if (manifest.entry_points) {
        for (var entryPoint in manifest.entry_points) {
          this.addAppIcon(app, entryPoint);
        }
      } else {
        this.addAppIcon(app);
      }
    },

    addIconContainer: function(icon, entry, parent) {
      var container = document.createElement('div');
      container.classList.add((icon.localName === 'homescreen-group') ?
                              'group-container' : 'icon-container');
      container.order = -1;
      container.appendChild(icon);

      // Try to insert the container in the right order
      if (entry !== -1 && this.startupMetadata[entry].order >= 0) {
        container.order = this.startupMetadata[entry].order;
        var children = parent.children;
        for (var i = 0, iLen = children.length; i < iLen; i++) {
          var child = children[i];
          if (child.order !== -1 && child.order < container.order) {
            continue;
          }
          parent.insertBefore(container, child);
          if (this.startupMetadata === null) {
            this.iconAdded(container);
          }
          break;
        }
      }

      if (!container.parentNode) {
        parent.appendChild(container);
        if (this.startupMetadata === null) {
          this.iconAdded(container);
        }
      }

      return container;
    },

    getIconId: function(appOrBookmark, entryPoint) {
      if (appOrBookmark.id) {
        return appOrBookmark.id;
      } else {
        return appOrBookmark.manifestURL + '/' + (entryPoint ? entryPoint : '');
      }
    },

    addAppIcon: function(appOrBookmark, entryPoint) {
      var id = this.getIconId(appOrBookmark, entryPoint);
      var entry = -1;

      if (this.startupMetadata !== null) {
        entry = this.startupMetadata.findIndex(data => {
          return data.id === id;
        });
        if (entry === -1) {
          this.pendingIcons[id] = [...arguments];
          return;
        }
      }

      // Check if the icon is grouped and create a group, fetch a group or
      // delay adding as necessary
      var parent = this.icons;
      var groupId = (entry !== -1) ? this.startupMetadata[entry].group : '';
      if (groupId && groupId !== '') {
        if (groupId === id) {
          // We need to create a group
          var group = document.createElement('homescreen-group');
          this.addIconContainer(group, entry, this.icons);
          parent = group.container;

          group.addEventListener('activated', e => {
            this.handleEvent({ type: 'activate',
                               detail: { target: e.target.parentNode },
                               preventDefault: () => {}});
          });
        } else {
          // We need to add to an existing group, or delay if one doesn't exist.
          // In the situation that a group doesn't exist and we've finished
          // startup, just add the icon without a group. This shouldn't happen,
          // but we shouldn't fail if it somehow does.
          var groupFound = false;
          this.iterateIcons((icon, container, iconParent) => {
            if (groupFound) {
              return;
            }
            var id = this.getIconId(icon.app ? icon.app : icon.bookmark,
                                    icon.entryPoint);
            if (id === groupId) {
              parent = iconParent;
              groupFound = true;
            }
          });

          if (parent === this.icons && this.startupMetadata !== null) {
            // We didn't find the group and we're still starting up, so delay
            // adding this icon.
            this.pendingIcons[id] = Array.slice(arguments);
            return;
          }
          if (parent === this.icons) {
            console.warn('Did not find group ' + groupId + ' for icon ' + id);
          }
        }
      }

      var icon = document.createElement('gaia-app-icon');
      if (entryPoint) {
        icon.entryPoint = entryPoint;
      }
      if (parent !== this.icons) {
        icon.showName = false;
      }

      var container = this.addIconContainer(icon, entry, parent);
      // Hide/show the icon if the role changes to/from a hidden role
      var handleRoleChange = function(app, container) {
        var manifest = app.manifest || app.updateManifest;
        var hidden = (manifest && manifest.role &&
          HIDDEN_ROLES.includes(manifest.role));
        container.style.display = hidden ? 'none' : '';
      };

      if (appOrBookmark.id) {
        icon.bookmark = appOrBookmark;
        this.refreshIcon(icon);
        handleRoleChange(appOrBookmark, container);
      }

      // Save the new icon if it gets refreshed.
      this.iconsToRetry.push(id);
      icon.addEventListener('icon-loaded', function(icon, id) {
        if (icon.isUserSet) {
          // If the icon was set manually, we don't cache it.
          return;
        }

        icon.icon.then((blob) => {
          // Remove icon from list of icons to retry when we go online
          var retryIndex = this.iconsToRetry.indexOf(id);
          if (retryIndex !== -1) {
            this.iconsToRetry.splice(retryIndex, 1);
          }

          this.metadata.set([{ id: id, icon: blob }]).then(
            () => {},
            (e) => {
              console.error('Error saving icon', e);
            });
        });
      }.bind(this, icon, id));

      // Refresh icon image and title
      icon.size = this.iconSize;
      if (entry !== -1) {
        // Load the cached icon and update name
        icon.icon = this.startupMetadata[entry].icon;
        this.startupMetadata.splice(entry, 1);
        icon.updateName();
      } else {
        // Start loading a new icon and update name
        icon.refresh();
      }

      // Override default launch behaviour
      icon.addEventListener('activated', e => {
        e.preventDefault();
        this.handleEvent({ type: 'activate',
                           detail: { target: e.target.parentNode },
                           preventDefault: () => {}});
      });
    },

    refreshIcon: function(icon) {
      icon.size = this.iconSize;
      if (icon.bookmark) {
        IconsHelper.setElementIcon(icon, this.iconSize).then(() => {},
          e => {
            console.error('Error refreshing bookmark icon', e);

            // Refreshing a bookmark icon will set the default icon image if
            // no user icon has been set.
            if (!icon.isUserSet) {
              icon.refresh();
            }
          });
      } else {
        icon.refresh();
      }
    },

    storeAppOrder: function() {
      if (this.storeAppOrderTimeout !== null) {
        clearTimeout(this.storeAppOrderTimeout);
      }

      this.storeAppOrderTimeout = setTimeout(() => {
        this.storeAppOrderTimeout = null;

        var i = 0;
        var storedOrders = [];
        var group = '';
        this.iterateIcons((icon, container, parent) => {
          var id = this.getIconId(icon.app ? icon.app : icon.bookmark,
                                  icon.entryPoint);
          if (parent === this.icons) {
            group = '';
          } else if (group === '') {
            group = id;
          }
          storedOrders.push({ id: id, order: i++, group: group });
        });

        this.metadata.set(storedOrders).then(
          () => {},
          (e) => {
            console.error('Error storing app order', e);
          });
      }, STORE_APP_ORDER_DELAY);
    },

    iconAdded: function(container) {
      // Refresh the grid size if this child is visible
      if (container.style.display === 'none') {
        return;
      }

      this.refreshGridSize();
    },

    refreshGridSize: function() {
      var children = this.icons.children;
      var cols = this.settings.small ? 4 : 3;

      var visibleChildren = 0;
      var firstVisibleChild = -1;
      for (var i = 0, iLen = children.length; i < iLen; i++) {
        if (children[i].style.display !== 'none') {
          visibleChildren ++;
          if (firstVisibleChild === -1) {
            firstVisibleChild = i;
            this.iconsLeft = this.icons.getChildOffsetRect(children[i]).left;
          } else if (visibleChildren === cols) {
            this.iconsRight = this.icons.getChildOffsetRect(children[i]).right;
          }
        }
      }

      if (visibleChildren < 1) {
        // Reset these to default values when all children have been removed
        this.pendingGridHeight = this.gridHeight = 0;
        this.pageHeight = this.scrollable.clientHeight;
      } else {
        var iconHeight = Math.round(children[firstVisibleChild].offsetHeight);
        var scrollHeight = this.scrollable.clientHeight;
        var rowsPerPage = Math.floor(scrollHeight / iconHeight);
        var pageHeight = rowsPerPage * iconHeight;
        var gridHeight;

        if (this.settings.scrollSnapping) {
          gridHeight = (Math.ceil((iconHeight *
            Math.ceil(visibleChildren / cols)) / pageHeight) *
            pageHeight) + (scrollHeight - pageHeight);
        } else {
          gridHeight = (Math.ceil(visibleChildren / cols) + 1) * iconHeight;
        }

        this.pageHeight = pageHeight;
        this.pendingGridHeight = gridHeight;
        this.iconsPerPage = rowsPerPage * cols;

        // When a full screen of apps is visible, we mark that as visual loading
        // being complete.
        if (!this.visualLoadComplete &&
            Math.floor(visibleChildren / cols) * iconHeight >= scrollHeight) {
          this.onVisualLoad();
        }
      }

      // Reset scroll-snap points
      this.scrollable.style.scrollSnapPointsY = `repeat(${this.pageHeight}px)`;

      // Set page border background
      this.icons.style.backgroundSize = '100% ' + (this.pageHeight * 2) + 'px';

      // Make sure the grid is a multiple of the page size. If the size has
      // shrunk we do this in a timeout so that the page scrolls has time
      // to scroll into place before we shrink the container.
      if (this.resizeTimeout !== null) {
        clearTimeout(this.resizeTimeout);
      }
      var setGridHeight = () => {
        this.resizeTimeout = null;
        this.icons.style.height = this.pendingGridHeight + 'px';
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

    showActionDialog: function(dialog, args, callbacks) {
      // XXX Working around gaia-components issue #8.
      if (dialog.style.display !== 'none') {
        return;
      }

      function executeCallback(dialog, callback) {
        callback();
        dialog.close();
      }

      var actions = dialog.getElementsByClassName('action');
      for (var i = 0, iLen = Math.min(actions.length, callbacks.length);
           i < iLen; i++) {
        actions[i].onclick = executeCallback.bind(this, dialog, callbacks[i]);
      }
      if (args) {
        dialog.querySelector('.body').setAttribute('data-l10n-args', args);
      }
      setTimeout(() => { dialog.open(); }, DIALOG_SHOW_TIMEOUT);
    },

    getChildIndex: function(child) {
      // XXX Note, we're taking advantage of gaia-container using
      //     Array instead of HTMLCollection here.
      return this.container.children.indexOf(child);
    },

    removeSelectedIcon: function() {
      if (!this.selectedIcon) {
        return;
      }

      if (this.selectedIcon.bookmark) {
        this.showActionDialog(this.confirmUnpin,
          JSON.stringify({ name: this.selectedIcon.name }),
          [() => {
             this.places.unpin(this.selectedIcon.bookmark.id).then(() => {
               this.enterEditMode(null);
             });
           }]);
      }
    },

    renameSelectedIcon: function() {
      if (!this.selectedIcon || !this.selectedIcon.bookmark) {
        return;
      }

      var rename = new MozActivity({
        name: 'save-bookmark',
        data: { type: 'url', url: this.selectedIcon.bookmark.id }
      });

      // Re-enter edit mode because the activity will hide the document,
      // which exits edit mode
      var icon = this.selectedIcon;
      rename.onsuccess = rename.onerror = () => {
        this.enterEditMode(icon);
      };
    },

    iconIsEditable: function(icon) {
      return (icon.bookmark || (icon.app && icon.app.removable)) ? true : false;
    },

    touchSelectedIcon: function() {
      // Activate drag-and-drop immediately for selected icons
      this.container.dragAndDropTimeout = 0;
    },

    updateSelectedIcon: function(icon) {
      if (this.selectedIcon === icon) {
        return;
      }

      if (this.selectedIcon && (!icon || this.iconIsEditable(icon))) {
        this.selectedIcon.classList.remove('selected');
        this.selectedIcon.removeEventListener('touchstart',
                                              this.touchSelectedIcon);
        this.selectedIcon = null;
      }

      var selectedRenameable = false;
      var selectedRemovable = false;

      if (icon) {
        selectedRenameable = !!icon.bookmark;
        selectedRemovable = selectedRenameable || icon.app.removable;

        if (selectedRenameable || selectedRemovable) {
          this.selectedIcon = icon;
          icon.classList.add('selected');
          icon.addEventListener('touchstart', this.touchSelectedIcon);
          this.rename.classList.toggle('active', selectedRenameable);
          this.remove.classList.toggle('active', selectedRemovable);
        } else if (!icon.classList.contains('uneditable')) {
          icon.classList.add('uneditable');
          icon.addEventListener('animationend', function animEnd() {
            icon.removeEventListener('animationend', animEnd);
            icon.classList.remove('uneditable');
          });
        }
      } else {
        this.rename.classList.remove('active');
        this.remove.classList.remove('active');
      }
    },

    enterEditMode: function(icon) {
      console.debug('Entering edit mode on ' + (icon ? icon.name : 'no icon'));
      this.updateSelectedIcon(icon);

      if (this.editMode || !this.selectedIcon) {
        return;
      }

      this.editMode = true;
      document.body.classList.add('edit-mode');
    },

    exitEditMode: function() {
      if (!this.editMode) {
        return;
      }
      console.debug('Exiting edit mode');

      this.editMode = false;

      document.body.classList.remove('edit-mode');
      this.rename.classList.remove('active');
      this.remove.classList.remove('active');
      this.updateSelectedIcon(null);
    },

    elementName: function(element) {
      if (!element || !(element instanceof HTMLElement)) {
        return 'none';
      }

      var child = element.firstElementChild;
      return child.localName === 'homescreen-group' ?
        'group' : child.name;
    },

    isGroup: function(element) {
      return (element && element.firstElementChild &&
        element.firstElementChild.localName === 'homescreen-group') ?
        true : false;
    },

    closeOpenGroup: function() {
      if (this.openGroup) {
        this.icons.freeze();
        this.openGroup.collapse(this.icons, () => {
          this.icons.thaw();
          this.openGroup = null;
          this.attachInputHandlers(this.icons);
          this.icons.setAttribute('drag-and-drop', '');
        },
        this.storeAppOrder.bind(this));
      }
    },

    handleEvent: function(e) {
      var icon, id, rect;

      switch (e.type) {
      // App launching
      case 'activate':
        if (e.detail.target.parentNode.parentNode !== this.container) {
          break;
        }

        e.preventDefault();
        icon = e.detail.target.firstElementChild;
        if (icon.localName === 'homescreen-group') {
          this.openGroup = icon;
          icon.expand(this.icons);
          this.icons.removeAttribute('drag-and-drop');
          this.attachInputHandlers(icon.container);
          break;
        }

        // If we're in edit mode, remap taps to selection
        if (this.editMode) {
          this.enterEditMode(icon);
          break;
        }

        // TODO: I think we can remove this entire switch block, as this is
        //       all specific to mozApps. Leaving in case we recover some of
        //       this functionality with pinned sites.
        switch (icon.state) {
          case 'unrecoverable':
            break;

          case 'installing':
            this.showActionDialog(this.cancelDownload,
              JSON.stringify({ name: icon.name }),
              [() => {
                 icon.app.cancelDownload();
               }]);
            break;

          case 'error':
          case 'paused':
            this.showActionDialog(this.resumeDownload,
              JSON.stringify({ name: icon.name }),
              [() => {
                 icon.app.download();
               }]);
            break;

          default:
            icon.launch();
            break;
        }

        this.closeOpenGroup();
        break;

      // Close open group if we touch something in a different container
      case 'touchstart':
        if (!this.openGroup || e.target === this.openGroup) {
          break;
        }

        var parent = e.target.parentNode;
        while (parent && parent.localName !== 'gaia-container') {
          parent = parent.parentNode;
        }

        if (parent !== this.container) {
          this.closeOpenGroup();
          e.preventDefault();
        }
        break;

      // Disable scrolling during dragging, and display bottom-bar
      case 'drag-start':
        console.debug('Drag-start on ' + this.elementName(e.detail.target));
        this.dragging = true;
        this.draggingGroup = this.isGroup(e.detail.target);
        this.shouldEnterEditMode = !this.openGroup;
        this.shouldCreateGroup = false;
        this.container.classList.add('dragging');
        document.body.classList.add('dragging');
        this.scrollable.style.overflow = 'hidden';
        this.draggedIndex = this.getChildIndex(e.detail.target);
        break;

      case 'drag-finish':
        console.debug('Drag-finish');
        this.dragging = false;
        this.container.classList.remove('dragging');
        document.body.classList.remove('dragging', 'autoscroll');
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
          this.hoverIcon.classList.remove(
            'hover-before', 'hover-after', 'hover-over');
          this.hoverIcon = null;
        }

        if (e.detail.target && !this.shouldCreateGroup) {
          e.detail.target.classList.remove('hover-over-group');
        }

        // Restore normal drag-and-drop after dragging selected icons
        this.container.dragAndDropTimeout = -1;
        break;

      // Handle app/site editing and dragging to the end of the icon grid.
      case 'drag-end':
        console.debug('Drag-end, target: ' +
                      this.elementName(e.detail.dropTarget));
        if (e.detail.dropTarget === null) {
          e.preventDefault();

          // If there's an open group, check if we're dropping the icon outside
          // of the group.
          if (this.openGroup) {
            rect = this.openGroup.container.getBoundingClientRect();
            if (e.detail.clientY < rect.top || e.detail.clientY > rect.bottom) {
              console.debug('Removing from group');
              this.openGroup.transferToContainer(e.detail.target, this.icons);
              if (this.openGroup.container.children.length <= 1) {
                this.closeOpenGroup();
              }
              break;
            }
          }

          // If the drop target is null, and the client coordinates are
          // within the panel, we must be dropping over the start or end of
          // the container.
          if (e.detail.clientX >= this.iconsLeft &&
              e.detail.clientX < this.iconsRight) {
            var bottom = e.detail.clientY < this.lastWindowHeight / 2;
            console.debug('Reordering dragged icon to ' +
                        (bottom ? 'bottom' : 'top'));
            this.container.reorderChild(e.detail.target,
              bottom ? this.container.firstChild : null,
              this.storeAppOrder.bind(this));
          }
          break;
        }

        if (e.detail.dropTarget === e.detail.target) {
          icon = e.detail.target.firstElementChild;
          if (this.editMode || this.shouldEnterEditMode) {
            e.preventDefault();
            this.enterEditMode(icon);
          }
          break;
        }

        if (this.shouldCreateGroup) {
          var group;
          e.preventDefault();

          var storeOrderAndRemoveStyle = function(container) {
            this.storeAppOrder();
            container.classList.remove('hover-over-group');
          }.bind(this, e.detail.target);

          if (this.isGroup(e.detail.dropTarget)) {
            group = e.detail.dropTarget.firstElementChild;
            group.transferFromContainer(e.detail.target, this.icons,
                                        storeOrderAndRemoveStyle);
          } else {
            group = this.addGroup(e.detail.dropTarget);
            group.transferFromContainer(e.detail.dropTarget, this.icons,
                                        this.storeAppOrder.bind(this), true);
            group.transferFromContainer(e.detail.target, this.icons,
                                        storeOrderAndRemoveStyle);
          }
          this.refreshGridSize();
          this.snapScrollPosition();
        }
        break;

      // Save the app grid after rearrangement
      case 'drag-rearrange':
        console.debug('Drag rearrange');
        this.storeAppOrder();
        break;

      // Handle app-uninstall bar highlight and auto-scroll
      case 'drag-move':
        var inAutoscroll = false;

        if (!this.openGroup &&
            e.detail.clientY > this.lastWindowHeight - AUTOSCROLL_DISTANCE) {
          // User is dragging in the lower auto-scroll area
          inAutoscroll = true;
          if (this.autoScrollInterval === null) {
            this.autoScrollInterval = setInterval(() => {
              this.shouldEnterEditMode = false;
              this.snapScrollPosition(1);
              return true;
            }, AUTOSCROLL_DELAY);
          }
        } else if (!this.openGroup && e.detail.clientY < AUTOSCROLL_DISTANCE) {
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
          var hoverIcon = this.container.getChildFromPoint(e.detail.clientX,
                                                           e.detail.clientY);
          if (this.hoverIcon !== hoverIcon) {
            if (this.hoverIcon) {
              this.shouldEnterEditMode = false;
              this.shouldCreateGroup = false;
              this.hoverIcon.classList.remove(
                'hover-before', 'hover-after', 'hover-over');
              e.detail.target.classList.remove('hover-over-group');
            }
            this.hoverIcon = (hoverIcon !== e.detail.target) ? hoverIcon : null;

            if (this.hoverIcon) {
              var offset = this.draggedIndex -
                           this.getChildIndex(this.hoverIcon);
              this.hoverIcon.classList.add((offset >= 0) ?
                'hover-before' : 'hover-after');
            }
          }

          if (this.hoverIcon && !this.draggingGroup && !this.openGroup) {
            // Evaluate whether we should create a group
            var before = this.hoverIcon.classList.contains('hover-before');
            rect = this.container.getChildOffsetRect(this.hoverIcon);
            if ((before && e.detail.clientX > rect.right - (rect.width / 2)) ||
                (!before && e.detail.clientX < rect.left + (rect.width / 2))) {
              this.hoverIcon.classList.add('hover-over');
              if (!this.shouldCreateGroup) {
                this.shouldCreateGroup = true;
                e.detail.target.classList.add('hover-over-group');
              }
            } else {
              this.hoverIcon.classList.remove('hover-over');
              if (this.shouldCreateGroup) {
                this.shouldCreateGroup = false;
                e.detail.target.classList.remove('hover-over-group');
              }
            }
          }
        }

        if (!inAutoscroll && this.autoScrollInterval !== null) {
          clearInterval(this.autoScrollInterval);
          this.autoScrollInterval = null;
        }
        break;

      // Add apps installed after startup
      case 'install':
        // Check if the app already exists, and if so, update it.
        // This happens when reinstalling an app via WebIDE.
        var existing = false;
        this.iterateIcons(icon => {
          if (icon.app && icon.app.manifestURL === e.application.manifestURL) {
            icon.app = e.application;
            icon.refresh();
            existing = true;
          }
        });
        if (existing) {
          return;
        }

        this.addApp(e.application);
        this.storeAppOrder();
        break;

      // Remove apps uninstalled after startup
      case 'uninstall':
        var callback = () => {
          this.storeAppOrder();
          this.refreshGridSize();
          this.snapScrollPosition();
        };

        this.iterateIcons((icon, container, parent) => {
          if (icon.app && icon.app.manifestURL === e.application.manifestURL) {
            id = this.getIconId(e.application, icon.entryPoint);
            this.metadata.remove(id).then(() => {},
              (e) => {
                console.error('Error removing uninstalled app', e);
              });

            parent.removeChild(container, callback);

            // We only want to store the app order once, so clear the callback
            callback = null;

            if (this.selectedIcon === icon) {
              this.updateSelectedIcon(null);
            }
          }
        });
        break;

      case 'localized':
        this.iterateIcons(icon => {
          icon.updateName();
        });
        this.icons.synchronise();
        break;

      case 'online':
        this.iterateIcons(icon => {
          id = this.getIconId(icon.app ? icon.app : icon.bookmark,
                              icon.entryPoint);
          for (var i = 0, iLen = this.iconsToRetry.length; i < iLen; i++) {
            if (id === this.iconsToRetry[i]) {
              this.refreshIcon(icon);
              break;
            }
          }
        });
        break;

      case 'resize':
        if (this.lastWindowWidth === window.innerWidth &&
            this.lastWindowHeight === window.innerHeight) {
          break;
        }

        this.lastWindowWidth = window.innerWidth;
        this.lastWindowHeight = window.innerHeight;

        // Reset icon-size
        var oldIconSize = this.iconSize;
        this._iconSize = 0;

        // If the icon size has changed, refresh icons
        if (oldIconSize !== this.iconSize) {
          this.iterateIcons(this.refreshIcon.bind(this));
        }

        // Re-synchronise icon position
        this.icons.synchronise();

        // Recalculate grid size/snap points
        this.refreshGridSize();
        this.snapScrollPosition();
        break;

      case 'settings-changed':
        this.toggleSmall(this.settings.small);
        this.toggleScrollSnapping(this.settings.scrollSnapping);
        break;

      case 'settings-ready':
        window.removeEventListener('settings-ready', this);
        this.init();
        break;
      }
    }
  };

  exports.Apps = Apps;

}(window));
