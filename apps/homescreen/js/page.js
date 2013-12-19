'use strict';

/*
 * Icon constructor
 *
 * @param {Object} descriptor
 *                 An object that contains the data necessary to draw this
 *                 icon.
 * @param {Application} app [optional]
 *                      The Application or Bookmark object corresponding to
 *                      this icon.
 */
function Icon(descriptor, app) {
  this.descriptor = descriptor;
  this.app = app;
  this.updateAppStatus(app);
}


// Support rendering icons for different screens
var SCALE_RATIO = window.devicePixelRatio;
var MAX_ICON_SIZE = 60;
var ICON_PADDING_IN_CANVAS = 4;

Icon.prototype = {

  MAX_ICON_SIZE: MAX_ICON_SIZE,

  // It defines the time (in ms) to ensure that the onDragStop method finishes
  FALLBACK_DRAG_STOP_DELAY: 1000,

  DEFAULT_BOOKMARK_ICON_URL: window.location.protocol + '//' +
                    window.location.host + '/style/images/default_favicon.png',
  DEFAULT_ICON_URL: window.location.protocol + '//' + window.location.host +
                    '/style/images/default.png',
  DOWNLOAD_ICON_URL: window.location.protocol + '//' + window.location.host +
                    '/style/images/app_downloading.png',
  CANCELED_ICON_URL: window.location.protocol + '//' + window.location.host +
                    '/style/images/app_paused.png',

  // App icons shadow settings
  SHADOW_BLUR: 5,
  SHADOW_OFFSET_Y: 2,
  SHADOW_COLOR: 'rgba(0,0,0,0.15)',

  // These properties will be copied from the descriptor onto the icon's HTML
  // element dataset and allow us to uniquely look up the Icon object from
  // the HTML element.
  _descriptorIdentifiers: ['manifestURL', 'entry_point', 'bookmarkURL',
                           'useAsyncPanZoom', 'desiredPos', 'desiredScreen'],

  /**
   * The Application (or Bookmark) object corresponding to this icon.
   */
  app: null,

  /**
   * It returns an unique identifier among all icons installed on the homescreen
   */
  getUID: function icon_getUID() {
    var descriptor = this.descriptor;

    return (descriptor.manifestURL || descriptor.bookmarkURL) +
           (descriptor.entry_point ? descriptor.entry_point : '');
  },

  isOfflineReady: function icon_isOfflineReady() {
    return this.descriptor.type === GridItemsFactory.TYPE.COLLECTION ||
      !(this.descriptor.isHosted &&
      !this.descriptor.hasOfflineCache ||
      this.descriptor.type === GridItemsFactory.TYPE.BOOKMARK);
  },

  /*
   * Renders the icon into the page
   */
  render: function icon_render() {
    /*
     * <li role="button" aria-label="label" class="icon" data-manifestURL="zzz">
     *   <div>
     *     <img role="presentation" src="the icon image path"></img>
     *     <span class="label">label</span>
     *   </div>
     *   <span class="options"></span>
     * </li>
     */

    var container = this.container = document.createElement('li');
    var dataset = container.dataset;

    dataset.offlineReady = this.isOfflineReady();
    container.className = 'icon';
    if (this.descriptor.hidden) {
      delete this.descriptor.hidden;
      dataset.visible = false;
    }

    var descriptor = this.descriptor;
    dataset.isIcon = true;
    this._descriptorIdentifiers.forEach(function(prop) {
      var value = descriptor[prop];
      if (value || value === 0)
        dataset[prop] = value;
    });

    // Collection (as bookmarks)
    if (descriptor.type === GridItemsFactory.TYPE.COLLECTION) {
      dataset.isCollection = true;
      dataset.collectionId = descriptor.id;
      dataset.collectionName = descriptor.name;
    }

    var localizedName = this.getName();
    container.setAttribute('role', 'button');
    container.setAttribute('aria-label', localizedName);

    // Icon container
    var icon = this.icon = document.createElement('div');

    // Image
    var img = this.img = new Image();
    img.setAttribute('role', 'presentation');
    img.width = MAX_ICON_SIZE + ICON_PADDING_IN_CANVAS;
    img.height = MAX_ICON_SIZE + ICON_PADDING_IN_CANVAS;
    img.style.visibility = 'hidden';
    if (descriptor.renderedIcon) {
      this.displayRenderedIcon();
    } else {
      this.fetchImageData();
    }
    icon.appendChild(img);

    // Label

    // wrapper of the label -> overflow text should be centered
    // in draggable mode
    var wrapper = document.createElement('span');
    wrapper.className = 'labelWrapper';
    var label = this.label = document.createElement('span');
    label.textContent = localizedName;
    wrapper.appendChild(label);
    this.applyOverflowTextMask();

    icon.appendChild(wrapper);

    container.appendChild(icon);

    if (descriptor.removable === true) {
      this.appendOptions();
    }

    if (this.downloading) {
      //XXX: Bug 816043 We need to force the repaint to show the span
      // with the label and the animation (associated to the span)
      container.style.visibility = 'visible';
      icon.classList.add('loading');
    }
  },

  appendOptions: function icon_appendOptions() {
    var options = this.container.querySelector('.options');
    if (options) {
      return;
    }

    // Menu button to delete the app
    options = document.createElement('span');
    options.className = 'options';
    options.dataset.isIcon = true;
    this.container.appendChild(options);
  },

  removeOptions: function icon_removeOptions() {
    var options = this.container.querySelector('.options');
    if (!options) {
      return;
    }

    this.container.removeChild(options);
  },

  applyOverflowTextMask: function icon_applyOverflowTextMask() {
    var label = this.label;
    if (TextOverflowDetective.check(label.textContent)) {
      label.parentNode.classList.add('mask');
    } else {
      label.parentNode.classList.remove('mask');
    }
  },

  fetchImageData: function icon_fetchImageData() {
    var descriptor = this.descriptor;
    var icon = descriptor.icon;
    if (!icon) {
      this.loadCachedIcon();
      return;
    }

    // Display the default/oldRendered icon before trying to get the icon.
    // Sometimes when the network is quite bad the XHR can take time, and we
    // have an empty space
    this.loadCachedIcon();

    IconRetriever.get({
      icon: this,
      success: function(blob) {
        this.loadImageData(blob);
      }.bind(this),
      error: function() {
        if (this.icon && !this.downloading &&
            this.icon.classList.contains('loading')) {
          this.icon.classList.remove('loading');
          this.img.src = null;
        }
        this.loadCachedIcon();
      }.bind(this)
    });
  },

  loadCachedIcon: function icon_loadCachedImage() {
    var oldRenderedIcon = this.oldRenderedIcon;
    if (oldRenderedIcon && oldRenderedIcon instanceof Blob) {
      this.renderBlob(oldRenderedIcon);
    } else {
      this.loadDefaultIcon();
    }
  },

  loadImageData: function icon_loadImageData(blob) {
    var self = this;
    var img = new Image();
    img.src = window.URL.createObjectURL(blob);

    if (this.icon && !this.downloading) {
      this.icon.classList.remove('loading');
    }

    img.onload = function icon_loadSuccess() {
      img.onload = img.onerror = null;
      window.URL.revokeObjectURL(img.src);
      self.renderImage(img);
      self.isDefaultIcon = false;

      // real icon is ready (not default icon)
      if (!self.app.downloading &&
          self.descriptor.type !== GridItemsFactory.TYPE.COLLECTION) {
        window.dispatchEvent(new CustomEvent('appInstalled', {
          'detail': {
            'app': self.app
          }
        }));
      }
    };

    img.onerror = function icon_loadError() {
      console.error('error while loading the icon', img.src, '. Falling back ' +
          'to default icon.');
      window.URL.revokeObjectURL(img.src);
      self.loadDefaultIcon(img);
    };
  },

  loadDefaultIcon: function icon_loadDefaultIcon(img) {
    var image = img || new Image();
    var self = this;

    if (self.img && self.img.src) {
      // If there is one already loaded, do not continue...
      image.onload = image.onerror = null;
      return;
    }

    var blob = GridManager.getBlobByDefault(self.app);
    if (blob === null) {
      // At this point theoretically the flow shouldn't go because the icons
      // by default have to be loaded, but just in case to avoid race conditions
      image.src = getDefaultIcon(self.app);
      image.onload = function icon_defaultIconLoadSucess() {
        image.onload = image.onerror = null;
        self.renderImage(image);
      };
    } else {
      self.renderBlob(blob);
      image.onload = image.onerror = null;
    }

    this.isDefaultIcon = true;
  },

  renderImageForBookMark: function icon_renderImageForBookmark(img) {
    var self = this;
    var canvas = document.createElement('canvas');
    canvas.width = (MAX_ICON_SIZE + ICON_PADDING_IN_CANVAS) * SCALE_RATIO;
    canvas.height = (MAX_ICON_SIZE + ICON_PADDING_IN_CANVAS) * SCALE_RATIO;
    var ctx = canvas.getContext('2d');

    // Draw the background
    var background = new Image();
    background.src = 'style/images/default_background.png';
    background.onload = function icon_loadBackgroundSuccess() {
      ctx.shadowColor = self.SHADOW_COLOR;
      ctx.shadowBlur = self.SHADOW_BLUR;
      ctx.shadowOffsetY = self.SHADOW_OFFSET_Y;
      ctx.drawImage(background, 2 * SCALE_RATIO, 2 * SCALE_RATIO,
                    MAX_ICON_SIZE * SCALE_RATIO, MAX_ICON_SIZE * SCALE_RATIO);
      // Disable smoothing on icon resize
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.mozImageSmoothingEnabled = false;
      ctx.drawImage(img, 16 * SCALE_RATIO, 16 * SCALE_RATIO,
                    32 * SCALE_RATIO, 32 * SCALE_RATIO);
      canvas.toBlob(self.renderBlob.bind(self));
    };
  },

  renderImage: function icon_renderImage(img) {
    if (this.app && this.app.iconable) {
      this.renderImageForBookMark(img);
      return;
    }

    var canvas = this.createCanvas(img, this.descriptor.type);
    canvas.toBlob(this.renderBlob.bind(this));
  },

  createCanvas: function icon_createCanvas(img, type) {
    var canvas = document.createElement('canvas');
    canvas.width = (MAX_ICON_SIZE + ICON_PADDING_IN_CANVAS) * SCALE_RATIO;
    canvas.height = (MAX_ICON_SIZE + ICON_PADDING_IN_CANVAS) * SCALE_RATIO;

    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Collection icons are self contained and should NOT be manipulated
    if (type !== GridItemsFactory.TYPE.COLLECTION) {
      ctx.shadowColor = this.SHADOW_COLOR;
      ctx.shadowBlur = this.SHADOW_BLUR;
      ctx.shadowOffsetY = this.SHADOW_OFFSET_Y;
    }

    // Deal with very small or very large icons
    img.width =
        Math.min(MAX_ICON_SIZE, Math.max(img.width, MAX_ICON_SIZE));
    img.height =
        Math.min(MAX_ICON_SIZE, Math.max(img.height, MAX_ICON_SIZE));

    var width = Math.min(img.width * SCALE_RATIO,
                         canvas.width - ICON_PADDING_IN_CANVAS * SCALE_RATIO);
    var height = Math.min(img.width * SCALE_RATIO,
                          canvas.height - ICON_PADDING_IN_CANVAS * SCALE_RATIO);
    ctx.drawImage(img,
                  (canvas.width - width) / 2,
                  (canvas.height - height) / 2,
                  width, height);
    ctx.fill();

    return canvas;
  },

  // The url that is passed as a parameter to the callback must be revoked
  loadRenderedIcon: function icon_loadRenderedIcon(callback) {
    var img = this.img;
    var blob = this.descriptor.renderedIcon;
    if (!blob) {
      blob = GridManager.getBlobByDefault(this.app);
    }
    img.src = window.URL.createObjectURL(blob);
    if (callback) {
      img.onload = img.onerror = function done() {
        callback(this.src);
        img.onload = img.onerror = null;
      };
    }
  },

  renderBlob: function icon_renderBlob(blob) {
    this.descriptor.renderedIcon = blob;
    GridManager.markDirtyState();
    this.displayRenderedIcon();
  },

  displayRenderedIcon: function icon_displayRenderedIcon() {
    var self = this;
    this.loadRenderedIcon(function cleanup(url) {
      self.img.style.visibility = 'visible';
      window.URL.revokeObjectURL(url);
      if (self.needsShow)
        self.show();
    });
  },

  show: function icon_show() {
    // Wait for the icon image to load until we start the animation.
    if (!this.img.naturalWidth) {
      this.needsShow = true;
      return;
    }

    this.needsShow = false;
    var container = this.container;
    container.dataset.visible = true;
    container.addEventListener('animationend', function animationEnd(e) {
      container.removeEventListener('animationend', animationEnd);
      delete container.dataset.visible;
    });
  },

  updateAppStatus: function icon_updateAppStatus(app) {
    // change default icon size for tablet+ device
    if (!ScreenLayout.getCurrentLayout('tiny')) {
      MAX_ICON_SIZE = 90;
    }
    if (app) {
      this.downloading = app.downloading;
      this.cancelled = (app.installState === 'pending') && !app.downloading;
    } else {
      this.downloading = false;
      this.cancelled = false;
    }
  },

  update: function icon_update(descriptor, app) {
    this.app = app;
    this.updateAppStatus(app);
    var oldDescriptor = this.descriptor;
    this.descriptor = descriptor;
    descriptor.removable === true ? this.appendOptions() : this.removeOptions();

    // Update dataset properties
    this.container.dataset.offlineReady = this.isOfflineReady();

    if (descriptor.updateTime == oldDescriptor.updateTime &&
        descriptor.icon == oldDescriptor.icon) {
      this.descriptor.renderedIcon = oldDescriptor.renderedIcon;
    } else {
      this.oldRenderedIcon = oldDescriptor.renderedIcon;
      this.fetchImageData();
    }
    if (descriptor.updateTime != oldDescriptor.updateTime ||
        descriptor.name != oldDescriptor.name ||
        descriptor.localizedName != oldDescriptor.localizedName) {
      this.translate();
    }
  },

  showDownloading: function icon_showDownloading() {
    this.img.src = this.DOWNLOAD_ICON_URL;
    this.container.style.visibility = 'visible';
    this.icon.classList.add('loading');
  },

  showCancelled: function icon_showCancelled() {
    this.img.src = this.CANCELED_ICON_URL;
    this.container.style.visibility = 'visible';
    this.icon.classList.remove('loading');
    this.fetchImageData();
  },

  remove: function icon_remove() {
    this.container.parentNode.removeChild(this.container);
  },

  /*
   * Sets a non-translationable name
   *
   * @param{string} non-translationable name
   */
  setName: function icon_setName(name) {
    this.label.textContent = this.descriptor.customName = name;
    this.applyOverflowTextMask();
    GridManager.markDirtyState();
  },

  /*
   * Returns the name icon
   */
  getName: function icon_getName() {
    var desc = this.descriptor;
    return desc.customName || desc.localizedName || desc.name;
  },

  /*
   * Sets the icon's image
   *
   * @param{string} the new icon
   */
  setImage: function icon_setImage(image) {
    this.descriptor.icon = image;
    this.fetchImageData();
  },

  /*
   * Translates the label of the icon
   */
  translate: function icon_translate() {
    var descriptor = this.descriptor;
    if (descriptor.type === GridItemsFactory.TYPE.BOOKMARK ||
        descriptor.customName)
      return;

    var app = this.app;
    if (!app)
      return;

    var manifest = app.manifest || app.updateManifest;
    if (!manifest)
      return;

    var localizedName;

    if (descriptor.type === GridItemsFactory.TYPE.COLLECTION) {
      // try to translate, but fall back to current name
      // (translation might fail for custom collection name)
      localizedName = navigator.mozL10n.get(manifest.name) || manifest.name;
    } else {
      var iconsAndNameHolder = manifest;
      var entryPoint = descriptor.entry_point;
      if (entryPoint)
        iconsAndNameHolder = manifest.entry_points[entryPoint];

      localizedName = new ManifestHelper(iconsAndNameHolder).name;
    }

    this.label.textContent = localizedName;
    if (descriptor.localizedName != localizedName) {
      descriptor.localizedName = localizedName;
      GridManager.markDirtyState();
    }

    this.applyOverflowTextMask();
  },

  /*
   * This method is invoked when the drag gesture starts
   *
   * @param{int} x-coordinate
   *
   * @param{int} y-coordinate
   */
  onDragStart: function icon_onDragStart(x, y) {
    this.initX = x;
    this.initY = y;

    var draggableElem = this.draggableElem = document.createElement('div');
    draggableElem.className = 'draggable';
    if (this.descriptor.type !== GridItemsFactory.TYPE.COLLECTION) {
      // Collections cannot be appended to others so this operation isn't needed
      this.savePostion(draggableElem.dataset);
    }

    // For some reason, cloning and moving a node re-triggers the blob
    // URI to be validated. So we assign a new blob URI to the image
    // and don't revoke it until we're finished with the animation.
    this.loadRenderedIcon();

    var icon = this.icon.cloneNode(true);
    var img = icon.querySelector('img');
    img.style.visibility = 'hidden';
    img.onload = img.onerror = function unhide() {
      img.style.visibility = 'visible';
    };
    draggableElem.appendChild(icon);

    var container = this.container;
    container.dataset.dragging = 'true';

    var rectangle = container.getBoundingClientRect();
    var style = draggableElem.style;
    style.left = rectangle.left + 'px';
    style.top = rectangle.top + 'px';
    this.initXCenter = (rectangle.left + rectangle.right) / 2;
    this.initYCenter = (rectangle.top + rectangle.bottom) / 2;
    this.initHeight = rectangle.bottom - rectangle.top;

    document.body.appendChild(draggableElem);
  },

  /*
   * Saves the current container (page or dock) and  position.
   *
   * * pageType -> 'dock' or 'page' types
   * * pageIndex -> index of page (no needed for dock)
   * * iconIndex -> index of icon inside page or dock container
   *
   * @param{Object} Source object to set results
   */
  savePostion: function icon_savePosition(obj) {
    var page;

    if (this.container.parentNode === DockManager.page.olist) {
      page = DockManager.page;
      obj.pageType = 'dock';
    } else {
      page = GridManager.pageHelper.getCurrent();
      obj.pageType = 'page';
      obj.pageIndex = GridManager.pageHelper.getCurrentPageNumber();
    }

    obj.iconIndex = page.getIconIndex(this.container);
  },

  addClassToDragElement: function icon_addStyleToDragElement(className) {
    this.draggableElem.classList.add(className);
  },

  removeClassToDragElement: function icon_addStyleToDragElement(className) {
    this.draggableElem.classList.remove(className);
  },

  /*
   * This method is invoked when the drag gesture finishes. If x and y are
   * defined, the icon flies to this position
   *
   * @param{Function} callback will be performed when animations finishes
   *
   * @param{Integer} x-coordinate
   *
   * @param{Integer} y-coordinate
   *
   * @param{Integer} scale factor of the animation
   */
  onDragStop: function icon_onDragStop(callback, tx , ty, scale) {
    var container = this.container;

    var x = tx,
        y = ty;

    if (typeof x === 'undefined') {
      var rect = container.getBoundingClientRect();
      x = (Math.abs(rect.left + rect.right) / 2) % window.innerWidth;
      x -= this.initXCenter;

      y = (rect.top + rect.bottom) / 2 +
          (this.initHeight - (rect.bottom - rect.top)) / 2;
      y -= this.initYCenter;
    }

    var draggableElem = this.draggableElem;
    var style = draggableElem.style;
    style.MozTransition = '-moz-transform .4s';
    style.MozTransform = 'translate(' + x + 'px,' + y + 'px)';

    var finishDrag = function() {
      delete container.dataset.dragging;
      if (draggableElem) {
        var img = draggableElem.querySelector('img');
        window.URL.revokeObjectURL(img.src);
        draggableElem.parentNode.removeChild(draggableElem);
      }
      callback();
    };

    // We ensure that there is not an icon lost on the grid
    var fallbackID = window.setTimeout(function() {
      fallbackID = null;
      finishDrag();
    }, this.FALLBACK_DRAG_STOP_DELAY);

    var content = draggableElem.querySelector('div');
    scale = typeof scale !== 'undefined' ? scale : 1;
    content.style.MozTransform = 'scale(' + scale + ')';
    content.addEventListener('transitionend', function tEnd(e) {
      e.target.removeEventListener('transitionend', tEnd);
      if (fallbackID !== null) {
        window.clearTimeout(fallbackID);
        finishDrag();
      }
    });
  },

  getTop: function icon_getTop() {
    return this.container.getBoundingClientRect().top;
  },

  getLeft: function icon_getLeft() {
    return this.container.getBoundingClientRect().left;
  },

  getWidth: function icon_getWidth() {
    return this.container.getBoundingClientRect().width;
  },

  /*
   * Returns the descriptor object
   */
  getDescriptor: function icon_getDescriptor() {
    if (this.isDefaultIcon) {
      delete this.descriptor.renderedIcon;
    }

    return this.descriptor;
  }
};

