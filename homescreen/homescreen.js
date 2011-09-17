/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var icons = [
	     {
		 label: "Strawberry",
		 icon: "images/strawberry.png"
	     },
	     {
		 label: "Watermelon",
		 icon: "images/watermelon.png"
	     },
	     {
		 label: "Apple",
		 icon: "images/apple.png"
	     },
	     {
		 label: "Banana",
		 icon: "images/banana.png"
	     },
	     {
		 label: "Grape",
		 icon: "images/grape.png"
	     },
	     {
		 label: "Orange",
		 icon: "images/orange.png"
	     },
	     {
		 label: "Papaya",
		 icon: "images/papaya.png"
	     },
	     {
		 label: "Pineapple",
		 icon: "images/pineapple.png"
	     }
	    ];


function SceneGraph(canvas) {
    this.canvas = canvas;
}

function IconGrid(canvas, icons) {
    this.canvas = canvas;
    this.icons = icons;
}

IconGrid.prototype = {
    resize: function () {
	var canvas = this.canvas;

	this.containerWidth = canvas.width;
	this.containerHeight = canvas.height;
	this.panelWidth = this.containerWidth;
	this.pageIndicatorWidth = this.containerWidth;
	this.pageIndicatorHeight = Math.min(Math.max(this.containerHeight * 0.7, 14), 20);

	this.panelHeight = this.containerHeight - this.pageindicatorHeight;

	this.rows = rows;
	this.columns = columns;

	this.itemBoxWidth = Math.floor(this.panelWidth / this.columnCount);
	this.itemBoxHeight = Math.floor(this.panelHeight / this.rowCount);
    }
}
