
'use strict';

var innerWidth = 320;

/*
 * Icon constructor
 *
 * @param{Object} moz app object
 */
var Icon = function Icon(app) {
  var origin = Applications.getOrigin(app);
  this.descriptor = {
    origin: origin,
    name: Applications.getName(origin),
    icon: Applications.getIcon(origin),
    isHidden: Applications.getManifest(origin).hidden
  };

  this.type = 'ApplicationIcon';
};

Icon.prototype = {
  /*
   * Renders the icon into the page
   *
   * @param{Object} where the icon should be rendered
   *
   * @param{Object} where the draggable element should be appened
   */
  render: function icon_render(target, page) {
    /*
     * <li class="icon" dataset-origin="zzz">
     *   <div>
     *     <img src="the icon image path"></img>
     *     <span class="label">label</span>
     *   </div>
     *   <span class="options"></span>
     * </li>
     */
    var container = this.container = document.createElement('li');
    container.className = 'icon';
    if (this.descriptor.isHidden) {
      container.dataset.hidden = true;
    }

    container.dataset.origin = this.descriptor.origin;

    // Icon container
    var icon = this.icon = document.createElement('div');

    // Image
    var img = document.createElement('img');
    img.src = this.descriptor.icon;
    icon.appendChild(img);

    img.onerror = function imgError() {
      img.src = '//' + window.location.host + '/resources/images/Unknown.png';
    }

    // Label

    // wrapper of the label -> overflow text should be centered
    // in draggable mode
    var wrapper = document.createElement('span');
    wrapper.className = 'labelWrapper';
    var label = this.label = document.createElement('span');
    label.textContent = this.descriptor.name;
    wrapper.appendChild(label);

    icon.appendChild(wrapper);

    container.appendChild(icon);

    if (!Applications.isCore(this.descriptor.origin)) {
      // Menu button to delete the app
      var options = document.createElement('span');
      options.className = 'options';
      options.dataset.origin = this.descriptor.origin;
      container.appendChild(options);
    }

    target.appendChild(container);
  },

  show: function icon_show() {
    var container = this.container;
    delete container.dataset.hidden;
    container.dataset.visible = true;
  },

  /*
   * Translates the label of the icon
   */
  translate: function icon_translate() {
    var desc = this.descriptor;
    this.label.textContent = desc.name = Applications.getName(desc.origin);
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

    draggableElem.appendChild(this.icon.cloneNode());

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
    var rect = this.container.getBoundingClientRect();
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

    var self = this;
    draggableElem.addEventListener('transitionend', function draggableEnd(e) {
      draggableElem.removeEventListener('transitionend', draggableEnd);
      delete self.container.dataset.dragging;
      document.body.removeChild(draggableElem);
      callback();
    });
  },

  getTop: function icon_getTop() {
    return this.container.getBoundingClientRect().top;
  },

  getOrigin: function icon_getOrigin() {
    return this.descriptor.origin;
  }
};

/*
 * Page constructor
 */
var Page = function(index) {
  this.index = index;
  this.icons = {};
};

