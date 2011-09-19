/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function IconGrid(canvas, icons, iconWidth, iconHeight, border, reflowTime) {
  canvas.mozOpaque = true;

  this.iconWidth = iconWidth;
  this.iconHeight = iconHeight;
  this.reflowTime = reflowTime || 250;
  this.sceneGraph = new SceneGraph(canvas);
  this.border = border || 0.1;
  this.pendingIcons = [ ];
  this.numUnloadedPendingIcons = icons.length;

  // Initialize the scene graph
  for (var n = 0; n < icons.length; ++n) {
    var icon = icons[n];
    // Create a sprite for this icon
    var sprite = new Sprite(iconWidth, iconHeight);
    sprite.label = icon.label;
    this.pendingIcons.push(sprite);
    // Load the image
    var img = new Image();
    img.iconGrid = this;
    img.src = icon.src;
    img.sprite = sprite;
    img.onload = function() {
      var iconGrid = this.iconGrid;
      // After the image loads, update the sprite
      var sprite = this.sprite;
      var ctx = sprite.getContext2D();
      ctx.drawImage(this, iconWidth * border, iconHeight * border,
                    iconWidth * (1 - border * 2),
                    iconHeight * (1 - border * 2));
      ctx.font = Math.floor(iconHeight * border * 0.7) + "pt Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "black";
      ctx.textBaseline = "top";
      ctx.fillText(this.sprite.label, iconWidth/2, iconHeight - iconHeight*border, iconWidth*0.9);

      if (0 === --iconGrid.numUnloadedPendingIcons) {
        iconGrid.addPendingIcons();
      }
    }
  }

  // reflow the icon grid (initial reflow, no animation)
  this.reflow(canvas.width, canvas.height, false);

  // install event handlers
  canvas.addEventListener("touchstart", this, true);
  canvas.addEventListener("mousedown", this, true);
}

IconGrid.prototype = {
  addPendingIcons: function() {
    var newIcons = this.pendingIcons;
    var sceneGraph = this.sceneGraph;
    for (var i = 0; i < newIcons.length; ++i) {
      sceneGraph.add(newIcons[i]);
    }
    this.pendingIcons = [ ];

    this.reflow(this.containerWidth, this.containerHeight, true);
  },
  // return the X coordinate of the top left corner of a slot
  slotLeft: function(slot) {
    return this.itemBoxWidth * (slot % this.columns);
  },
  // return the Y coordinate of the top left corner of a slot
  slotTop: function(slot) {
    return Math.floor(slot / this.columns) * this.itemBoxHeight;
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

    // now (re-)position all the sprites
    var duration = animated ? this.reflowTime : 0;
    var count = 0;
    var self = this;
    this.sceneGraph.forAll(function(sprite) {
        var slot = count % self.itemsPerPage;
        var page = Math.floor(count / self.itemsPerPage);
        sprite.setPosition(page * self.containerWidth + self.slotLeft(slot),
                           self.slotTop(slot),
                           duration);
        sprite.setScale(1, duration);
        ++count;
      });
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
  var icons = [
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
  new IconGrid(document.getElementById("screen"),
               icons, 120, 120, 0.15, 500);
}
