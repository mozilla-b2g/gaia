/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

function isInEditMode() {
  return document.getElementById('apps').classList.contains('edit');
}

(function dragdropHandler() {
  'use strict';

  var rectangles = {};

  var DragDropHandler = {
    onDragStart: function ddh_onDragStart(target) {
      var icons = document.getElementsByClassName('icon');
      for (var i = 0; i < icons.length; i++)
        rectangles[icons[i].id] = icons[i].getBoundingClientRect();

      var rect = rectangles[target.id];
      this.clone.style.position = 'absolute';
      this.clone.style.left = rect.left - 20 + 'px';
      this.clone.style.top = rect.top - 30 + 'px';
      this.clone.style.MozTransform = 'scale(1.1) translate(0px, 0px)';
      document.body.appendChild(this.clone);

      document.getElementById('apps').classList.add('edit');
      target.classList.add('hidden');
    },

    onDragMove: function ddh_onDragMove(target, deltaX, deltaY) {
      this.clone.style.MozTransform =
        'scale(1.1) translate(' + deltaX + 'px, ' + deltaY + 'px)';

      var dropTarget = overlapIcon(this.clone);
      if (dropTarget) {
        if (dropTarget.previousSibling === target) {
          dropTarget.parentNode.insertBefore(target, dropTarget.nextSibling);
        } else {
          target = dropTarget.parentNode.insertBefore(target, dropTarget);
        }

        var icons = target.parentNode.parentNode.querySelectorAll('.icon');
        for (var i = 0; i < icons.length; i++)
          rectangles[icons[i].id] = icons[i].getBoundingClientRect();
      }

      // Switch pages if needed
      var grid = appscreen.grid;
      var rect = this.clone.getBoundingClientRect();
      if (rect.left < 10) {
        grid.setPage(grid.currentPage - 1, 0.2);
      } else if (rect.left + rect.width > window.innerWidth + 10) {
        grid.setPage(grid.currentPage + 1, 0.2);
      }
    },

    onDragStop: function ddh_onDragStop(target) {
      var dropTarget = overlapIcon(this.clone);
      if (!dropTarget) {
        var grid = appscreen.grid;
        var page = grid.container.childNodes[grid.currentPage];
        target = page.insertBefore(target, page.lastChild.nextSibling);
      }

      target.classList.remove('hidden');
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

          this.onDragMove(this.target, e.pageX - this.startX,
                          e.pageY - this.startY);
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
          if (!isInEditMode() || e.keyCode != e.DOM_VK_HOME)
            return;

          document.getElementById('apps').classList.remove('edit');
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
    return r1.left < r2.left + r2.width && r1.left + r1.width > r2.left &&
           r1.top < r2.top + r2.height && r1.top + r1.height > r2.top;
  }

  function intersection(r1, r2) {
    return Math.abs(Math.max(r1.left, r2.left) -
           Math.min(r1.left + r1.width, r2.left + r2.width)) *
           Math.abs(Math.max(r1.top, r2.top) -
           Math.min(r1.top + r1.height, r2.top + r2.height));
  }

  function overlapIcon(target, deltX, deltaY) {
    var targetRect = target.getBoundingClientRect();

    var maxIntersection = 0;
    var srcIntersection = null;

    var icons = document.querySelectorAll('.icon');
    for (var i = 0; i < icons.length; i++) {
      var icon = icons[i];

      var iconRect = rectangles[icon.id];
      if (overlap(targetRect, iconRect)) {
        var intersect = intersection(targetRect, iconRect);
        if (intersect && intersect > maxIntersection) {
          srcIntersection = icon;
          maxIntersection = intersect;
        }
      }
    }

    return srcIntersection;
  }
})();

