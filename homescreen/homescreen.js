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
    ctx.font = Math.floor(iconHeight * border * 0.7) + "pt Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "black";
    ctx.textBaseline = "top";
    ctx.fillText(label, iconWidth/2, iconHeight - iconHeight*border, iconWidth*0.9);

    if (createSprite) {
      sceneGraph.add(sprite);
    }
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
  reflow: function(animated) {
    var sprite = this.sprite;
    if (!sprite)
      return;
    var iconGrid = this.iconGrid;
    var duration = animated ? iconGrid.reflowTime : 0;
    var index = this.index;
    var itemsPerPage = iconGrid.itemsPerPage;
    var page = Math.floor(index / iconGrid.itemsPerPage);
    sprite.setPosition(page * iconGrid.containerWidth + this.slotLeft(),
                       this.slotTop(),
                       duration);
    sprite.setScale(1, duration);
  }
}

function IconGrid(canvas, iconWidth, iconHeight, border, reflowTime) {
  canvas.mozOpaque = true;

  this.iconWidth = iconWidth;
  this.iconHeight = iconHeight;
  this.reflowTime = reflowTime || 250;
  this.sceneGraph = new SceneGraph(canvas);
  this.border = border || 0.1;
  this.icons = [];

  // update the layout state
  this.reflow(canvas.width, canvas.height, false);

  // install event handlers
  canvas.addEventListener("touchstart", this, true);
  canvas.addEventListener("mousedown", this, true);
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
  reflow: function(width, height, animated) {
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

    // now reflow all the icons
    var icons = this.icons;
    for (var n = 0; n < icons.length; ++n)
      icons[n].reflow();
  },
  handleEvent: function(e) {
    switch (e.type) {
    case 'touchstart':
      if (e.touches.length == 1)
        this.onTouchStart(e.touches[0]);
      break;
    case 'mousedown':
      this.onTouchStart(e);
      break;
    }
  },
  onTouchStart: function(e) {
    this.sceneGraph.forHit(e.pageX, e.pageY, function(sprite) { console.log(sprite.label); });
  }
}

function OnLoad() {
  var fruits = [
               {
                 label: 'Strawberry',
                 src: 'images/strawberry.png'
               },
               {
                 label: 'Watermelon',
                 src: 'images/watermelon.png'
               },
               {
                 label: 'Apple',
                 src: 'images/apple.png'
               },
               {
                 label: 'Banana',
                 src: 'images/banana.png'
               },
               {
                 label: 'Grape',
                 src: 'images/grape.png'
               },
               {
                 label: 'Orange',
                 src: 'images/orange.png'
               },
               {
                 label: 'Papaya',
                 src: 'images/papaya.png'
               },
               {
                 label: 'Pineapple',
                 src: 'images/pineapple.png'
               }
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

  var iconGrid = new IconGrid(document.getElementById("screen"), 120, 120, 0.15, 500);
  for (var n = 0; n < icons.length; ++n)
    iconGrid.add(icons[n].src, icons[n].label);
}
