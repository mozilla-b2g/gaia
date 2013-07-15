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
var BASE_WIDTH = 320;
var SCALE_RATIO = window.devicePixelRatio;
var MIN_ICON_SIZE = 52;
var MAX_ICON_SIZE = 60;
var ICON_PADDING_IN_CANVAS = 4;
var ICONS_PER_ROW = 4;

var DRAGGING_TRANSITION = '-moz-transform .3s';

Icon.prototype = {

  MAX_ICON_SIZE: MAX_ICON_SIZE,

  MIN_ICON_SIZE: MIN_ICON_SIZE,

  DEFAULT_BOOKMARK_ICON_URL: window.location.protocol + '//' +
                    window.location.host + '/style/images/default_favicon.png',
  DEFAULT_ICON_URL: window.location.protocol + '//' + window.location.host +
                    '/style/images/default.png',
  DOWNLOAD_ICON_URL: window.location.protocol + '//' + window.location.host +
                    '/style/images/app_downloading.png',
  CANCELED_ICON_URL: window.location.protocol + '//' + window.location.host +
                    '/style/images/app_paused.png',

  // These properties will be copied from the descriptor onto the icon's HTML
  // element dataset and allow us to uniquely look up the Icon object from
  // the HTML element.
  _descriptorIdentifiers: ['manifestURL', 'entry_point', 'bookmarkURL',
                           'useAsyncPanZoom'],

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
    return !(this.descriptor.isHosted &&
      !this.descriptor.hasOfflineCache ||
      this.descriptor.isBookmark);
  },

  /*
   * Renders the icon into the page
   *
   * @param{Object} where the icon should be rendered
   *
   * @param{Object} where the draggable element should be appended
   */
  render: function icon_render(target) {
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
    this.container.dataset.offlineReady = this.isOfflineReady();
    container.className = 'icon';
    if (this.descriptor.hidden) {
      delete this.descriptor.hidden;
      container.dataset.visible = false;
    }

    var descriptor = this.descriptor;
    container.dataset.isIcon = true;
    this._descriptorIdentifiers.forEach(function(prop) {
      var value = descriptor[prop];
      if (value)
        container.dataset[prop] = value;
    });

    var localizedName = descriptor.localizedName || descriptor.name;
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

    target.appendChild(container);

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
      },
      error: function() {
        if (this.icon && !this.downloading &&
            this.icon.classList.contains('loading')) {
          this.icon.classList.remove('loading');
          this.img.src = null;
        }
        this.loadCachedIcon();
      }
    });
  },

  loadCachedIcon: function icon_loadCachedImage() {
    var oldRenderedIcon = this.descriptor.oldRenderedIcon;
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
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetY = 2;
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

    var canvas = document.createElement('canvas');
    canvas.width = (MAX_ICON_SIZE + ICON_PADDING_IN_CANVAS) * SCALE_RATIO;
    canvas.height = (MAX_ICON_SIZE + ICON_PADDING_IN_CANVAS) * SCALE_RATIO;

    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetY = 2;

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

    canvas.toBlob(this.renderBlob.bind(this));
  },

  // The url that is passed as a parameter to the callback must be revoked
  loadRenderedIcon: function icon_loadRenderedIcon(callback) {
    var img = this.img;
    img.src = window.URL.createObjectURL(this.descriptor.renderedIcon);
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

    // Update offline availability
    this.container.dataset.offlineReady = this.isOfflineReady();

    if (descriptor.updateTime == oldDescriptor.updateTime &&
        descriptor.icon == oldDescriptor.icon) {
      this.descriptor.renderedIcon = oldDescriptor.renderedIcon;
    } else {
      this.descriptor.oldRenderedIcon = oldDescriptor.renderedIcon;
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
   * Translates the label of the icon
   */
  translate: function icon_translate() {
    var descriptor = this.descriptor;
    if (descriptor.bookmarkURL)
      return;

    var app = this.app;
    if (!app)
      return;

    var manifest = app.manifest || app.updateManifest;
    if (!manifest)
      return;

    var iconsAndNameHolder = manifest;
    var entryPoint = descriptor.entry_point;
    if (entryPoint)
      iconsAndNameHolder = manifest.entry_points[entryPoint];

    var localizedName = new ManifestHelper(iconsAndNameHolder).name;

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

    // For some reason, cloning and moving a node re-triggers the blob
    // URI to be validated. So we assign a new blob URI to the image
    // and don't revoke it until we're finished with the animation.
    this.loadRenderedIcon();

    var icon = this.icon.cloneNode();
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

  addClassToDragElement: function icon_addStyleToDragElement(className) {
    this.draggableElem.classList.add(className);
  },

  removeClassToDragElement: function icon_addStyleToDragElement(className) {
    this.draggableElem.classList.remove(className);
  },

  /*
   * This method is invoked when the drag gesture finishes
   */
  onDragStop: function icon_onDragStop(callback) {
    var container = this.container;

    var rect = container.getBoundingClientRect();
    var x = (Math.abs(rect.left + rect.right) / 2) % window.innerWidth;
    x -= this.initXCenter;

    var y = (rect.top + rect.bottom) / 2 +
            (this.initHeight - (rect.bottom - rect.top)) / 2;
    y -= this.initYCenter;

    var draggableElem = this.draggableElem;
    var style = draggableElem.style;
    style.MozTransition = '-moz-transform .4s';
    style.MozTransform = 'translate(' + x + 'px,' + y + 'px)';
    draggableElem.querySelector('div').style.MozTransform = 'scale(1)';

    draggableElem.addEventListener('transitionend', function draggableEnd(e) {
      draggableElem.removeEventListener('transitionend', draggableEnd);
      delete container.dataset.dragging;
      document.body.removeChild(draggableElem);
      var img = draggableElem.querySelector('img');
      window.URL.revokeObjectURL(img.src);
      callback();
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
  }
};

function TemplateIcon(isBookmark) {
  var descriptor = {
    name: 'templateIcon',
    hidden: true,
    renderedIcon: null
  };

  var app = {};
  if (isBookmark) {
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
function Page(container, icons) {
  this.container = this.movableContainer = container;
  if (icons)
    this.render(icons);
  this.iconsWhileDragging = [];
  this.maxIcons = GridManager.pageHelper.maxIconsPerPage;
}

Page.prototype = {

  // After launching an app we disable the page during <this time> in order to
  // prevent multiple open-app animations
  DISABLE_TAP_EVENT_DELAY: 600,

  /*
   * Renders a page for a list of apps
   *
   * @param{Array} icons
   *               List of Icon objects.
   */
  render: function pg_render(icons) {
    this.olist = document.createElement('ol');
    for (var i = 0; i < icons.length; i++) {
      this.appendIcon(icons[i]);
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
        this.placeIcon(children[i], i, i - 1, DRAGGING_TRANSITION);
    } else {
      for (var i = targetIndex; i < draggableIndex; i++)
        this.placeIcon(children[i], i, i + 1, DRAGGING_TRANSITION);
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
      var self = this, ensureCallbackID = null;
      self.container.addEventListener('onpageready', function onPageReady(e) {
        e.target.container.removeEventListener('onpageready', onPageReady);
        if (ensureCallbackID !== null) {
          window.clearTimeout(ensureCallbackID);
          self.doDragLeave(callback, reflow);
        }
      });

      // We ensure that there is not a transitionend lost on dragging
      var ensureCallbackID = window.setTimeout(function() {
        ensureCallbackID = null;
        self.doDragLeave(callback, reflow);
      }, 300); // Dragging transition time

      return;
    }

    this.doDragLeave(callback, reflow);
  },

  placeIcon: function pg_placeIcon(node, from, to, transition) {
    if (!node)
      return;

    var x = node.dataset.posX = parseInt(node.dataset.posX || 0) +
                      ((Math.floor(to % ICONS_PER_ROW) -
                        Math.floor(from % ICONS_PER_ROW)) * 100);
    var y = node.dataset.posY = parseInt(node.dataset.posY || 0) +
                      ((Math.floor(to / ICONS_PER_ROW) -
                        Math.floor(from / ICONS_PER_ROW)) * 100);

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
   */
  tap: function pg_tap(elem) {
    if (Homescreen.isInEditMode()) {
      if (elem.classList.contains('options')) {
        var icon = GridManager.getIcon(elem.parentNode.dataset);
        if (icon.app)
          Homescreen.showAppDialog(icon.app);
      }
    } else if ('isIcon' in elem.dataset &&
               !this.olist.getAttribute('disabled')) {
      var icon = GridManager.getIcon(elem.dataset);
      if (!icon.app)
        return;

      if (icon.descriptor.entry_point) {
        icon.app.launch(icon.descriptor.entry_point);
        this.disableTap();
        return;
      }

      if (icon.cancelled) {
        GridManager.showRestartDownloadDialog(icon);
        return;
      }
      icon.app.launch();
      this.disableTap();
    }
  },

  /*
   * Disables the tap event for the page
   *
   * @param{Integer} milliseconds
   */
  disableTap: function pg_disableTap(icon, time) {
    var olist = this.olist;
    olist.setAttribute('disabled', true);
    setTimeout(function disableTapTimeout() {
      olist.removeAttribute('disabled');
    }, time || this.DISABLE_TAP_EVENT_DELAY);
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
   * Appends an icon to the end of the page
   *
   * @param{Object} moz app or icon object
   */
  appendIcon: function pg_appendIcon(icon) {
    if (!icon.container) {
      icon.render(this.olist, this.container);
      return;
    }
    this.olist.appendChild(icon.container);
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
      return icon.descriptor;
    });
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

const TextOverflowDetective = (function() {

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
