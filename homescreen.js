/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function createPhysicsFor(iconGrid) {
  return new DefaultPhysics(iconGrid);
}

function DefaultPhysics(iconGrid) {
  this.iconGrid = iconGrid;
  this.moved = false;
  this.touchState = { active: false, startX: 0, startY: 0 };
}

DefaultPhysics.prototype = {
  onTouchStart: function(e) {
    var touchState = this.touchState;
    this.moved = false;
    touchState.active = true;
    touchState.startX = e.pageX;
    touchState.startY = e.pageY;
    touchState.startTime = e.timeStamp;
  },
  onTouchMove: function(e) {
    var iconGrid = this.iconGrid;
    var touchState = this.touchState;
    if (touchState.active) {
      var dx = touchState.startX - e.pageX;
      if (dx !== 0) {
        iconGrid.sceneGraph.setViewportTopLeft(
          iconGrid.currentPage * iconGrid.containerWidth + dx, 0, 0);
        this.moved = true;
      }
    }
  },
  onTouchEnd: function(e) {
    var touchState = this.touchState;
    if (!touchState.active)
      return;
    touchState.active = false;

    var startX = touchState.startX;
    var endX = e.pageX;
    var diffX = endX - startX;
    var dir = (diffX > 0) ? -1 : 1;

    var quick = (e.timeStamp - touchState.startTime < 200);
    var small = Math.abs(diffX) < 10;

    var flick = quick && !small;
    var tap = !this.moved && small;
    var drag = !quick;

    var iconGrid = this.iconGrid;
    var currentPage = iconGrid.currentPage
    if (tap) {
      iconGrid.tap(currentPage * iconGrid.containerWidth + startX,
                   touchState.startY);
    } else if (flick) {
      iconGrid.setPage(currentPage + dir, 200);
    } else {
      if (Math.abs(diffX) < this.containerWidth/2)
        iconGrid.setPage(currentPage, 200);
      else
        iconGrid.setPage(currentPage + dir, 200);
    }
  }
};

function Icon(iconGrid, index) {
  this.iconGrid = iconGrid;
  this.index = index;
  this.label = '';
  this.url = '';
}

Icon.prototype = {
update: function(img, label, url) {
    this.label = label;
    this.url = url;
    var iconGrid = this.iconGrid;
    var iconWidth = iconGrid.iconWidth;
    var iconHeight = iconGrid.iconHeight;
    var border = iconGrid.border;
    var sprite = this.sprite;
    var createSprite = !sprite;
    if (createSprite) {
      var sceneGraph = iconGrid.sceneGraph;
      sprite = new Sprite(iconWidth, iconHeight);
      sprite.icon = this;
      this.sprite = sprite;
    }
    var ctx = sprite.getContext2D();
    ctx.drawImage(img, iconWidth * border, iconHeight * border,
                  iconWidth * (1 - border * 2),
                  iconHeight * (1 - border * 2));
    ctx.font = Math.floor(iconHeight * border * 0.6) + "pt Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.textBaseline = "top";
    ctx.fillText(label, iconWidth/2, iconHeight - iconHeight*border, iconWidth*0.9);
    if (createSprite)
      sceneGraph.add(sprite);
    this.reflow();
  },
  // return the X coordinate of the top left corner of a slot
  slotLeft: function() {
    var iconGrid = this.iconGrid;
    return iconGrid.itemBoxWidth * (this.index % iconGrid.columns);
  },
  // return the Y coordinate of the top left corner of a slot
  slotTop: function() {
    var iconGrid = this.iconGrid;
    var slot = this.index % iconGrid.itemsPerPage;
    return Math.floor(slot / iconGrid.columns) * iconGrid.itemBoxHeight;
  },
  reflow: function(duration) {
    var sprite = this.sprite;
    if (!sprite)
      return;
    var iconGrid = this.iconGrid;
    var index = this.index;
    var itemsPerPage = iconGrid.itemsPerPage;
    var page = Math.floor(index / iconGrid.itemsPerPage);
    sprite.setPosition(page * iconGrid.containerWidth + this.slotLeft(),
                       this.slotTop(),
                       duration);
    sprite.setScale(1, duration);
  }
}

function IconGrid(canvas, background, iconWidth, iconHeight, border) {
  canvas.mozOpaque = true;

  this.iconWidth = iconWidth;
  this.iconHeight = iconHeight;
  this.sceneGraph = new SceneGraph(canvas);
  this.border = border || 0.1;
  this.icons = [];
  this.currentPage = 0;
  this.physics = createPhysicsFor(this);

  // add the background image
//  this.sceneGraph.setBackground('images/background.png');

  // update the layout state
  this.reflow(canvas.width, canvas.height, 0);

  // install event handlers
  document.addEventListener("touchstart", this, true);
  document.addEventListener("mousedown", this, true);
  document.addEventListener("touchmove", this, true);
  document.addEventListener("mousemove", this, true);
  document.addEventListener("touchend", this, true);
  document.addEventListener("mouseup", this, true);
}