Page.prototype = {

  /*
   * Renders a page for a list of apps
   *
   * @param{Array} list of apps
   *
   * @param{Object} target DOM element container
   */
  render: function pg_render(apps, target) {
    this.container = target;
    var len = apps.length;

    this.olist = document.createElement('ol');
    for (var i = 0; i < len; i++) {
      var app = apps[i];
      if (typeof app === 'string') {
        // We receive an origin here else it's an app or icon
        app = Applications.getByOrigin(app);
      }

      // We have to check if the app is installed just in case
      // (DB could be corrupted)
      if (app) {
        this.append(app);
      }
    }
    target.appendChild(this.olist);
  },

  /*
   * Applies a translation to the page
   *
   * @param{String} the app origin
   */
  moveBy: function pg_moveBy(deltaX, duration) {
    var style = this.container.style;
    style.MozTransform = 'translateX(-moz-calc(' +
                         (this.index * innerWidth) +
                         'px + ' + deltaX + 'px))';
    style.MozTransition = duration ? ('-moz-transform ' + duration + 's ease') : '';
  },

  applyInstallingEffect: function pg_applyInstallingEffect(origin) {
    this.icons[origin].show();
  },

  /*
   * Returns an icon given an origin
   *
   * @param{String} the app origin
   */
  getIcon: function pg_getIcon(origin) {
    return this.icons[origin];
  },

  ready: true,

  setReady: function pg_setReady(value) {
    this.ready = value;
    if (value && this.onReArranged) {
      this.onReArranged();
    }
  },

  jumpNode: function pg_jumpNode(node, animation, originNode,
                                 targetNode, upward) {
    var self = this;
    node.style.MozAnimationName = animation;
    node.addEventListener('animationend', function animationEnd(e) {
      node.removeEventListener('animationend', animationEnd);
      node.style.MozAnimationName = '';

      if (node === targetNode) {
        self.olist.insertBefore(originNode, upward ? targetNode :
                                                     targetNode.nextSibling);
        self.setReady(true);
      }
    });
  },

  /*
   * Changes position between two icons
   *
   * @param{String} origin icon
   *
   * @param{String} target icon
   */
  drop: function pg_drop(origin, target) {
    if (origin === target) {
      return;
    }

    this.setReady(false);

    var icons = this.icons;
    var originIcon = icons[origin];
    var targetIcon = icons[target];

    if (originIcon && targetIcon) {
      var originNode = originIcon.container;
      var targetNode = targetIcon.container;
      var children = this.olist.children;
      var indexOf = Array.prototype.indexOf;
      var oIndex = indexOf.call(children, originNode);
      var tIndex = indexOf.call(children, targetNode);

      this.animate(oIndex, tIndex, children, originNode, targetNode);
    } else {
      this.setReady(true);
    }
  },

  animate: function pg_anim(oIndex, tIndex, children, originNode, targetNode) {
    if (oIndex < tIndex) {
      for (var i = oIndex + 1; i <= tIndex; i++) {
        var animation = 'jumpPrevCell';
        if (i % 4 === 0) {
          animation = 'jumpPrevRow';
        }
        this.jumpNode(children[i], animation, originNode, targetNode, false);
      }
    } else {
      for (var i = oIndex - 1; i >= tIndex; i--) {
        var animation = 'jumpNextCell';
        if (i % 4 === 3) {
          animation = 'jumpNextRow';
        }
        this.jumpNode(children[i], animation, originNode, targetNode, true);
      }
    }
  },

  /*
   * Implements the tap behaviour
   *
   * @param{Object} DOM element
   */
  tap: function pg_tap(elem) {
    if (document.body.dataset.mode === 'edit') {
      if (elem.className === 'options') {
        Homescreen.showAppDialog(elem.dataset.origin);
      }
    } else if (elem.className === 'icon') {
      Applications.getByOrigin(elem.dataset.origin).launch();
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
    this.icons[icon.descriptor.origin] = icon;
  },

  /*
   * Removes the last icon of the page and returns it
   */
  popIcon: function pg_popIcon() {
    var icon = this.getLastIcon();
    this.remove(icon);
    return icon;
  },

  insertBefore: function pg_insertBefore(originIcon, targetIcon) {
    this.setReady(false);
    var olist = this.olist;
    if (this.icons[targetIcon.getOrigin()]) {
      olist.insertBefore(icon.container, olist.lastChild);
      this.icons[icon.getOrigin()] = icon;
    }
    this.setReady(true);
  },

  insertBeforeLastIcon: function pg_insertBeforeLastIcon(icon) {
    this.setReady(false);
    var olist = this.olist;
    if (olist.children.length > 0) {
      olist.insertBefore(icon.container, olist.lastChild);
      this.icons[icon.getOrigin()] = icon;
    }
    this.setReady(true);
  },

  /*
   * Returns the last icon of the page
   */
  getLastIcon: function pg_getLastIcon() {
    var lastIcon = this.olist.lastChild;
    if (lastIcon) {
      lastIcon = this.icons[lastIcon.dataset.origin];
    }
    return lastIcon;
  },

  /*
   * Appends an icon to the end of the page
   *
   * @param{Object} moz app or icon object
   */
  append: function pg_append(app) {
    if (app.type && app.type === 'ApplicationIcon') {
      this.setReady(false);
      this.olist.appendChild(app.container);
      this.icons[app.descriptor.origin] = app;
      this.setReady(true);
    } else {
      // This is a moz app
      var icon = new Icon(app);
      icon.render(this.olist, this.container);
      this.icons[Applications.getOrigin(app)] = icon;
    }
  },

  /*
   * Removes an application or icon from the page
   *
   * @param{Object} moz app or icon object
   */
  remove: function pg_remove(app) {
    var icon = app;
    if ('ApplicationIcon' !== app.type) {
      // This is a moz app
      icon = this.icons[Applications.getOrigin(app)];
    }
    this.olist.removeChild(icon.container);
    delete this.icons[icon.descriptor.origin];
  },

  /*
   * Destroys the component page
   */
  destroy: function pg_destroy() {
    delete this.icons;
    this.container.parentNode.removeChild(this.container);
  },

  /*
   * Returns the number of apps
   */
  getNumApps: function pg_getNumApps() {
    return this.olist.children.length;
  },

  /*
   * Translates the label of the icons
   */
  translate: function pg_translate(lang) {
    var icons = this.icons;
    for (var origin in icons) {
      icons[origin].translate(lang);
    }
  },

  /*
   * Returns the list of apps
   */
  getAppsList: function pg_getAppsList() {
    var nodes = this.olist.children;
    return Array.prototype.map.call(nodes, function extractOrigin(node) {
      return node.dataset.origin;
    });
  }
};

function extend(subClass, superClass) {
  var F = function() {};
  F.prototype = superClass.prototype;
  subClass.prototype = new F();
  subClass.prototype.constructor = subClass;
  subClass.uber = superClass.prototype;
}

var Dock = function createDock() {
  Page.call(this);
};

extend(Dock, Page);

Dock.prototype.animate = function dk_anim(oIndex, tIndex, children,
                                          originNode, targetNode) {
  if (oIndex < tIndex) {
    for (var i = oIndex + 1; i <= tIndex; i++) {
      this.jumpNode(children[i], 'jumpPrevCell', originNode, targetNode, false);
    }
  } else {
    for (var i = oIndex - 1; i >= tIndex; i--) {
      this.jumpNode(children[i], 'jumpNextCell', originNode, targetNode, true);
    }
  }
};
