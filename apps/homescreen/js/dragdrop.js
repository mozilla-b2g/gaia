/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

var editMode = false;
var currentTarget = null;

// XXX Should get out of editMode during a visibilityChange

(function dragdropHandler() {
  'use strict';

  var positions = {};

  var DragDropHandler = {
    onDragStart: function ddh_onDragStart(target) {
      var icons = document.getElementsByClassName('icon');
      for (var i = 0; i < icons.length; i++) {
        var icon = icons[i];
        var rect = icon.getBoundingClientRect();
        positions[icon.id] = rect;
      }

      var rect = positions[target.id];
      this.clone.style.position = 'absolute';
      this.clone.style.left = rect.left - 20 + 'px';
      this.clone.style.top = rect.top - 30 + 'px';
      this.clone.style.MozTransform = 'scale(1.1) translate(0px, 0px)';

      editMode = true;
      document.getElementById('apps').classList.add('edit');

      target.classList.add('float');
      document.body.appendChild(this.clone);
    },

    onDragMove: function ddh_onDragMove(target, deltaX, deltaY) {
      this.clone.style.MozTransform =
        'scale(1.1) translate(' + deltaX + 'px, ' + deltaY + 'px)';

      var overlapTarget = overlapIcon(this.clone);
      if (overlapTarget) {
        if (overlapTarget.previousSibling === target) {
          target.parentNode.insertBefore(target, overlapTarget.nextSibling);
        } else {
          target.parentNode.insertBefore(target, overlapTarget);
        }

        var icons = target.parentNode.getElementsByClassName('icon');
        for (var i = 0; i < icons.length; i++) {
          var icon = icons[i];
          var rect = icon.getBoundingClientRect();
          positions[icon.id] = rect;
        }
      }
    },

    onDragStop: function ddh_onDragStop(target) {
      target.classList.remove('float');
      document.body.removeChild(this.clone);
    },

    target: null,
    startX: 0,
    startY: 0,
    handleEvent: function ddh_handleEvent(e) {
      var target = e.target;

      switch (e.type) {
        case 'contextmenu':
          if (!('url' in target.dataset))
            return;

          this.target = target;
          this.clone = target.cloneNode(true);
          this.startX = e.pageX;
          this.startY = e.pageY;
          this.onDragStart(target);
          e.preventDefault();
          break;

        case 'mousemove':
          if (!this.target)
            return;

          this.onDragMove(this.target, e.pageX - this.startX, e.pageY - this.startY);
          e.preventDefault();
          e.stopPropagation();
          break;

        case 'mouseup':
          if (!this.target)
            return;

          this.onDragStop(this.target);
          this.target = null;
          break;

        case 'keyup':
          if (!editMode || e.keyCode != e.DOM_VK_HOME)
            return;

          document.getElementById('apps').classList.remove('edit');
          editMode = false;
          break;
      }
    }
  };

  window.addEventListener('contextmenu', DragDropHandler, true);
  window.addEventListener('mousedown', DragDropHandler);
  window.addEventListener('mousemove', DragDropHandler, true);
  window.addEventListener('mouseup', DragDropHandler);

  window.addEventListener('keyup', DragDropHandler);
  window.addEventListener('click', DragDropHandler, true);

  function overlap(r1, r2) {
    return (r1.left < r2.left + r2.width && r1.left + r1.width > r2.left &&
            r1.top < r2.top + r2.height && r1.top + r1.height > r2.top);
  }

  function intersection(r1, r2) {
    return Math.abs(Math.max(r1.left, r2.left) - Math.min(r1.left + r1.width, r2.left + r2.width)) * Math.abs(Math.max(r1.top, r2.top) - Math.min(r1.top + r1.height, r2.top + r2.height));
  }

  function overlapIcon(target, deltX, deltaY) {
    var overlappingTarget = null;
    var overlappingPercent = 0;

    var targetRect = target.getBoundingClientRect();

    var icons = document.getElementsByClassName('icon');
    for (var i = 0; i < icons.length; i++) {
      var icon = icons[i];
      var iconRect = positions[icon.id];
      if (overlap(targetRect, iconRect)) {
        var percent = intersection(targetRect, iconRect);
        if (percent && percent > overlappingPercent) {
          overlappingTarget = icon;
          overlappingPercent = percent;
        }
      }
    }

    if (overlappingTarget && overlappingTarget !== target)
      return overlappingTarget;

    return null;
  }
})();