IconGrid.prototype = {
  add: function(src, label, url) {
    // Create the icon in the icon grid
    var icons = this.icons;
    var icon = new Icon(this, this.icons.length);
    icon.index = icons.length;
    icons.push(icon);
    // Load the image, sprite will be created when image load is complete
    var img = new Image();
    img.src = src;
    img.label = label;
    img.url = url;
    img.icon = icon;
    img.onload = function() {
      // Update the icon (this will trigger a reflow and a repaint)
      var icon = this.icon;
      icon.update(this, this.label, this.url);
    }
    return icon;
  },
  remove: function(icon) {
    this.icons.splice(icon.index);
    if (icon.sprite)
      sceneGraph.remove(icon.sprite);
  },
  // reflow the icon grid
  reflow: function(width, height, duration) {
    // first recalculate all the layout information
    this.containerWidth = width;
    this.containerHeight = height;
    this.panelWidth = this.containerWidth;
    this.pageIndicatorWidth = this.containerWidth;
    this.pageIndicatorHeight = Math.min(Math.max(this.containerHeight * 0.7, 14), 20);
    this.panelHeight = this.containerHeight - this.pageIndicatorHeight;
    this.columns = Math.floor(this.panelWidth / this.iconWidth);
    this.rows = Math.floor(this.panelHeight / this.iconHeight);
    this.itemsPerPage = this.rows * this.columns;
    this.itemBoxWidth = Math.floor(this.panelWidth / this.columns);
    this.itemBoxHeight = Math.floor(this.panelHeight / this.rows);

    // switch to the right page
    this.setPage(this.currentPage, duration);

    // now reflow all the icons
    var icons = this.icons;
    for (var n = 0; n < icons.length; ++n)
      icons[n].reflow(duration);
  },
  // get last page with an icon
  getLastPage: function() {
    var itemsPerPage = this.itemsPerPage;
    var lastPage = Math.floor((this.icons.length + (itemsPerPage - 1)) / itemsPerPage);
    if (lastPage > 0)
      --lastPage;
    return lastPage;
  },
  // switch to a different page
  setPage: function(page, duration) {
    page = Math.max(0, page);
    page = Math.min(page, this.getLastPage());
    this.sceneGraph.setViewportTopLeft(this.containerWidth * page, 0, duration);
    this.currentPage = page;
  },
  // process a computed tap at the given scene-graph coordinates
  tap: function(x, y) {
    this.sceneGraph.forHit(
      x, y,
      function(sprite) { openApplication(sprite.icon.url); });
  },
  handleEvent: function(e) {
    var physics = this.physics;
    switch (e.type) {
    case 'touchstart':
    case 'mousedown':
      physics.onTouchStart(e.touches ? e.touches[0] : e);
      break;
    case 'touchmove':
    case 'mousemove':
      physics.onTouchMove(e.touches ? e.touches[0] : e);
      break;
    case 'touchend':
    case 'mouseup':
      physics.onTouchEnd(e.touches ? e.touches[0] : e);
      break;
    }
  }
}

function OnLoad() {
  var fruits = [
    { label: 'Phone', src: 'images/Phone.png',
      url: 'dialer/dialer.html' },
    { label: 'Messages', src: 'images/Messages.png',
      url: 'data:text/html,<font color="blue">Hello' },
    { label: 'Calendar', src: 'images/Calendar.png',
      url: 'data:text/html,<font color="blue">Hello' },
    { label: 'Gallery', src: 'images/Gallery.png',
      url: 'data:text/html,<font color="blue">Hello' },
    { label: 'Camera', src: 'images/Camera.png',
      url: 'data:text/html,<font color="blue">Hello' },
    { label: 'Maps', src: 'images/Maps.png',
      url: 'data:text/html,<font color="blue">Hello' },
    { label: 'YouTube', src: 'images/YouTube.png',
      url: 'data:text/html,<font color="blue">Hello' },
    { label: 'Calculator', src: 'images/Calculator.png',
      url: 'data:text/html,<font color="blue">Hello' },
    { label: 'Books', src: 'images/Books.png',
      url: 'data:text/html,<font color="blue">Hello' },
    { label: 'Browser', src: 'images/Browser.png',
      url: 'data:text/html,<font color="blue">Hello' },
    { label: 'Music', src: 'images/Music.png',
      url: 'data:text/html,<font color="blue">Hello' }
  ];

  var icons = [];
  for (var n = 0; n < fruits.length; ++n)
    icons.push(fruits[n]);
  for (var n = 0; n < fruits.length; ++n)
    icons.push(fruits[n]);
  for (var n = 0; n < fruits.length; ++n)
    icons.push(fruits[n]);
  for (var n = 0; n < fruits.length; ++n)
    icons.push(fruits[n]);

  var iconGrid = new IconGrid(document.getElementById("homeCanvas"),
                              "images/background.png",
                              120, 120, 0.2);
  for (var n = 0; n < icons.length; ++n)
    iconGrid.add(icons[n].src, icons[n].label, icons[n].url);

  window.setInterval(updateClock, 60000);
  updateClock();

  document.getElementById('statusPadding').innerHTML =
    kUseGL ? '(WebGL)' : '(2D canvas)';
}

// open the application referred to by |url| into a new window, or
// bring its window to front if already open.
function openApplication(url) {
  // TODO
  //var existingWindow = document.querySelector('#windows > ...');

  var newWindow = document.createElement('iframe');
  newWindow.className = 'appWindow';
  newWindow.style.display = 'none';
  // XXX need to decide whether to try to load this during animation
  newWindow.src = url;

  var windows = document.getElementById('windows');
  windows.appendChild(newWindow);

  var loadScreen = document.getElementById('loadAnimationScreen');
  loadScreen.className = 'animateOpening';
  loadScreen.style.display = 'block';

  window.addEventListener(
    'animationend',
    function listener() {
      loadScreen.style.display = 'none';
      newWindow.style.display = 'block';
      window.removeEventListener('animationend', listener, false);
    },
    false);
}

function updateClock() {
  var now = new Date();
  var str = now.getHours();
  str += ':';
  var mins = now.getMinutes();
  if (mins < 10) str += "0";
  str += mins;
  document.getElementById('statusClock').innerHTML = str;
}
