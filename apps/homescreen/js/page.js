
'use strict';

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
    this.dragabbleSection = page.parentNode;

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
      img.src =
          'http://' + document.location.host + '/resources/images/Unknown.png';
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
    this.initXCenter = this.targetXCenter = (rectangle.left + rectangle.right) / 2;
    this.initYCenter = this.targetYCenter = (rectangle.top + rectangle.bottom) / 2;

    this.dragabbleSection.appendChild(draggableElem);
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
    var draggableElem = this.draggableElem;
    draggableElem.style.MozTransition = '-moz-transform .4s';
    draggableElem.style.MozTransform =
        'translate(' + (this.targetXCenter - this.initXCenter) + 'px,' +
        (this.targetYCenter - this.initYCenter) + 'px)';
    draggableElem.querySelector('div').style.MozTransform = 'scale(1)';

    var that = this;
    draggableElem.addEventListener('transitionend', function ft(e) {
      this.removeEventListener('transitionend', ft);
      delete that.container.dataset.dragging;
      that.dragabbleSection.removeChild(this);
      callback();
    });
  },

  setTargetNode: function icon_setTargetNode(tnode) {
    var targetRect = tnode.getBoundingClientRect();
    this.targetXCenter = (targetRect.left + targetRect.right) / 2;
    this.targetYCenter = (targetRect.top + targetRect.bottom) / 2;
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
var Page = function() {
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
  render: function(apps, target) {
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
   * Sets the duration of the translations
   *
   * @param{Object} style object for a DOM element
   *
   * @param{int} the duration in milliseconds
   */
  setTranstionDuration: function(style, duration) {
    style.MozTransition = duration ? ('all ' + duration + 's ease') : '';
  },

  /*
   * Duration of the transition defined in seconds
   */
  transitionDuration: 0.2,

  /*
   * Moves the page to the end of the screen
   */
  moveToEnd: function() {
    var style = this.container.style;
    style.MozTransform = GridManager.dirCtrl.translateNext;
    this.setTranstionDuration(style, this.transitionDuration);
  },

  /*
   * Moves the page to the beginning of the screen
   */
  moveToBegin: function() {
    var style = this.container.style;
    style.MozTransform = GridManager.dirCtrl.translatePrev;
    this.setTranstionDuration(style, this.transitionDuration);
  },

  /*
   * Moves the page to the center of the screen
   */
  moveToCenter: function(onTransitionEnd) {
    var cont = this.container;
    var style = cont.style;
    style.MozTransform = 'translateX(0)';
    this.setTranstionDuration(style, this.transitionDuration);
    if (onTransitionEnd) {
      cont.addEventListener('transitionend', function ft(e) {
        onTransitionEnd();
        cont.removeEventListener('transitionend', ft);
      });
    }
  },

  /*
   * Applies a translation to the page
   *
   * @param{String} the app origin
   */
  moveTo: function(translate) {
    var style = this.container.style;
    style.MozTransform = 'translateX(-moz-calc(' + translate + '))';
    this.setTranstionDuration(style, 0);
  },

  applyInstallingEffect: function(origin) {
    this.icons[origin].show();
  },

  /*
   * Returns an icon given an origin
   *
   * @param{String} the app origin
   */
  getIcon: function(origin) {
    return this.icons[origin];
  },

  freeze: false,

  jumpNode: function(node, animation, onode, tnode, upward) {
    var that = this;
    node.style.MozAnimationName = animation;
    node.addEventListener('animationend', function ft(e) {
      this.style.MozAnimationName = '';
      this.removeEventListener('animationend', ft);
      if (this === tnode) {
        that.olist.insertBefore(onode, (upward) ? tnode : tnode.nextSibling);
        that.freeze = false;
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
  drop: function(origin, target) {
    if (!this.freeze && origin !== target) {
      this.freeze = true;

      var icons = this.icons;
      var oIcon = icons[origin];
      var onode = oIcon.container;
      var tnode = icons[target].container;
      oIcon.setTargetNode(tnode);

      var childNodes = this.olist.childNodes;
      var indexOf = Array.prototype.indexOf;
      var oIndex = indexOf.call(childNodes, onode);
      var tIndex = indexOf.call(childNodes, tnode);

      if (oIndex < tIndex) {
        for (var i = oIndex + 1; i <= tIndex; i++) {
          var animation = 'jumpPrevCell';
          if (i % 4 === 0) {
            animation = 'jumpPrevRow';
          }
          this.jumpNode(childNodes[i], animation, onode, tnode, false);
        }
      } else {
        for (var i = oIndex - 1; i >= tIndex; i--) {
          var animation = 'jumpNextCell';
          if (i % 4 === 3) {
            animation = 'jumpNextRow';
          }
          this.jumpNode(childNodes[i], animation, onode, tnode, true);
        }
      }
    }
  },

  /*
   * Implements the tap behaviour
   *
   * @param{Object} DOM element
   */
  tap: function(elem) {
    if (GridManager.isEditMode()) {
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
  prependIcon: function(icon) {
    var olist = this.olist;
    if (olist.childNodes.length > 0) {
      olist.insertBefore(icon.container, this.olist.firstChild);
    } else {
      olist.appendChild(icon.container);
    }
    this.icons[icon.descriptor.origin] = icon;
  },

  /*
   * Moves an icon to the first position
   *
   * @param{Object} icon object
   */
  moveIconToFirstChild: function(icon) {
    var olist = this.olist;
    if (olist.childNodes.length > 0) {
      olist.insertBefore(icon.container, olist.firstChild);
    }
  },

  /*
   * Removes the last icon of the page and returns it
   */
  popIcon: function() {
    var icon = this.getLastIcon();
    this.remove(icon);
    return icon;
  },

  /*
   * Returns the last icon of the page
   */
  getLastIcon: function() {
    return this.icons[this.olist.lastChild.dataset.origin];
  },

  /*
   * Appends an icon to the end of the page
   *
   * @param{Object} moz app or icon object
   */
  append: function(app) {
    if (app.type && app.type === 'ApplicationIcon') {
      this.olist.appendChild(app.container);
      this.icons[app.descriptor.origin] = app;
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
  remove: function(app) {
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
  destroy: function() {
    delete this.icons;
    this.container.parentNode.removeChild(this.container);
  },

  /*
   * Returns the number of apps
   */
  getNumApps: function() {
    return this.olist.childNodes.length;
  },

  /*
   * Translates the label of the icons
   */
  translate: function(lang) {
    var icons = this.icons;
    for (var origin in icons) {
      icons[origin].translate(lang);
    }
  },

  /*
   * Returns the list of apps
   */
  getAppsList: function() {
    var nodes = this.olist.childNodes;
    return Array.prototype.map.call(nodes, function extractOrigin(node) {
      return node.dataset.origin;
    });
  }
};