function TemplateIcon(iconable) {
  var descriptor = {
    name: 'templateIcon',
    hidden: true,
    renderedIcon: null
  };

  var app = {};
  if (iconable) {
    app.iconable = true;
  }

  Icon.call(this, descriptor, app);
}

TemplateIcon.prototype = {
  __proto__: Icon.prototype,
  loadDefaultIcon: function ticon_loadDefaultIcon() {
    var image = new Image();
    var self = this;
    image.src = getDefaultIcon(self.app);
    image.onload = function icon_defaultIconLoadSucess() {
      image.onload = null;
      self.renderImage(image);
    };
  },
  renderBlob: function ticon_renderBlob(blob) {
    this.descriptor.renderedIcon = blob;
  }
};

/*
 * Page constructor
 *
 * @param {HTMLElement] container
 *                      HTML container element of the page.
 *
 * @param {Array} icons [optional]
 *                List of Icon objects.
 */
function Page(container, icons, numberOfIcons) {
  this.container = this.movableContainer = container;
  if (icons)
    this.render(icons);
  this.iconsWhileDragging = [];
  this.maxIcons = numberOfIcons || GridManager.pageHelper.maxIconsPerPage;
}

Page.prototype = {

  ICONS_PER_ROW: 4,

  DRAGGING_TRANSITION: '-moz-transform .3s',

  REARRANGE_DELAY: 50,

  FALLBACK_READY_EVENT_DELAY: 1000,

  // After launching an app we disable the page during this time (ms)
  // in order to prevent multiple open-app animations
  DISABLE_TAP_EVENT_DELAY: 500,

  /*
   * Renders a page for a list of apps
   *
   * @param{Array} icons
   *               List of Icon objects.
   */
  render: function pg_render(icons) {
    // By default the page is hidden unless it is the current page.
    this.container.setAttribute('aria-hidden', true);
    this.olist = document.createElement('ol');
    for (var i = 0, icon; icon = icons[i++];) {
      this.appendIcon(icon);
    }
    this.container.appendChild(this.olist);
  },

  /*
   * Applies a translation effect to the page
   *
   * @param{int} scroll X
   * @param{int} duration
   */
  moveByWithEffect: function pg_moveByWithEffect(scrollX, duration) {
    var container = this.movableContainer;
    var style = container.style;
    style.MozTransform = 'translateX(' + scrollX + 'px)';
    style.MozTransition = '-moz-transform ' + duration + 'ms ease';
  },

  /*
   * Applies a translation to the page
   *
   * @param{int} scroll X
   */
  moveBy: function pg_moveBy(scrollX) {
    var style = this.movableContainer.style;
    style.MozTransform = 'translateX(' + scrollX + 'px)';
    style.MozTransition = '';
  },

  ready: true,

  setReady: function pg_setReady(value) {
    this.ready = value;
    if (value) {
      this.container.dispatchEvent(new CustomEvent('onpageready'));
    }
  },

  /*
   * Changes position between two icons
   *
   * @param {Icon} originIcon
   *               The origin icon that's being dragged.
   *
   * @param {Icon} targetIcon
   *               The target icon that is replaced by the origin icon.
   */
  drop: function pg_drop(originIcon, targetIcon) {
    if (!this.ready || originIcon === targetIcon) {
      return;
    }

    this.setReady(false);

    var iconList = this.olist.children;
    if (originIcon && targetIcon && iconList.length > 1) {
      if (this.iconsWhileDragging.length === 0)
        this.iconsWhileDragging = Array.prototype.slice.call(iconList, 0,
                                                             iconList.length);
      this.animate(this.iconsWhileDragging, originIcon.container,
                   targetIcon.container);
    } else {
      setTimeout(this.setReady.bind(this, true));
    }
  },

  animate: function pg_animate(children, draggableNode, targetNode) {
    var draggableIndex = children.indexOf(draggableNode);
    var targetIndex = children.indexOf(targetNode);

    if (draggableIndex < 0 || targetIndex < 0 || targetIndex >= this.maxIcons) {
      // Index is outside the bounds of the array, it doesn't make sense
      setTimeout(this.setReady.bind(this, true));
      return;
    }

    var upward = draggableIndex < targetIndex;
    this.draggableNode = draggableNode;
    this.beforeNode = upward ? targetNode.nextSibling : targetNode;
    this.placeIcon(draggableNode, draggableIndex, targetIndex);

    var self = this;
    targetNode.addEventListener('transitionend', function onTransitionEnd(e) {
      e.target.removeEventListener('transitionend', onTransitionEnd);
      children.splice(draggableIndex, 1);
      children.splice(targetIndex, 0, draggableNode);
      setTimeout(self.setReady.bind(self, true));
    });

    if (upward) {
      for (var i = draggableIndex + 1; i <= targetIndex; i++)
        this.placeIcon(children[i], i, i - 1, this.DRAGGING_TRANSITION);
    } else {
      for (var i = targetIndex; i < draggableIndex; i++)
        this.placeIcon(children[i], i, i + 1, this.DRAGGING_TRANSITION);
    }
  },

  doDragLeave: function pg_doReArrange(callback, reflow) {
    this.iconsWhileDragging.forEach(function reset(node) {
      node.style.MozTransform = node.style.MozTransition = '';
      delete node.dataset.posX;
      delete node.dataset.posY;
    });

    this.iconsWhileDragging = [];

    if (reflow && this.olist.contains(this.draggableNode))
      this.olist.insertBefore(this.draggableNode, this.beforeNode);

    callback();
  },

  onDragLeave: function pg_onDragLeave(callback, reflow) {
    if (this.iconsWhileDragging.length === 0) {
      setTimeout(callback);
      return;
    }

    if (!this.ready) {
      var self = this;
      var ensureCallbackID = null;
      var onPageReady = function onPageReady(e) {
        e.target.removeEventListener('onpageready', onPageReady);
        if (ensureCallbackID !== null) {
          window.clearTimeout(ensureCallbackID);
          self.doDragLeave(callback, reflow);
        }
      };
      self.container.addEventListener('onpageready', onPageReady);

      // We ensure that there is not a transitionend lost on dragging
      ensureCallbackID = window.setTimeout(function() {
        ensureCallbackID = null;
        self.container.removeEventListener('onpageready', onPageReady);
        self.doDragLeave(function onfinish() {
          self.setReady(true);
          callback();
        }, reflow);
      }, this.FALLBACK_READY_EVENT_DELAY);

      return;
    }

    this.doDragLeave(callback, reflow);
  },

  placeIcon: function pg_placeIcon(node, from, to, transition) {
    if (!node)
      return;

    var x = node.dataset.posX = parseInt(node.dataset.posX || 0) +
                      ((Math.floor(to % this.ICONS_PER_ROW) -
                        Math.floor(from % this.ICONS_PER_ROW)) * 100);
    var y = node.dataset.posY = parseInt(node.dataset.posY || 0) +
                      ((Math.floor(to / this.ICONS_PER_ROW) -
                        Math.floor(from / this.ICONS_PER_ROW)) * 100);

    window.mozRequestAnimationFrame(function() {
      node.style.MozTransform = 'translate(' + x + '%, ' + y + '%)';
      if (transition)
        node.style.MozTransition = transition;
    });
  },

  /*
   * Implements the tap behaviour
   *
   * @param{Object} DOM element
   *
   * @param{Function} callback
   */
  tap: function pg_tap(elem, callback) {
    if (Homescreen.isInEditMode()) {
      if (elem.classList.contains('options')) {
        var icon = GridManager.getIcon(elem.parentNode.dataset);
        if (icon.app)
          Homescreen.showAppDialog(icon);
      }
      callback();
    } else if ('isIcon' in elem.dataset && this.olist === elem.parentNode &&
               !document.body.hasAttribute('disabled-tapping')) {
      var icon = GridManager.getIcon(elem.dataset);
      if (!icon.app)
        return;

      if (icon.descriptor.entry_point) {
        this.disableTap(callback);
        icon.app.launch(icon.descriptor.entry_point);
        return;
      }

      if (icon.cancelled) {
        GridManager.showRestartDownloadDialog(icon);
        callback();
        return;
      }

      this.disableTap(callback);
      icon.app.launch();
    }
  },

  /*
   * Disables the tap event for the page
   *
   * @param{Function} callback
   */
  disableTap: function pg_disableTap(callback) {
    document.body.setAttribute('disabled-tapping', true);

    var disableTapTimeout = null;

    var enableTap = function enableTap() {
      document.removeEventListener('visibilitychange', enableTap);
      document.removeEventListener('collectionopened', enableTap);
      window.removeEventListener('hashchange', enableTap);
      if (disableTapTimeout !== null) {
        window.clearTimeout(disableTapTimeout);
        disableTapTimeout = null;
      }
      document.body.removeAttribute('disabled-tapping');
      callback && callback();
    };

    // We are going to enable the tapping feature under these conditions:
    // 1. The opened app is in foreground
    document.addEventListener('visibilitychange', enableTap);
    // 2. The opened collection is in foreground
    document.addEventListener('collectionopened', enableTap);
    // 3. Users click on home button quickly while app are opening
    window.addEventListener('hashchange', enableTap);
    // 4. After this time out
    disableTapTimeout = window.setTimeout(enableTap,
        this.DISABLE_TAP_EVENT_DELAY);

  },

  /*
   * Adds an icon at the position specified
   *
   * @param{Object} icon object
   * @param{Number} index to insert at
   */
  appendIconAt: function pg_appendIconAt(icon, index) {
    var olist = this.olist,
        children = this.olist.children;

    if (children[index] && children[index] === icon.container) {
      return;
    }

    if (!icon.container) {
      icon.render();
    }

    if (children[index]) {
      olist.insertBefore(icon.container, children[index]);
    } else {
      olist.appendChild(icon.container);
    }
  },

  /*
   * Adds an icon to the begining of the page
   *
   * @param{Object} icon object
   */
  prependIcon: function pg_prependIcon(icon) {
    var olist = this.olist;
    if (olist.children.length > 0) {
      olist.insertBefore(icon.container, olist.firstChild);
    } else {
      olist.appendChild(icon.container);
    }
  },

  /*
   * Removes the last icon of the page and returns it
   */
  popIcon: function pg_popIcon() {
    var icon = this.getLastIcon();
    icon.remove();
    return icon;
  },

  /*
   * Returns the icons which desiredScreen is bigger than position
   * @param{int} position is DesiredScreen value which with compare
   */
  getMisplacedIcons: function pg_getMisplacedIcons(currentScreen) {
    var misplaced = [];
    var appsDesiredScreen =
         this.olist.querySelectorAll('li[data-desired-screen]');
    var numApps = appsDesiredScreen.length;
    for (var i = numApps - 1; i >= 0; i--) {
      var desiredScreen = appsDesiredScreen[i].dataset.desiredScreen;
      if (desiredScreen > currentScreen) {
        misplaced.push(GridManager.getIcon(appsDesiredScreen[i].dataset));
      }
    }
    return misplaced;
  },

  insertBeforeLastIcon: function pg_insertBeforeLastIcon(icon) {
    var olist = this.olist;
    if (olist.children.length > 0) {
      olist.insertBefore(icon.container, olist.lastChild);
    }
  },

  /*
   * Returns the last icon of the page
   */
  getLastIcon: function pg_getLastIcon() {
    var lastIcon = this.olist.lastChild;
    if (this.iconsWhileDragging.length > 0)
      lastIcon = this.iconsWhileDragging[this.iconsWhileDragging.length - 1];

    if (!lastIcon)
      return null;
    return GridManager.getIcon(lastIcon.dataset);
  },

  /*
   * Returns the last visible icon of the page
   */
  getLastVisibleIcon: function pg_getLastVisibleIcon() {
    if (this.getNumIcons() <= this.maxIcons) {
      return this.getLastIcon();
    } else {
      var node = this.olist.children[this.maxIcons - 1];
      if (this.iconsWhileDragging.length > 0)
        node = this.iconsWhileDragging[this.maxIcons - 1];

      if (!node) {
        return null;
      }

      return GridManager.getIcon(node.dataset);
    }
  },

  /*
   * Returns the first icon of the page
   */
  getFirstIcon: function pg_getFirstIcon() {
    var firstIcon = this.olist.firstChild;
    if (this.iconsWhileDragging.length > 0)
      firstIcon = this.iconsWhileDragging[0];

    if (!firstIcon)
      return null;
    return GridManager.getIcon(firstIcon.dataset);
  },

  /*
   * Move the apps in position higher than 'pos' one position ahead if they have
   * a desiredPosition lower than their actual position
   */
  _moveAhead: function pg_moveAhead(pos) {
    // When a new sv app is installed, the previously sv apps installed in
    // higher positions will have been moved.
    // This function restores their previous position if needed
    var iconList = this.olist.children;
    var numIcons = iconList.length;

    for (var i = pos; i < numIcons; i++) {
      var iconPos = iconList[i].dataset && iconList[i].dataset.desiredPos;
      if (i > iconPos) {
        this.olist.insertBefore(iconList[i], iconList[i - 1]);
      }
    }
  },

  /*
   * Return true if the Page has free space, return false otherwise
   */
  hasEmptySlot: function pg_hasEmptySlot() {
    return this.getNumIcons() < this.maxIcons;
  },

  /*
   * Insert an icon in the page
   */
  _insertIcon: function pg_insertIcon(icon) {
    var iconList = this.olist.children;
    var container = icon.container;

    // Inserts the icon in the closest possible space to its desired position,
    // keeping the order of all existing icons with desired position
    if (icon.descriptor && icon.descriptor.desiredPos !== undefined &&
        Configurator.isSimPresentOnFirstBoot) {
      var desiredPos = icon.descriptor.desiredPos;
      var manifest = icon.descriptor.manifestURL;
      // Add to the installed SV apps array
      GridManager.addPreviouslyInstalled(manifest);
      var numIcons = iconList.length;
      for (var i = 0; (i < numIcons) && (i <= desiredPos); i++) {
        var iconPos = iconList[i].dataset && iconList[i].dataset.desiredPos;
        if ((iconPos > desiredPos) || (i === desiredPos)) {
          this.olist.insertBefore(container, iconList[i]);
          this._moveAhead(i + 1);
          return;
        }
      }
    }
    this.olist.appendChild(container);
  },

  /*
   * Appends an icon to the end of the page
   *
   * @param{Object} moz app or icon object
   */
  appendIcon: function pg_appendIcon(icon) {
    if (!icon.container) {
      icon.render();
    }
    this._insertIcon(icon);
  },

  /**
   * Appends an icon to the end of the page
   * If the page is already full, then we insert the icon at the last place, and
   * the icon that was at the last place and will be hidden will eventually flow
   * to the next page. This is done in GridManager's ensurePagesOverflow
   *
   * @param {Object} icon the icon to be added.
   */
  appendIconVisible: function pg_appendIconVisible(icon) {
    if (this.getNumIcons() >= this.maxIcons) {
      this.insertBeforeLastIcon(icon);
    } else {
      this.appendIcon(icon);
    }
  },

  containsIcon: function pg_containsIcon(icon) {
    return icon.container.parentNode === this.olist;
  },

  /*
   * Removes the page container from the DOM tree.
   *
   * @note This does *not* take care of any icons that are left on
   * this page. Their DOM elements will be lost unless these icons are
   * explicitly moved to different pages.
   */
  destroy: function pg_destroy() {
    this.container.parentNode.removeChild(this.container);
  },

  /*
   * Returns the number of icons
   */
  getNumIcons: function pg_getNumIcons() {
    return this.olist.children.length;
  },

  /**
   * Marshall the page's state.
   */
  getIconDescriptors: function pg_getIconDescriptors() {
    var nodes = this.olist.children;
    return Array.prototype.map.call(nodes, function marshall(node) {
      var icon = GridManager.getIcon(node.dataset);
      return icon.getDescriptor();
    });
  },

  getIndex: function pg_getIndex() {
    var pages = this.container.parentNode.children;
    pages = Array.prototype.slice.call(pages, 0, pages.length);
    return pages.indexOf(this.container);
  },

  getIconIndex: function pg_getIconIndex(icon) {
    var icons = this.olist.children;
    icons = Array.prototype.slice.call(icons, 0, icons.length);
    return icons.indexOf(icon);
  }
};

