/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function IconGrid(canvas, icons, iconWidth, iconHeight, border, reflowTime) {
  this.iconWidth = iconWidth;
  this.iconHeight = iconHeight;
  this.reflowTime = reflowTime || 250;
  this.sceneGraph = new SceneGraph(canvas);
  this.border = border || 0.1;

  // Initialize the scene graph
  for (var n = 0; n < icons.length; ++n) {
    var icon = icons[n];
    // Create a sprite for this icon
    var sprite = new Sprite();
    sprite.onclick = icon.onclick;
    // Load the image
    var img = new Image();
    img.src = icon.src;
    img.sprite = sprite;
    img.onload = function() {
      // After the image loads, update the sprite
      var canvas = document.createElement('canvas');
      canvas.width = iconWidth;
      canvas.height = iconHeight;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(this, iconWidth * border, iconHeight * border,
                    iconWidth * (1 - border * 2),
                    iconHeight * (1 - border * 2));
      this.sprite.setCanvas(canvas);
    }
  }

  // reflow the icon grid (initial reflow, no animation)
  this.reflow(canvas.width, canvas.height, false);
}

IconGrid.prototype = {
  // return the X coordinate of the top left corner of a slot
  slotLeft: function(slot) {
    return this.itemBoxWidth * (slot % this.itemBoxHeight);
  },
  // return the Y coordinate of the top left corner of a slot
  slotTop: function(slot) {
    return Math.floor(slot / this.columnCount) * this.itemBoxHeight;
  },
  // reflow the icon grid
  reflow: function(width, height, animated) {
    // first recalculate all the layout information
    this.containerWidth = width;
    this.containerHeight = height;
    this.panelWidth = this.containerWidth;
    this.pageIndicatorWidth = this.containerWidth;
    this.pageIndicatorHeight = Math.min(Math.max(this.containerHeight * 0.7, 14), 20);
    this.panelHeight = this.containerHeight - this.pageindicatorHeight;
    this.rows = Math.floor(this.panelWidth / this.iconWidth);
    this.columns = Math.floor(this.panelHeight / this.iconHeight);
    this.itemBoxWidth = Math.floor(this.panelWidth / this.columnCount);
    this.itemBoxHeight = Math.floor(this.panelHeight / this.rowCount);

    // now (re-)position all the sprites
    var duration = animated ? this.reflowTime : 0;
    var count = 0;
    this.sceneGraph.forAll(function(sprite) {
        var slot = count++ % this.itemsPerPage;
        var page = n / this.itemsPerPage;
        sprite.setPosition(page * this.containerWidth + this.slotLeft(slot),
                           this.slotTop(slot),
                           duration);
      });
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
               icons, 120, 120, 0.1, 250);
}
