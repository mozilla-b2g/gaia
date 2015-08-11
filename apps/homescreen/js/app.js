/* global MozActivity, HomeMetadata, Datastore */
/* jshint nonew: false */
'use strict';

/**
 * The distance a pinch gesture has to move before being considered for a
 * column-layout change.
 */
const PINCH_DISTANCE_THRESHOLD = 150;

/**
 * The minimum distance a pinch gesture has to move before being reflected
 * visually.
 */
const PINCH_FEEDBACK_THRESHOLD = 5;

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
const AUTOSCROLL_DISTANCE = 45;

/**
 * The timeout before auto-scrolling a page when hovering at the edges
 * of the grid.
 */
const AUTOSCROLL_DELAY = 750;

/**
 * The height of the delete-app bar at the bottom of the container when
 * dragging a deletable app.
 */
const DELETE_DISTANCE = 60;

/**
 * App roles that will be skipped on the homescreen.
 */
const HIDDEN_ROLES = [
  'system', 'input', 'homescreen', 'theme', 'addon', 'langpack'
];

/**
 * Stored settings version, for use when changing/refactoring settings storage.
 */
const SETTINGS_VERSION = 0;

(function(exports) {

  function App() {
    // Element references
    this.shadow = document.getElementById('shadow');
    this.scrollable = document.getElementById('scrollable');
    this.icons = document.getElementById('apps');
    this.bottombar = document.getElementById('bottombar');
    this.uninstall = document.getElementById('uninstall');
    this.edit = document.getElementById('edit');
    this.cancelDownload = document.getElementById('cancel-download');
    this.resumeDownload = document.getElementById('resume-download');
    this.settingsDialog = document.getElementById('settings');

    // XXX Working around gaia-components issue #8
    this.cancelDownload.style.display = 'none';
    this.resumeDownload.style.display = 'none';
    this.settingsDialog.style.display = 'none';

    // Scroll behaviour
    this.scrolled = false;

    // Pinch-to-zoom
    this.small = false;
    this.wasSmall = false;
    this.pinchListening = false;

    // Drag-and-drop
    this.draggingRemovable = false;
    this.autoScrollTimeout = null;

    // Signal handlers
    document.body.addEventListener('contextmenu', this);
    this.scrollable.addEventListener('scroll', this);
    this.icons.addEventListener('activate', this);
    this.icons.addEventListener('drag-start', this);
    this.icons.addEventListener('drag-move', this);
    this.icons.addEventListener('drag-end', this);
    this.icons.addEventListener('drag-rearrange', this);
    this.icons.addEventListener('drag-finish', this);
    this.icons.addEventListener('touchstart', this);
    this.icons.addEventListener('touchmove', this);
    this.icons.addEventListener('touchend', this);
    this.icons.addEventListener('touchcancel', this);
    navigator.mozApps.mgmt.addEventListener('install', this);
    navigator.mozApps.mgmt.addEventListener('uninstall', this);
    window.addEventListener('hashchange', this);
    window.addEventListener('localized', this);

    // Restore settings
    this.restoreSettings();

    // Populate apps
    var populateApps = () => {
      Promise.all([
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
        new Promise((resolve, reject) => {
          this.bookmarks.getAll().then((bookmarks) => {
            for (var bookmark of bookmarks) {
              this.addAppIcon(bookmark.data);
            }
            resolve();
          }, (error) => {
            console.error('Error getting bookmarks', error);
            resolve();
          });
        })
      ]).then(() => {
        for (var data of this.startupMetadata) {
          console.log('Removing unknown app metadata entry', data.id);
          this.metadata.remove(data.id).then(
            () => {},
            (e) => {
              console.error('Error removing unknown app metadata entry', e);
            });
        }
        this.startupMetadata = [];
        this.storeAppOrder();
      });
    };

    this.startupMetadata = [];
    this.metadata = new HomeMetadata();
    this.bookmarks = new Datastore('bookmarks_store');
    Promise.all([
      new Promise((resolve, reject) => {
        this.metadata.init().then(() => {
          this.metadata.getAll().then((results) => {
            this.startupMetadata = results;
            resolve();
          },
          (e) => {
            console.error('Failed to retrieve metadata entries', e);
            resolve();
          });
        },
        (e) => {
          console.error('Failed to initialise metadata db', e);
          resolve();
        });
      }),
      new Promise((resolve, reject) => {
        this.bookmarks.init().then(() => {
          document.addEventListener('bookmarks_store-set', (e) => {
            var id = e.detail.id;
            this.bookmarks.get(id).then((bookmark) => {
              for (var child of this.icons.children) {
                var icon = child.firstElementChild;
                if (icon.bookmark && icon.bookmark.id === id) {
                  icon.bookmark = bookmark.data;
                  icon.refresh();
                  return;
                }
              }
              this.bookmarks.get(id).then((bookmark) => {
                this.addAppIcon(bookmark.data);
                this.storeAppOrder();
                this.snapScrollPosition(0);
              });
            });
          });

          document.addEventListener('bookmarks_store-removed', (e) => {
            var id = e.detail.id;
            for (var child of this.icons.children) {
              var icon = child.firstElementChild;
              if (icon.bookmark && icon.bookmark.id === id) {
                this.icons.removeChild(child, this.storeAppOrder.bind(this));
                this.metadata.remove(id);
                return;
              }
            }
          });

          document.addEventListener('bookmarks_store-cleared', () => {
            for (var child of this.icons.children) {
              var icon = child.firstElementChild;
              if (icon.bookmark) {
                this.icons.removeChild(child);
              }
            }
            this.storeAppOrder();
          });

          this.bookmarks.synchronise();
          resolve();
        }, (e) => {
          console.error('Error initialising bookmarks', e);
          resolve();
        });
      })
    ]).then(populateApps);
  }

  App.prototype = {
    saveSettings: function() {
      localStorage.setItem('settings', JSON.stringify({
        version: SETTINGS_VERSION,
        small: this.small
      }));
    },

    restoreSettings: function() {
      var settingsString = localStorage.getItem('settings');
      if (!settingsString) {
        return;
      }

      var settings = JSON.parse(settingsString);
      if (settings.version !== SETTINGS_VERSION) {
        return;
      }

      this.small = settings.small;
      this.icons.classList.toggle('small', this.small);
    },

    addApp: function(app) {
      var manifest = app.manifest || app.updateManifest;
      if (!manifest) {
        //console.log('Skipping app with no manifest', app);
        return;
      }

      if (manifest.role && HIDDEN_ROLES.indexOf(manifest.role) !== -1) {
        //console.log('Skipping app with role \'' + manifest.role + '\'', app);
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

    addIconContainer: function(entry) {
      var container = document.createElement('div');
      container.classList.add('icon-container');
      container.order = -1;

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
          break;
        }
      }

      if (!container.parentNode) {
        // If we're adding the first child, call snapScrollPosition to set
        // the scroll-snapping parameters.
        var callback = this.icons.firstChild ? null :
          () => { this.snapScrollPosition(0); };
        this.icons.appendChild(container, callback);
      }

      return container;
    },

    addAppIcon: function(appOrBookmark, entryPoint) {
      var id;
      if (appOrBookmark.manifestURL) {
        id = appOrBookmark.manifestURL + '/' + (entryPoint ? entryPoint : '');
      } else {
        id = appOrBookmark.id;
      }

      var entry = this.startupMetadata.findIndex((element) => {
        return element.id === id;
      });
      var container = this.addIconContainer(entry);

      var icon = document.createElement('gaia-app-icon');
      container.appendChild(icon);
      if (entryPoint) {
        icon.entryPoint = entryPoint;
      }

      if (appOrBookmark.manifestURL) {
        icon.app = appOrBookmark;
      } else {
        icon.bookmark = appOrBookmark;
      }

      // Load the cached icon
      if (entry !== -1) {
        icon.icon = this.startupMetadata[entry].icon;
        this.startupMetadata.splice(entry, 1);
      }

      // Save the refreshed icon
      icon.addEventListener('icon-loaded', function(icon, id) {
        icon.icon.then((blob) => {
          this.metadata.set([{ id: id, icon: blob }]).then(
            () => {},
            (e) => {
              console.error('Error saving icon', e);
            });
        });
      }.bind(this, icon, id));

      // Refresh icon data (sets title and refreshes icon)
      icon.refresh();
    },

    storeAppOrder: function() {
      var storedOrders = [];
      var children = this.icons.children;
      for (var i = 0, iLen = children.length; i < iLen; i++) {
        var appIcon = children[i].firstElementChild;
        var id;
        if (appIcon.app) {
          id = appIcon.app.manifestURL + '/' + appIcon.entryPoint;
        } else {
          id = appIcon.bookmark.id;
        }
        storedOrders.push({ id: id, order: i });
      }
      this.metadata.set(storedOrders).then(
        () => {},
        (e) => {
          console.error('Error storing app order', e);
        });
    },

    stopPinch: function() {
      if (!this.pinchListening) {
        return;
      }

      this.scrollable.addEventListener('transitionend', this);
      this.pinchListening = false;
      this.scrollable.style.transition = '';
      this.scrollable.style.transform = '';
      this.handleEvent({ type: 'scroll' });
    },

    snapScrollPosition: function(bias) {
      var children = this.icons.children;
      if (children.length < 1) {
        return;
      }

      var iconHeight = Math.round(children[0].getBoundingClientRect().height);
      var scrollHeight = this.scrollable.clientHeight;
      var pageHeight = Math.floor(scrollHeight / iconHeight) * iconHeight;
      var gridHeight = (Math.ceil((iconHeight *
        Math.ceil(children.length / (this.small ? 4 : 3))) / pageHeight) *
        pageHeight) + (scrollHeight - pageHeight);

      // Reset scroll-snap points
      this.scrollable.style.scrollSnapPointsY = 'repeat(' + pageHeight + 'px)';

      // Make sure the grid is a multiple of the page size. Done in a timeout
      // in case the grid shrinks
      setTimeout(() => {
        this.icons.style.height = (gridHeight + 1) + 'px';
      }, RESIZE_TIMEOUT);

      var currentScroll = this.scrollable.scrollTop;
      var destination = Math.min(gridHeight - scrollHeight,
        Math.round(currentScroll / pageHeight + bias) * pageHeight);
      if (Math.abs(destination - currentScroll) > 1) {
        this.scrollable.style.overflow = '';
        this.scrollable.scrollTo(
          { left: 0, top: destination, behavior: 'smooth' });
      }
    },

    showActionDialog: function(dialog, args, callbacks) {
      // XXX Working around gaia-components issue #8.
      if (dialog.style.display !== 'none') {
        return;
      }

      var actions = dialog.getElementsByClassName('action');
      for (var i = 0, iLen = Math.min(actions.length, callbacks.length);
           i < iLen; i++) {
        actions[i].onclick = callbacks[i];
      }
      if (args) {
        dialog.querySelector('.body').setAttribute('data-l10n-args', args);
      }
      setTimeout(() => { dialog.open(); }, DIALOG_SHOW_TIMEOUT);
    },

    handleEvent: function(e) {
      var icon;

      switch (e.type) {
      // Show the settings menu when the user long-presses and we aren't in
      // a drag
      case 'contextmenu':
        if (!document.body.classList.contains('dragging')) {
          this.showActionDialog(this.settingsDialog, null,
            [() => {
               new MozActivity({
                 name: 'configure',
                 data: {
                   target: 'device',
                   section: 'homescreen'
                 }
               });
               this.settingsDialog.close();
             }]);
          e.stopImmediatePropagation();
          e.preventDefault();
        }
        break;

      // Display the top shadow when scrolling down
      case 'scroll':
        var position = this.scrollable.scrollTop;
        var scrolled = position > 0;
        if (this.scrolled !== scrolled) {
          this.scrolled = scrolled;
          this.shadow.classList.toggle('visible', scrolled);
        }
        break;

      // App launching
      case 'activate':
        icon = e.detail.target.firstElementChild;

        switch (icon.state) {
          case 'unrecoverable':
            navigator.mozApps.mgmt.uninstall(icon.app);
            break;

          case 'installing':
            this.showActionDialog(this.cancelDownload,
              JSON.stringify({ name: icon.name }),
              [() => {
                 icon.app.cancelDownload();
                 this.cancelDownload.close();
               }]);
            break;

          case 'error':
          case 'paused':
            this.showActionDialog(this.resumeDownload,
              JSON.stringify({ name: icon.name }),
              [() => {
                 icon.app.download();
                 this.resumeDownload.close();
               }]);
            break;

          default:
            icon.launch();
            break;
        }
        break;

      // Disable scrolling during dragging, and display bottom-bar
      case 'drag-start':
        document.body.classList.add('dragging');
        this.scrollable.style.overflow = 'hidden';
        icon = e.detail.target.firstElementChild;

        this.draggingEditable = !!icon.bookmark;
        this.draggingRemovable = this.draggingEditable || !!icon.app.removable;
        this.bottombar.classList.toggle('editable', this.draggingEditable);
        this.bottombar.classList.toggle('removable', this.draggingRemovable);
        if (this.draggingEditable || this.draggingRemovable) {
          this.bottombar.classList.add('active');
        }
        break;

      case 'drag-finish':
        document.body.classList.remove('dragging');
        this.scrollable.style.overflow = '';
        this.bottombar.classList.remove('active');
        this.edit.classList.remove('active');
        this.uninstall.classList.remove('active');
        break;

      // Handle app uninstallation
      case 'drag-end':
        if (e.detail.clientY <= window.innerHeight - DELETE_DISTANCE) {
          // If the drop target is the container, check to see if we're
          // dropping over the icon itself, and if we aren't, we must be
          // dropping over the end of the container.
          if (e.detail.dropTarget === this.icons) {
            var rect = this.icons.getChildOffsetRect(e.detail.target);
            var x = e.detail.clientX;
            var y = e.detail.clientY + this.scrollable.scrollTop;
            if (x < rect.left || y < rect.top ||
                x >= rect.right || y >= rect.bottom) {
              this.icons.reorderChild(e.detail.target, null,
                                      this.storeAppOrder.bind(this));
            }
          }
          return;
        }

        icon = e.detail.target.firstElementChild;

        if (icon.app && icon.app.removable) {
          e.preventDefault();
          navigator.mozApps.mgmt.uninstall(icon.app);
        } else if (icon.bookmark) {
          if (e.detail.clientX >= window.innerWidth / 2) {
            new MozActivity({
              name: 'save-bookmark',
              data: { type: 'url', url: icon.bookmark.id }
            });
          } else {
            new MozActivity({
              name: 'remove-bookmark',
              data: { type: 'url', url: icon.bookmark.id }
            });
          }
        }

        break;

      // Save the app grid after rearrangement
      case 'drag-rearrange':
        this.storeAppOrder();
        break;

      // Handle app-uninstall bar highlight and auto-scroll
      case 'drag-move':
        var inDelete = false;
        var inEdit = false;
        var inAutoscroll = false;

        if (this.draggingRemovable &&
            e.detail.clientY > window.innerHeight - DELETE_DISTANCE) {
          if (this.draggingEditable &&
              e.detail.clientX >= window.innerWidth / 2) {
            inEdit = true;
          } else {
            inDelete = true;
          }
        } else if (e.detail.clientY >
                   window.innerHeight - DELETE_DISTANCE - AUTOSCROLL_DISTANCE) {
          inAutoscroll = true;
          if (this.autoScrollTimeout === null) {
            this.autoScrollTimeout = setTimeout(() => {
              this.autoScrollTimeout = null;
              this.snapScrollPosition(1);
            }, AUTOSCROLL_DELAY);
          }
        } else if (e.detail.clientY < AUTOSCROLL_DISTANCE) {
          inAutoscroll = true;
          if (this.autoScrollTimeout === null) {
            this.autoScrollTimeout = setTimeout(() => {
              this.autoScrollTimeout = null;
              this.snapScrollPosition(-1);
            }, AUTOSCROLL_DELAY);
          }
        }

        if (!inAutoscroll && this.autoScrollTimeout !== null) {
          clearTimeout(this.autoScrollTimeout);
          this.autoScrollTimeout = null;
        }

        this.uninstall.classList.toggle('active', inDelete);
        this.edit.classList.toggle('active', inEdit);
        break;

      // Pinch-to-zoom
      case 'touchstart':
        if (e.touches.length === 2) {
          this.wasSmall = this.small;
          this.startDistance =
            Math.sqrt(Math.pow(e.touches[0].clientX -
                               e.touches[1].clientX, 2) +
                      Math.pow(e.touches[0].clientY -
                               e.touches[1].clientY, 2));
          this.pinchListening = true;
          document.body.classList.add('zooming');
          this.scrollable.style.transition = 'unset';
        } else {
          this.stopPinch();
        }
        break;

      case 'touchmove':
        if (!this.pinchListening || e.touches.length !== 2) {
          return;
        }

        var distance =
          (Math.sqrt(Math.pow(e.touches[0].clientX -
                              e.touches[1].clientX, 2) +
                     Math.pow(e.touches[0].clientY -
                              e.touches[1].clientY, 2))) -
          this.startDistance;

        var newState;
        if (this.wasSmall) {
          newState = (distance < PINCH_DISTANCE_THRESHOLD);
        } else {
          newState = (distance < -PINCH_DISTANCE_THRESHOLD);
        }

        if (!this.scrolled && distance > 0) {
          this.scrolled = true;
          this.shadow.classList.add('visible');
        }

        if (this.small !== newState) {
          this.small = newState;
          this.icons.style.height = '';
          this.icons.classList.toggle('small', this.small);
          this.icons.synchronise();
          this.stopPinch();
          this.saveSettings();
        } else if (Math.abs(distance) > PINCH_FEEDBACK_THRESHOLD) {
          this.scrollable.style.transform = 'scale(' +
            ((window.innerWidth + distance / 4) / window.innerWidth) + ')';
        }
        break;

      case 'touchend':
      case 'touchcancel':
        if (!e.touches || e.touches.length === 0) {
          this.handleEvent({ type: 'scroll' });
        }

        this.stopPinch();
        break;

      case 'transitionend':
        if (e.target === this.scrollable) {
          this.scrollable.removeEventListener('transitionend', this);
          document.body.classList.remove('zooming');
          this.snapScrollPosition(0);
        }
        break;

      // Add apps installed after startup
      case 'install':
        this.addApp(e.application);
        break;

      // Remove apps uninstalled after startup
      case 'uninstall':
        var callback = () => {
          this.storeAppOrder();
          this.snapScrollPosition(0);
        };

        for (var child of this.icons.children) {
          icon = child.firstElementChild;
          if (icon.app && icon.app.manifestURL === e.application.manifestURL) {
            var id = e.application.manifestURL + '/' +
              (icon.entryPoint ? icon.entryPoint : '');
            this.metadata.remove(id).then(() => {},
              (e) => {
                console.error('Error removing uninstalled app', e);
              });

            this.icons.removeChild(child, callback);

            // We only want to store the app order once, so clear the callback
            callback = null;
          }
        }
        break;

      case 'hashchange':
        if (!document.hidden) {
          this.scrollable.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
        }
        break;

      case 'localized':
        for (icon of this.icons.children) {
          icon.firstElementChild.updateName();
        }
        break;
      }
    }
  };

  exports.App = App;

}(window));