function getDefaultIcon(app) {
  if (app && app.iconable) {
    return Icon.prototype.DEFAULT_BOOKMARK_ICON_URL;
  } else {
    return Icon.prototype.DEFAULT_ICON_URL;
  }
}

function extend(subClass, superClass) {
  var F = function() {};
  F.prototype = superClass.prototype;
  subClass.prototype = new F();
  subClass.prototype.constructor = subClass;
  subClass.uber = superClass.prototype;
}

function Dock(container, icons) {
  Page.call(this, container, icons);
}

extend(Dock, Page);

var dockProto = Dock.prototype;

dockProto.baseRender = Page.prototype.render;

dockProto.render = function dk_render(apps, target) {
  this.baseRender(apps, target);
  this.movableContainer = this.olist;
};

dockProto.moveByWithEffect = function dk_moveByWithEffect(scrollX, duration) {
  var container = this.movableContainer;
  var style = container.style;
  style.MozTransform = 'translateX(' + scrollX + 'px)';
  style.MozTransition = '-moz-transform ' + duration + 'ms ease';
};

dockProto.moveByWithDuration = function dk_moveByWithDuration(scrollX,
                                                              duration) {
  var style = this.movableContainer.style;
  style.MozTransform = 'translateX(' + scrollX + 'px)';
  style.MozTransition = '-moz-transform ' + duration + 'ms ease';
};

