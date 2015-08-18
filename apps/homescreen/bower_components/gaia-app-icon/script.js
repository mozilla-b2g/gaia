'use strict';

window.GaiaAppIcon = (function(exports) {
  const LAUNCH_TIMEOUT = 500;

  const PREDEFINED_ICONS = {
    default: 'default_icon.svg',
    unrecoverable: 'app_install_unrecoverable.svg',
    installing: 'app_installing.svg',
    paused: 'app_install_canceled.svg',
    failed: 'app_install_failed.svg'
  };

  const SHADOW_BLUR = 1;
  const SHADOW_OFFSET = { x: 1, y: 1 };
  const SHADOW_COLOR = 'rgba(0, 0, 0, 0.2)';
  const DEFAULT_BACKGROUND_COLOR = 'rgb(228, 234, 238)';
  const CANVAS_PADDING = 2 * window.devicePixelRatio;
  const FAVICON_SCALE = 0.55;
  const ICON_FETCH_TIMEOUT = 10000;

  var proto = Object.create(HTMLElement.prototype);

  // Allow the base URL to be overridden
  var baseurl = window.GaiaAppIconBaseurl || 'gaia-app-icon/';

  proto.createdCallback = function() {
    this._template = template.content.cloneNode(true);

    var shadow = this.createShadowRoot();
    shadow.appendChild(this._template);

    this._container = shadow.getElementById('image-container');
    this._subtitle = shadow.getElementById('subtitle');
    this._image = null;
    this._app = null;
    this._bookmark = null;
    this._entryPoint = '';
    this._size = 0;
    this._hasIcon = false;
    this._hasUserSetIcon = false;
    this._hasPredefinedIcon = false;

    this._predefinedIcons = {};
    for (var key in PREDEFINED_ICONS) {
      this._predefinedIcons[key] = baseurl + 'images/' + PREDEFINED_ICONS[key];
    }

    // Make the icon accessible/allow activation
    this.tabIndex = 0;
    this.setAttribute('role', 'link');

    var activate = () => {
      if (!this.dispatchEvent(new CustomEvent('activated',
                                              { cancelable: true }))) {
        return;
      }
      this.launch();
    }

    this.addEventListener('keydown', (e) => {
      switch (e.keyCode) {
        case 32: // Space
        case 13: // Enter
          activate();
      }
    });
    this.addEventListener('click', activate);

    // Refresh now we've created the DOM
    this.refresh();
  };

  Object.defineProperty(proto, 'app', {
    get: function() {
      return this._app;
    },

    set: function(app) {
      if (this._app) {
        this._app.removeEventListener('progress', this);
        this._app.removeEventListener('downloaderror', this);
        this._app.removeEventListener('downloadsuccess', this);
        this._app.removeEventListener('downloadapplied', this);
      }

      delete this.dataset.testIconUrl;
      this._cancelIconLoad();
      this._removeOldIcon();
      this._hasIcon = false;

      this._app = app;
      if (!app) {
        return;
      }

      this._bookmark = null;
      this._app.addEventListener('progress', this);
      this._app.addEventListener('downloaderror', this);
      this._app.addEventListener('downloadsuccess', this);
      this._app.addEventListener('downloadapplied', this);

      this._container.classList.add('initial-load');
    },

    enumerable: true
  });

  Object.defineProperty(proto, 'entryPoint', {
    get: function() {
      return this._entryPoint;
    },

    set: function(entryPoint) {
      this._entryPoint = entryPoint ? entryPoint : '';
      this.refresh();
    },

    enumerable: true
  });

  Object.defineProperty(proto, 'state', {
    get: function() {
      if (!this.app) {
        return 'unavailable';
      }

      if (this.app.installState === 'pending' &&
          !this.app.downloadAvailable &&
          !this.app.readyToApplyDownload) {
        return 'unrecoverable';
      }

      if (this.app.downloading) {
        return 'installing';
      }

      if (this.app.downloadError) {
        if (this.app.downloadError.name === 'DOWNLOAD_CANCELED') {
          return 'paused';
        } else {
          return 'error';
        }
      }

      if (this.app.installState === 'pending') {
        return 'paused';
      }

      return 'installed';
    },

    enumberable: true
  });

  Object.defineProperty(proto, 'name', {
    get: function() {
      return this._subtitle ? this._subtitle.textContent : '';
    },

    enumberable: true
  });

  Object.defineProperty(proto, 'bookmark', {
    get: function() {
      return this._bookmark;
    },

    set: function(bookmark) {
      this.app = null;
      this._bookmark = bookmark;
    },

    enumerable: true
  });

  Object.defineProperty(proto, 'icon', {
    get: function() {
      return new Promise((resolve, reject) => {
        if (!this._hasIcon || this._hasPredefinedIcon) {
          return reject();
        }

        var image = this._container.querySelector('img');
        if (!image) {
          return reject();
        }

        var canvas = document.createElement('canvas');
        canvas.width = canvas.height = this._size;
        var ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, 0, 0, this._size, this._size);
        try {
          canvas.toBlob((blob) => {
            resolve(blob);
          });
        } catch(e) {
          console.error('Failed to get canvas data for icon');
          reject(e);
        }
      });
    },

    set: function(blob) {
      if (blob) {
        this._relayout();
        this._prepareIconLoader();
        this._hasUserSetIcon = true;
        this._pendingIconUrl = 'user-set';
        this._image.src = URL.createObjectURL(blob);
      } else {
        this._pendingIconUrl = null;
        delete this.dataset.testIconUrl;
        this._cancelIconLoad();
        this._removeOldIcon();
      }
    },

    enumerable: true
  });

  proto._cancelIconLoad = function() {
    if (!this._image) {
      return;
    }

    this._pendingIconUrl = null;
    this._image.onload = null;
    this._image.src = '';
    this._image = null;
  };

  proto._removeOldIcon = function() {
    while (this._container.children.length > 1) {
      this._container.removeChild(this._container.lastChild);
    }
  };

  proto.launch = function() {
    if (!this.app && !this.bookmark) {
      return;
    }

    this.classList.add('launching');
    setTimeout(() => { this.classList.remove('launching'); }, LAUNCH_TIMEOUT);

    if (this.app) {
      this.app.launch(this.entryPoint);
    } else {
      this.icon.then((blob) => {
        var features = {
          name: this.bookmark.name,
          icon: URL.createObjectURL(blob),
          remote: true
        };

        window.open(this.bookmark.url, '_blank', Object.keys(features).
          map(function eachFeature(key) {
            return encodeURIComponent(key) + '=' +
              encodeURIComponent(features[key]);
          }).join(','));
      });
    }
  };

  proto._prepareIconLoader = function() {
    // Create new image element to load icon
    this._cancelIconLoad();
    this._hasPredefinedIcon = false;
    this._hasUserSetIcon = false;
    this._image = document.createElement('img');

    this._image.onload = () => {
      this._image.onload = () => {
        // Add new icon
        this._removeOldIcon();
        this._container.appendChild(this._image);
        this._container.classList.remove('initial-load');
        this._image = null;
        this._hasIcon = true;

        if (!this._hasPredefinedIcon && !this._hasUserSetIcon) {
          this.dispatchEvent(new CustomEvent('icon-loaded'));
        }

        // Set icon URL on dataset, for testing.
        if (this._pendingIconUrl) {
          this.dataset.testIconUrl = this._pendingIconUrl;
          this._pendingIconUrl = null;
        }

        if (this._pendingIconRefresh) {
          this._image = null;
          this._pendingIconRefresh = false;
          this.refresh();
        }
      };

      if (!this._hasUserSetIcon) {
        // Process the image
        var canvas = document.createElement('canvas');
        canvas.width = canvas.height = this._size;

        var ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.shadowColor = SHADOW_COLOR;
        ctx.shadowBlur = SHADOW_BLUR;
        ctx.shadowOffsetX = SHADOW_OFFSET.x;
        ctx.shadowOffsetY = SHADOW_OFFSET.y;

        if (this.bookmark && !this._hasPredefinedIcon) {
          if (this._image.width <= this._size / 2) {
            // Draw filled background circle
            ctx.beginPath();
            ctx.arc(this._size / 2, this._size / 2,
                    this._size / 2 - CANVAS_PADDING, 0, 2 * Math.PI);
            ctx.fillStyle = DEFAULT_BACKGROUND_COLOR;
            ctx.fill();

            // Disable shadow drawing and image smoothing
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            ctx.mozImageSmoothingEnabled = false;

            var iconSize = this._size * FAVICON_SCALE;
            ctx.drawImage(this._image,
                          (this._size - iconSize) / 2,
                          (this._size - iconSize) / 2,
                          iconSize, iconSize);
          } else {
            // Clip the favicon in a circle. We do this in a new canvas so
            // the shadow-rendering on the main canvas works correctly.
            var clipCanvas = document.createElement('canvas');
            clipCanvas.width = clipCanvas.height = this._size;

            var clipCtx =
              clipCanvas.getContext('2d', { willReadFrequently: true });
            clipCtx.beginPath();
            clipCtx.arc(this._size / 2, this._size / 2,
                    this._size / 2 - CANVAS_PADDING, 0, 2 * Math.PI);
            clipCtx.clip();

            clipCtx.drawImage(this._image,
                              CANVAS_PADDING, CANVAS_PADDING,
                              this._size - CANVAS_PADDING * 2,
                              this._size - CANVAS_PADDING * 2);
            ctx.drawImage(clipCanvas, 0, 0);
          }
        } else {
          // Just draw the icon straight (without padding if it was set
          // explicitly rather than loaded via manifest/bookmark)
          ctx.drawImage(this._image,
                        CANVAS_PADDING, CANVAS_PADDING,
                        this._size - CANVAS_PADDING * 2,
                        this._size - CANVAS_PADDING * 2);
        }

        canvas.toBlob(function(image, blob) {
          if (image.onload) {
            image.src = URL.createObjectURL(blob);
          }
        }.bind(this, this._image));
      }

      if (this._hasUserSetIcon) {
        this._image.onload();
      }
    };

    this._image.onerror = (e) => {
      console.error('Failed to load icon', e);
      this._pendingIconUrl = null;

      if (this._pendingIconRefresh) {
        this._pendingIconRefresh = false;
        this._image = null;
        this.refresh();
      } else if (!this._hasIcon) {
        this._image.onerror = null;
        this._setPredefinedIcon('default');
      } else {
        this._image = null;
      }
    };
  };

  proto._setPredefinedIcon = function(name) {
    this._hasPredefinedIcon = true;
    this._image.src = this._pendingIconUrl = this._predefinedIcons[name];
  };

  proto._relayout = function() {
    this._size = this.clientWidth;
    this._container.style.width = this._container.style.height =
      this._size + 'px';
    this._size *= window.devicePixelRatio;
  };

  proto._localizeString = function(str) {
    var userLang = document.documentElement.lang;

    // We want to make sure that we tranlsate only if we're using
    // a runtime pseudolocale.
    // mozL10n.ctx.qps contains only runtime pseudolocales
    if (navigator.mozL10n &&
        navigator.mozL10n.ctx.qps.indexOf(userLang) !== -1) {
      return navigator.mozL10n.qps[userLang].translate(str);
    }
    return str;
  };

  proto.updateName = function() {
    if (this.app) {
      var userLang = document.documentElement.lang;
      var ep = this.entryPoint || undefined;

      this.app.getLocalizedValue('short_name', userLang, ep).then(
        (shortName) => {
          this._subtitle.textContent = this._localizeString(shortName);
        },
        this.app.getLocalizedValue.bind(this.app, 'name', userLang, ep)).then(
          (name) => {
            this._subtitle.textContent = this._localizeString(name);
          },
          (e) => {
            // Try to fall back to manifest app name
            var manifest = this.app.manifest || this.app.updateManifest;
            if (manifest) {
              var nameObject = (manifest.entry_points && this.entryPoint) ?
                manifest.entry_points[this.entryPoint] : manifest;
              this._subtitle.textContent =
                this._localizeString(nameObject.short_name || nameObject.name);
            } else {
              console.error('Error retrieving app name', e);
              this._subtitle.textContent = '';
            }
          });
    } else if (this.bookmark) {
      this._subtitle.textContent = this.bookmark.name;
    } else {
      this._subtitle.textContent = '';
    }
  };

  proto.refresh = function() {
    if (!this._template) {
      return;
    }

    this.updateName();

    this._relayout();
    this._container.classList.remove('downloading');

    // Set an identifier on the icon to help with automated testing.
    if (this.app) {
      this.dataset.identifier = this.app.manifestURL +
        (this.entryPoint ? '/' + this.entryPoint : '');
    } else if (this.bookmark) {
      this.dataset.identifier = this.bookmark.id;
    } else {
      delete this.dataset.identifier;
    }

    // If the icon won't be visible, don't bother fetching and processing it.
    if (this._size < 1) {
      return;
    }

    // If we're already loading an icon, let that finish first.
    if (this._image) {
      this._pendingIconRefresh = true;
      return;
    }
    this._prepareIconLoader();

    // Handle icon loading for bookmarks, app icon loading is more involved
    // and handled below this block.
    if (this.bookmark) {
      if (this.bookmark.icon) {
        // It'd be great to just set the src here, but we need to be able
        // to read-back the image, so use system XHR.
        var xhr = new XMLHttpRequest({ mozAnon: true, mozSystem: true });

        xhr.open('GET', this.bookmark.icon, true);
        xhr.responseType = 'blob';
        xhr.timeout = ICON_FETCH_TIMEOUT;

        this._pendingIconUrl = this.bookmark.icon;

        xhr.onload = function load(image) {
          if (!image.onload) {
            return;
          }

          if (xhr.status !== 0 && xhr.status !== 200) {
            image.onerror(xhr.status);
          } else {
            image.src = URL.createObjectURL(xhr.response);
          }
        }.bind(this, this._image);

        xhr.onerror = function error(image, e) {
          if (image.onload) {
            image.onerror(e);
          }
        }.bind(this, this._image);

        try {
          xhr.send();
          return;
        } catch(e) {
          console.error('Error loading bookmark icon', e);
        }
      }

      // Fallback to the default icon
      if (!this._hasIcon) {
        this._setPredefinedIcon('default');
      }
      return;
    }

    // If the app is downloading/paused/failed to download, use a predefined
    // icon.
    var state = this._lastState = this.state;
    switch (state) {
      case 'unrecoverable':
        this._setPredefinedIcon('unrecoverable');
        break;

      case 'installing':
        this._setPredefinedIcon('installing');
        this._container.classList.add('downloading');
        break;

      case 'paused':
        this._setPredefinedIcon('paused');
        break;

      case 'error':
        this._setPredefinedIcon('failed');
        break;

      case 'installed':
        navigator.mozApps.mgmt.getIcon(this.app, this._size, this.entryPoint).
          then(function(image, blob) {
            this._pendingIconUrl = 'app-icon';
            if (image.onload) {
              image.src = URL.createObjectURL(blob);
            }
          }.bind(this, this._image),
          function(image, e) {
            console.error('Failed to retrieve icon', e);
            if (image.onload && !this._hasIcon) {
              this._setPredefinedIcon('default');
            } else {
              this._image = null;
            }
          }.bind(this, this._image));
        break;
    }
  };

  proto.handleEvent = function(e) {
    switch(e.type) {
    case 'progress':
    case 'downloadsuccess':
      if (this.state !== this._lastState) {
        this.refresh();
      }
      break;

    case 'downloaderror':
    case 'downloadapplied':
      this.refresh();
      break;
    }
  };

  var template = document.createElement('template');
  var stylesheet = baseurl + 'style.css';
  template.innerHTML =
    `<style>@import url(${stylesheet});</style>
     <div id='image-container'><div id="spinner"></div></div>
     <div><div id='subtitle'></div></div>`;

  return document.registerElement('gaia-app-icon', { prototype: proto });
})(window);
