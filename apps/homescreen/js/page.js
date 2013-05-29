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

Icon.prototype = {
  MIN_ICON_SIZE: 52,
  MAX_ICON_SIZE: 60,

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

  /*
   * Renders the icon into the page
   *
   * @param{Object} where the icon should be rendered
   *
   * @param{Object} where the draggable element should be appened
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
    img.width = 64;
    img.height = 64;
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
    canvas.width = 64;
    canvas.height = 64;
    var ctx = canvas.getContext('2d');

    // Draw the background
    var background = new Image();
    background.src = 'style/images/default_background.png';
    background.onload = function icon_loadBackgroundSuccess() {
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetY = 2;
      ctx.drawImage(background, 2, 2);
      // Disable smoothing on icon resize
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.mozImageSmoothingEnabled = false;
      ctx.drawImage(img, 16, 16, 32, 32);
      canvas.toBlob(self.renderBlob.bind(self));
    };
  },

  renderImage: function icon_renderImage(img) {
    if (this.app && this.app.iconable) {
      this.renderImageForBookMark(img);
      return;
    }

    var canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;

    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetY = 2;

    // Deal with very small or very large icons
    img.width =
        Math.min(this.MAX_ICON_SIZE, Math.max(img.width, this.MIN_ICON_SIZE));
    img.height =
        Math.min(this.MAX_ICON_SIZE, Math.max(img.height, this.MIN_ICON_SIZE));

    var width = Math.min(img.width, canvas.width - 4);
    var height = Math.min(img.width, canvas.height - 4);
    ctx.drawImage(img,
                  (canvas.width - width) / 2,
                  (canvas.height - height) / 2,
                  width, height);
    ctx.fill();

    canvas.toBlob(this.renderBlob.bind(this));
  },

  renderBlob: function icon_renderBlob(blob) {
    this.descriptor.renderedIcon = blob;
    GridManager.markDirtyState();
    this.displayRenderedIcon();
  },

  displayRenderedIcon: function icon_displayRenderedIcon(img, skipRevoke) {
    img = img || this.img;
    var url = window.URL.createObjectURL(this.descriptor.renderedIcon);
    img.src = url;
    var self = this;
    img.onload = img.onerror = function cleanup() {
      img.style.visibility = 'visible';
      if (!skipRevoke)
        window.URL.revokeObjectURL(url);
      if (self.needsShow)
        self.show();
    };
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
    var skipRevoke = true;
    this.displayRenderedIcon(this.img, skipRevoke);

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
   * This method is invoked when the draggable elem is moving
   *
   * @param{int} x-coordinate
   *
   * @param{int} y-coordinate
   */
  onDragMove: function icon_onDragMove(x, y) {
    this.draggableElem.style.MozTransform =
      'translate(' + (x - this.initX) + 'px,' + (y - this.initY) + 'px)';
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
}

Page.prototype = {

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
    if (value && this.onReArranged) {
      this.onReArranged();
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
    if (originIcon === targetIcon) {
      return;
    }

    this.setReady(false);

    if (originIcon && targetIcon && this.olist.children.length > 1) {
      this.animate(this.olist.children, originIcon.container,
                   targetIcon.container);
    } else {
      setTimeout(this.setReady.bind(this, true));
    }
  },

  animate: function pg_anim(children, originNode, targetNode) {
    var beforeNode = targetNode;
    var initialIndex = children.indexOf(originNode);
    var endIndex = children.indexOf(targetNode);

    if (initialIndex === -1 || endIndex === -1) {
      // Index is outside the bounds of the array
      setTimeout(this.setReady.bind(this, true));
      return;
    }

    var upward = initialIndex < endIndex;
    if (upward) {
      beforeNode = targetNode.nextSibling;
      initialIndex++;
    } else {
      // this exchanges initialIndex and endIndex
      initialIndex = initialIndex + endIndex;
      endIndex = initialIndex - endIndex;
      initialIndex = initialIndex - endIndex;
      endIndex--;
    }

    // keep the elements that we animate because "children" is a live NodeList
    var slice = Array.prototype.slice;
    var animatedChildren = slice.call(children, initialIndex, endIndex + 1);

    var self = this;
    this.setAnimation(animatedChildren, initialIndex, upward);

    var lastNode = animatedChildren[animatedChildren.length - 1];
    lastNode.addEventListener('animationend', function animationEnd(e) {
      animatedChildren.forEach(function(iconContainer) {
        iconContainer.style.MozAnimationName = '';
      });
      self.olist.insertBefore(originNode, beforeNode);
      var lastNode = e.target;
      lastNode.removeEventListener('animationend', animationEnd);
      self.setReady(true);
    });
  },

  setAnimation: function pg_setAnimation(elts, init, upward) {
    elts.forEach(function(elt, i) {
      i += init;
      elt.style.MozAnimationName = upward ?
        (i % 4 === 0 ? 'jumpPrevRow' : 'jumpPrevCell') :
        (i % 4 === 3 ? 'jumpNextRow' : 'jumpNextCell');
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
    } else if ('isIcon' in elem.dataset) {
      var icon = GridManager.getIcon(elem.dataset);
      if (!icon.app)
        return;

      if (icon.descriptor.entry_point) {
        icon.app.launch(icon.descriptor.entry_point);
        return;
      }

      if (icon.cancelled) {
        GridManager.showRestartDownloadDialog(icon);
        return;
      }
      icon.app.launch();
    }
  },

  /*
   * Adds an icon to the begining of the page
   *
   * @param{Object} icon object
   */
  prependIcon: function pg_prependIcon(icon) {
    this.setReady(false);
    var olist = this.olist;
    if (olist.children.length > 0) {
      olist.insertBefore(icon.container, olist.firstChild);
    } else {
      olist.appendChild(icon.container);
    }
    this.setReady(true);
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
    this.setReady(false);
    var olist = this.olist;
    if (olist.children.length > 0) {
      olist.insertBefore(icon.container, olist.lastChild);
    }
    this.setReady(true);
  },

  /*
   * Returns the last icon of the page
   */
  getLastIcon: function pg_getLastIcon() {
    var lastIcon = this.olist.lastChild;
    if (!lastIcon)
      return null;
    return GridManager.getIcon(lastIcon.dataset);
  },

  /*
   * Returns the first icon of the page
   */
  getFirstIcon: function pg_getFirstIcon() {
    var firstIcon = this.olist.firstChild;
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
    this.setReady(false);
    this.olist.appendChild(icon.container);
    this.setReady(true);
  },

  /**
   * Appends an icon to the end of the page
   * If the page is already full, then we insert the icon at the last place, and
   * the icon that was at the last place and will be hidden will eventually flow
   * to the next page. This is done in GridManager's ensurePagesOverflow
   *
   * @param{Object} icon the icon to be added.
   */
  appendIconVisible: function pg_appendIconVisible(icon) {
    if (this.getNumIcons() >= GridManager.pageHelper.maxIconsPerPage) {
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


dockProto.setAnimation = function dk_setAnimation(elts, init, upward) {
  var animation = upward ? 'jumpPrevCell' : 'jumpNextCell';
  elts.forEach(function(elt) {
    elt.style.MozAnimationName = animation;
  });
};

dockProto.getLeft = function dk_getLeft() {
  return this.olist.getBoundingClientRect().left;
};

dockProto.getRight = function dk_getRight() {
  return this.getLeft() + this.getWidth();
};

dockProto.getWidth = function dk_getWidth() {
  return this.olist.clientWidth;
};

dockProto.getChildren = function dk_getChildren() {
  return this.olist.children;
};

HTMLCollection.prototype.indexOf = Array.prototype.indexOf;

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
