/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function Icon(iconGrid, index) {
  this.iconGrid = iconGrid;
  this.index = index;
}

Icon.prototype = {
  update: function(img, label) {
    var iconGrid = this.iconGrid;
    var iconWidth = iconGrid.iconWidth;
    var iconHeight = iconGrid.iconHeight;
    var border = iconGrid.border;
    var sprite = this.sprite;
    var createSprite = !sprite;
    if (createSprite) {
      var sceneGraph = iconGrid.sceneGraph;
      sprite = new Sprite(iconWidth, iconHeight);
      this.sprite = sprite;
    }
    var ctx = sprite.getContext2D();
    ctx.drawImage(img, iconWidth * border, iconHeight * border,
                  iconWidth * (1 - border * 2),
                  iconHeight * (1 - border * 2));
    ctx.font = Math.floor(iconHeight * border * 0.6) + "pt Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "black";
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
  this.touchState = { active: false, startX: 0, startY: 0 };
  this.currentPage = 0;

  // add the background image
  

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
  add: function(src, label) {
    // Create the icon in the icon grid
    var icons = this.icons;
    var icon = new Icon(this, this.icons.length);
    icon.index = icons.length;
    icons.push(icon);
    // Load the image, sprite will be created when image load is complete
    var img = new Image();
    img.src = src;
    img.label = label;
    img.icon = icon;
    img.onload = function() {
      // Update the icon (this will trigger a reflow and a repaint)
      var icon = this.icon;
      icon.update(this, this.label);
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
    this.sceneGraph.setViewport(this.containerWidth * page, 0, duration);
    this.currentPage = page;
  },
  handleEvent: function(e) {
    switch (e.type) {
    case 'touchstart':
    case 'mousedown':
      this.onTouchStart(e.touches ? e.touches[0] : e);
      break;
    case 'touchmove':
    case 'mousemove':
      this.onTouchMove(e.touches ? e.touches[0] : e);
      break;
    case 'touchend':
    case 'mouseup':
      this.onTouchEnd(e.touches ? e.touches[0] : e);
      break;
    }
  },
  onTouchStart: function(e) {
    var touchState = this.touchState;
    touchState.active = true;
    touchState.startX = e.pageX;
    touchState.startY = e.pageY;
    touchState.startTime = e.timeStamp;
  },
  onTouchMove: function(e) {
    var touchState = this.touchState;
    if (touchState.active) {
      this.sceneGraph.setViewport(this.currentPage * this.containerWidth +
                                  touchState.startX - e.pageX, 0, 100);
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
    var tap = small;
    var drag = !quick;

    if (tap) {
      console.log("tap");
    } else if (flick) {
      this.setPage(this.currentPage + dir, 200);
    } else {
      if (Math.abs(diffX) < this.containerWidth/2)
        this.setPage(this.currentPage, 200);
      else
        this.setPage(this.currentPage + dir, 200);
    }
  }
}

function OnLoad() {
  var fruits = [
               { label: 'Phone', src: 'images/Phone.png' },
               { label: 'Messages', src: 'images/Messages.png' },
               { label: 'Calendar', src: 'images/Calendar.png' },
               { label: 'Gallery', src: 'images/Gallery.png' },
               { label: 'Camera', src: 'images/Camera.png' },
               { label: 'Maps', src: 'images/Maps.png' },
               { label: 'YouTube', src: 'images/YouTube.png' },
               { label: 'Calculator', src: 'images/Calculator.png' },
               { label: 'Books', src: 'images/Books.png' },
               { label: 'Browser', src: 'images/Browser.png' },
               { label: 'Music', src: 'images/Music.png' }
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

  var iconGrid = new IconGrid(document.getElementById("screen"),
                              "images/background.png",
                              120, 120, 0.2);
  for (var n = 0; n < icons.length; ++n)
    iconGrid.add(icons[n].src, icons[n].label);
}
