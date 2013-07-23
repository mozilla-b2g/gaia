'use strict';

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

      // Temporary hack to show a smartfolder when we click on marketplace.
      if (icon.descriptor && icon.descriptor.name === 'Marketplace') {
        icon.descriptor.type = 'smartfolder';
        icon.descriptor.query = 'productivity';
      }

      if (icon.descriptor && icon.descriptor.type === 'smartfolder') {
        var folder = new SmartFolder(icon);
        folder.show(icon);
        return;
      }

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
