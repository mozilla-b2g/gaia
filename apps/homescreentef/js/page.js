/*
 *  Module: Page and Icon modules
 *
 *  Product: Open Web Device
 *
 *  Copyright(c) 2012 Telef—nica I+D S.A.U.
 *
 *  LICENSE: Apache 2.0
 *
 *  @author Cristian Rodriguez
 *
 */

'use strict';
var owd = window.owd || {};

if (!owd.Icon) {

 /*
  * Icon constructor
  *
  * @param{Object} moz app object
  */
  owd.Icon = function(app) {
    var origin = owdAppManager.getOrigin(app);

    this.descriptor = {
      origin: origin,
      name: owdAppManager.getName(origin),
      icon: owdAppManager.getIcon(origin)
    };

    this.type = 'owd.Icon';
  };

  owd.Icon.prototype = {

   /*
    * Renders the icon into the page
    *
    * @param{Object} where the icon should be rendered
    *
    * @param{Object} where the draggable element should be appened
    */
    render: function(target, container) {
      /*
       * <li class="icon" dataset-origin="zzz">
       *   <div>
       *     <img src="the icon image path"></img>
       *     <span class="label">label</span>
       *   </div>
       *   <span class="options"></span>
       * </li>
       */
      this.dragabbleSection = container.parentNode;

      var listItem = this.listItem = document.createElement('li');
      listItem.className = 'icon';
      listItem.dataset.origin = this.descriptor.origin;

      // Icon container
      var icon = this.icon = document.createElement('div');

      // Image
      var img = document.createElement('img');
      img.src = this.descriptor.icon;
      icon.appendChild(img);

      img.onerror = function() {
        img.src = 'http://' + document.location.host + '/resources/images/Unknown.png';
      }

      // Label

      // wrapper of the label -> overflow text should be centered in draggable mode
      var wrapper = document.createElement('span');
      wrapper.className = 'labelWrapper';
      var label = this.label = document.createElement('span');
      label.textContent = this.descriptor.name;
      wrapper.appendChild(label);

      icon.appendChild(wrapper);

      listItem.appendChild(icon);

      // Menu button to delete the app
      var options = document.createElement('span');
      options.className = 'options';
      listItem.appendChild(options);

      target.appendChild(listItem);
    },

   /*
    * Returns the list item that contains to itself
    */
    getListItem: function() {
      return this.listItem;
    },

   /*
    * Translates the label of the icons
    */
    translate: function() {
      var desc = this.descriptor;
      this.label.textContent = desc.name = owdAppManager.getName(desc.origin);
    },

   /*
    * This method is invoked when the drag gesture starts
    *
    * @param{int} x-coordinate
    *
    * @param{int} y-coordinate
    */
    onDragStart: function(x, y) {
      this.initX = x;
      this.initY = y;

      var draggableElem = this.draggableElem = this.icon.cloneNode();
      draggableElem.className = 'draggable';

      var li = this.listItem;
      li.dataset.dragging = 'true';

      var rectangle = li.getBoundingClientRect();
      var style = draggableElem.style;
      style.left = rectangle.left + 'px';
      style.top = rectangle.top + 'px';

      this.dragabbleSection.appendChild(draggableElem);
    },

   /*
    * This method is invoked when the draggable elem is moving
    *
    * @param{int} x-coordinate
    *
    * @param{int} y-coordinate
    */
    onDragMove: function(x, y) {
      this.draggableElem.style.MozTransform = 'translate('
        + (x - this.initX) + 'px,'
        + (y - this.initY) + 'px)';
    },

   /*
    * This method is invoked when the drag gesture finishes
    */
    onDragStop: function() {
      delete this.listItem.dataset.dragging;
      this.dragabbleSection.removeChild(this.draggableElem);
    }

  };
}

if (!owd.Page) {

 /*
  * Page constructor
  */
  owd.Page = function() {
    this.licons = {};
  };

  owd.Page.prototype = {

    vars: {
      transitionend: 'transitionend',
      right: 'right',
      left: 'left',
      center: 'center'
    },

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
          app = owdAppManager.getByOrigin(app);
        }
        // We have to check if the app is installed just in case (DB could is corrupted)
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
    * Moves the page to the right of the screen
    */
    moveToRight: function() {
      var style = this.container.style;
      style.MozTransform = 'translateX(100%)';
      this.setTranstionDuration(style, this.transitionDuration);
    },

   /*
    * Moves the page to the left of the screen
    */
    moveToLeft: function() {
      var style = this.container.style;
      style.MozTransform = 'translateX(-100%)';
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

   /*
    * Returns an icon given an origin
    *
    * @param{String} the app origin
    */
    getIcon: function(origin) {
      return this.licons[origin];
    },

   /*
    * Changes position between two icons
    *
    * @param{String} origin icon
    *
    * @param{String} target icon
    *
    * @param{int} negative values indicate going upwards and positive
    *             values indicate going backwards
    */
    drop: function(origin, target, dir) {
      var licons = this.licons;
      var onode = licons[origin].getListItem();
      var tnode = licons[target].getListItem();
      if (dir > 0) {
        // upwards
        tnode = tnode.nextSibling;
      }
      this.olist.insertBefore(onode, tnode);
    },

   /*
    * Implements the tap behaviour
    *
    * @param{Object} DOM element
    */
    tap: function(elem) {
      if (owd.GridManager.isEditMode()) {
        if (elem.className === 'options') {
          // <li> parent element defines the origin
          owd.Homescreen.showContextualMenu(elem.parentNode.dataset.origin);
        }
      } else if (elem.className === 'icon') {
        owdAppManager.getByOrigin(elem.dataset.origin).launch();
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
        olist.insertBefore(icon.getListItem(), this.olist.firstChild);
      } else {
        olist.appendChild(icon.getListItem());
      }
      this.licons[icon.descriptor.origin] = icon;
    },

   /*
    * Moves an icon to the first position
    *
    * @param{Object} icon object
    */
    moveIconToFirstChild: function(icon) {
      var olist = this.olist;
      if (olist.childNodes.length > 0) {
        olist.insertBefore(icon.getListItem(), olist.firstChild);
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
      return this.licons[this.olist.lastChild.dataset.origin];
    },

   /*
    * Appends an icon to the end of the page
    *
    * @param{Object} moz app or icon object
    */
    append: function(app) {
      if (app.type && app.type === 'owd.Icon') {
        this.olist.appendChild(app.getListItem());
        this.licons[app.descriptor.origin] = app;
      } else {
        // This is a moz app
        var icon = new owd.Icon(app);
        icon.render(this.olist, this.container);
        this.licons[app.origin] = icon;
      }
    },

   /*
    * Removes an application or icon from the page
    *
    * @param{Object} moz app or icon object
    */
    remove: function(app) {
      var icon = app;
      if ('owd.Icon' !== app.type) {
        // This is a moz app
        icon = this.licons[app.origin];
      }
      this.olist.removeChild(icon.getListItem());
      delete this.licons[icon.descriptor.origin];
    },

   /*
    * Destroys the component page
    */
    destroy: function() {
      delete this.licons;
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
      var licons = this.licons;
      for (var origin in licons) {
        licons[origin].translate(lang);
      }
    },

   /*
    * Returns the list of apps
    */
    getAppsList: function() {
      var ret = [];
      var nodes = this.olist.childNodes;
      var len = nodes.length;
      for (var i = 0; i < len; i++) {
        ret.push(nodes[i].dataset.origin);
      }
      return ret;
    }
  };
}
