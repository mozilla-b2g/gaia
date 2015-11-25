/* global MozActivity, AppsMetadata, Datastore, LazyLoader, FirstRun,
          IconsHelper, Settings */
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
    this.meta = document.head.querySelector('meta[name="theme-color"]');
    this.scrollable = document.querySelector('#apps-panel > .scrollable');
    this.icons = document.getElementById('apps');
    this.remove = document.getElementById('remove');
    this.rename = document.getElementById('rename');
    this.done = document.getElementById('done');
    this.cancelDownload = document.getElementById('cancel-download');
    this.resumeDownload = document.getElementById('resume-download');
    this.dialogs = [this.cancelDownload, this.resumeDownload];

    // XXX Working around gaia-components issue #8
    var dialog;
    for (dialog of this.dialogs) {
      dialog.hide();
    }

    // Change the colour of the statusbar when showing dialogs
    var dialogVisibilityCallback = () => {
      for (var dialog of this.dialogs) {
        if (dialog.opened) {
          this.meta.content = 'white';
          document.body.classList.add('dialog-active');
          return;
        }
      }
      this.meta.content = 'transparent';
      document.body.classList.remove('dialog-active');
    };
    for (dialog of this.dialogs) {
      var observer = new MutationObserver(dialogVisibilityCallback);
      observer.observe(dialog,
        { attributes: true, attributeFilter: ['style'] });
    }

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
    this.dragging = false;
    this.draggedIndex = -1;
    this.autoScrollInterval = null;
    this.autoScrollOverflowTimeout = null;
    this.hoverIcon = null;

    // Edit mode
    this.editMode = false;
    this.shouldEnterEditMode = false;
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
    this.icons.addEventListener('activate', this);
    this.icons.addEventListener('drag-start', this);
    this.icons.addEventListener('drag-move', this);
    this.icons.addEventListener('drag-end', this);
    this.icons.addEventListener('drag-rearrange', this);
    this.icons.addEventListener('drag-finish', this);
    navigator.mozApps.mgmt.addEventListener('install', this);
    navigator.mozApps.mgmt.addEventListener('uninstall', this);
    window.addEventListener('localized', this);
    window.addEventListener('online', this);
    window.addEventListener('resize', this);
    window.addEventListener('settings-changed', this);

    // Settings
    this.settings = new Settings();
    this.icons.classList.toggle('small', this.settings.small);
    this.scrollable.classList.toggle('snapping', this.settings.scrollSnapping);

    // Populate apps and bookmarks asynchronously
    this.metadataLoaded = 0;
    this.startupMetadata = [];
    this.iconsToRetry = [];
    this.pendingIcons = {};
    this.metadata = new AppsMetadata();
    this.bookmarks = new Datastore('bookmarks_store');

    // Make sure icons isn't doing lots of unnecessary work while we're
    // loading the first screen of apps.
    this.visualLoadComplete = false;
    this.icons.freeze();
    this.icons.classList.add('loading');

    Promise.all([
      // Load app metadata. If metadata loading fails, continue populating apps
      // anyway - it means they'll be in the default order and their order
      // won't save, but it's better than showing a blank screen.
      // If this is the first run, get the app order from the first-run script
      // after initialising the metadata database.
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
                this.addAppIcon.apply(this, this.pendingIcons[data.id]);
                delete this.pendingIcons[data.id];
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

      // Populate apps
      new Promise((resolve, reject) => {
        var request = navigator.mozApps.mgmt.getAll();
        request.onsuccess = (e) => {
          for (var app of request.result) {
            this.addApp(app);
          }
          resolve();
        };
        request.onerror = (e) => {
          console.error('Error calling getAll: ' + request.error.name);
          resolve();
        };
      }),

      // Initialise and populate bookmarks
      this.bookmarks.init().then(() => {
        document.addEventListener('bookmarks_store-set', (e) => {
          var id = e.detail.id;
          this.bookmarks.get(id).then((bookmark) => {
            this.iterateIcons(icon => {
              if (icon.bookmark && icon.bookmark.id === id) {
                icon.bookmark = bookmark.data;
                icon.refresh();
              }
            });
            this.addAppIcon(bookmark.data);
            this.storeAppOrder();
          });
        });

        document.addEventListener('bookmarks_store-removed', (e) => {
          var id = e.detail.id;
          this.iterateIcons((icon, container, parent) => {
            if (icon.bookmark && icon.bookmark.id === id) {
              parent.removeChild(container, () => {
                this.storeAppOrder();
                this.refreshGridSize();
                this.snapScrollPosition();
              });
              this.metadata.remove(id);

              if (this.selectedIcon === icon) {
                this.updateSelectedIcon(null);
              }
            }
          });
        });

        document.addEventListener('bookmarks_store-cleared', () => {
          this.iterateIcons((icon, container, parent) => {
            if (icon.bookmark) {
              parent.removeChild(container);
            }
          });
          this.storeAppOrder();
          this.refreshGridSize();
          this.snapScrollPosition();
        });
      }, (e) => {
        console.error('Error initialising bookmarks', e);
        return Promise.resolve();
      }).then(() => {
        return this.bookmarks.getAll().then((bookmarks) => {
          for (var bookmark of bookmarks) {
            this.addAppIcon(bookmark.data);
          }
        }, (e) => {
          console.error('Error getting bookmarks', e);
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

      // Update icons that we've added from the startup metadata in case their
      // icons have updated or the icon size has changed.
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
  }

  Apps.prototype = {
    get iconSize() {
      // If this._iconSize is 0, let's refresh the value.
      if (!this._iconSize) {
        var children = this.icons.children;
        for (var container of children) {
          if (container.style.display !== 'none' &&
              container.localName !== 'homescreen-group') {
            this._iconSize = container.firstElementChild.size;
            break;
          }
        }
      }

      return this._iconSize;
    },

    toggleSmall: function(small) {
      if (this.icons.classList.contains('small') === small) {
        return;
      }

      this.icons.classList.toggle('small', small);
      this.icons.synchronise();
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
      for (var child of this.icons.children) {
        if (child.localName === 'homescreen-group') {
          for (var icon of child.container.children) {
            callback(icon, icon, child.container);
          }
        } else {
          callback(child.firstElementChild, child, this.icons);
        }
      }
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

    addIconContainer: function(icon, entry) {
      var container = document.createElement('div');
      container.classList.add('icon-container');
      container.order = -1;
      container.appendChild(icon);

      // Try to insert the container in the right order
      if (entry !== -1 && this.startupMetadata[entry].order >= 0) {
        container.order = this.startupMetadata[entry].order;
        var children = this.icons.children;
        for (var i = 0, iLen = children.length; i < iLen; i++) {
          var child = children[i];
          if (child.order !== -1 && child.order < container.order) {
            continue;
          }
          this.icons.insertBefore(container, child);
          if (this.startupMetadata === null) {
            this.iconAdded(container);
          }
          break;
        }
      }

      if (!container.parentNode) {
        this.icons.appendChild(container);
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
          this.pendingIcons[id] = Array.slice(arguments);
          return;
        }
      }

      var icon = document.createElement('gaia-app-icon');
      if (entryPoint) {
        icon.entryPoint = entryPoint;
      }
      var container = this.addIconContainer(icon, entry);

      if (appOrBookmark.id) {
        icon.bookmark = appOrBookmark;
        this.refreshIcon(icon);
      } else {
        icon.app = appOrBookmark;

        // Hide/show the icon if the role changes to/from a hidden role
        var handleRoleChange = function(app, container) {
          var manifest = app.manifest || app.updateManifest;
          var hidden = (manifest && manifest.role &&
            HIDDEN_ROLES.includes(manifest.role));
          container.style.display = hidden ? 'none' : '';
        };

        icon.app.addEventListener('downloadapplied',
          function(app, container) {
            handleRoleChange(app, container);
            this.icons.synchronise();
          }.bind(this, icon.app, container));

        handleRoleChange(icon.app, container);
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
      icon.size = this.iconSize ? this.iconSize : icon.size;
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
      icon.size = this.iconSize ? this.iconSize : icon.size;
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
      // TODO: Store group information
      var i = 0;
      var storedOrders = [];
      this.iterateIcons((icon, container, parent) => {
        var id = this.getIconId(icon.app ? icon.app : icon.bookmark,
                                icon.entryPoint);
        storedOrders.push({ id: id, order: i++ });
      });

      this.metadata.set(storedOrders).then(
        () => {},
        (e) => {
          console.error('Error storing app order', e);
        });
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
        this.icons.style.height = gridHeight + 'px';
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
      return this.icons.children.indexOf(child);
    },

    removeSelectedIcon: function() {
      if (!this.selectedIcon) {
        return;
      }

      if (this.selectedIcon.app) {
        if (!this.selectedIcon.app.removable) {
          return;
        }
        navigator.mozApps.mgmt.uninstall(this.selectedIcon.app);
      } else if (this.selectedIcon.bookmark) {
        var remove = new MozActivity({
          name: 'remove-bookmark',
          data: { type: 'url', url: this.selectedIcon.bookmark.id }
        });

        // Re-enter edit mode because the activity will hide the document,
        // which exits edit mode
        var icon = this.selectedIcon;
        remove.onsuccess = () => {
          this.enterEditMode(null);
        };
        remove.onerror = () => {
          this.enterEditMode(icon);
        };
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

    updateSelectedIcon: function(icon) {
      if (this.selectedIcon === icon) {
        return;
      }

      if (this.selectedIcon && (!icon || this.iconIsEditable(icon))) {
        this.selectedIcon.classList.remove('selected');
        this.selectedIcon.removeEventListener('touchstart', this);
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
          icon.addEventListener('touchstart', this);
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

      if (this.editMode) {
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
      if (!element) {
        return 'none';
      }

      if (element.localName === 'homescreen-group') {
        return 'group';
      }

      return element.firstElementChild.name;
    },

    handleEvent: function(e) {
      var icon, id;

      switch (e.type) {
      // App launching
      case 'activate':
        e.preventDefault();
        if (e.detail.target.localName === 'homescreen-group') {
          e.detail.target.expand();
          break;
        }

        icon = e.detail.target.firstElementChild;

        // If we're in edit mode, remap taps to selection
        if (this.editMode) {
          this.enterEditMode(icon);
          return;
        }

        switch (icon.state) {
          case 'unrecoverable':
            navigator.mozApps.mgmt.uninstall(icon.app);
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
        break;

      // Activate drag-and-drop immediately for selected icons
      case 'touchstart':
        this.icons.dragAndDropTimeout = 0;
        break;

      // Disable scrolling during dragging, and display bottom-bar
      case 'drag-start':
        console.debug('Drag-start on ' + this.elementName(e.detail.target));
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
        this.icons.dragAndDropTimeout = -1;
        break;

      // Handle app/site editing and dragging to the end of the icon grid.
      case 'drag-end':
        console.debug('Drag-end, target: ' +
                      this.elementName(e.detail.dropTarget));
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
          this.icons.reorderChild(e.detail.target,
                                  bottom ? this.icons.firstChild : null,
                                  this.storeAppOrder.bind(this));
          break;
        }

        if (e.detail.dropTarget === e.detail.target) {
          icon = e.detail.target.firstElementChild;
          if (this.editMode || this.shouldEnterEditMode) {
            e.preventDefault();
            this.enterEditMode(icon);
          }
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
          var hoverIcon = this.icons.getChildFromPoint(e.detail.clientX,
                                                       e.detail.clientY);
          if (this.hoverIcon !== hoverIcon) {
            if (this.hoverIcon) {
              this.shouldEnterEditMode = false;
              this.hoverIcon.classList.remove('hover-before', 'hover-after');
            }
            this.hoverIcon = (hoverIcon !== e.detail.target) ? hoverIcon : null;

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
      }
    }
  };

  exports.Apps = Apps;

}(window));