dockProto.getLeft = function dk_getLeft() {
  return this.olist.getBoundingClientRect().left;
};

dockProto.getTransform = function dk_getTransform() {
  return this.movableContainer.style.MozTransform;
};

/**
 * Returns the right position of the last icon in the dock
 */
dockProto.getRight = function dk_getRight() {
  var children = this.olist.children;
  var lastChild = children[children.length - 1];
  if (!lastChild) {
    return 0;
  }

  return lastChild.getBoundingClientRect().right;
};

dockProto.getWidth = function dk_getWidth() {
  return this.olist.clientWidth;
};

dockProto.placeIcon = function pg_placeIcon(node, from, to, transition) {
  if (!node)
    return;

  var x = node.dataset.posX = parseInt(node.dataset.posX || 0) + (to - from) *
                              100;

  node.style.MozTransform = 'translateX(' + x + '%)';
  if (transition)
    node.style.MozTransition = transition;
};

var TextOverflowDetective = (function() {

  var iconFakeWrapperWidth;
  var iconFakeLabel;

  function init() {
    var fakeIconName = document.querySelector('#fake-icon-name-wrapper');
    iconFakeWrapperWidth = fakeIconName.offsetWidth;
    iconFakeLabel = document.querySelector('#fake-icon-name');
  }

  function check(text) {
    if (!iconFakeLabel || !iconFakeWrapperWidth) {
      init();
    }
    iconFakeLabel.textContent = text;
    return iconFakeLabel.offsetWidth >= iconFakeWrapperWidth;
  }

  return {
    check: check
  };
})();
