/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

(function dragdropHandler() {
  'use strict';

  var DragDropHandler = {
    onDragStart: function ddh_onDragStart(target) {
      target.classList.add('float');
      target.style.MozTransform = 'scale(1.1) translate(0px, 0px)';
      button.classList.add('visible');
    },

    onDragMove: function ddh_onDragMove(target, deltaX, deltaY) {
      target.style.MozTransform =
        'scale(1.1) translate(' + deltaX + 'px, ' + deltaY + 'px)';

      overlap(target, button) ? button.classList.add('active')
                              : button.classList.remove('active');
    },

    onDragStop: function ddh_onDragStop(target) {
      var shouldUninstall = overlap(target, button);
      target.classList.add('hidden');

      target.classList.remove('float');
      target.style.MozTransform = '';
      button.classList.remove('visible');

      if (shouldUninstall) {
        var app = appscreen.getAppByOrigin(target.dataset.url);
        var msg = 'Do you want to uninstall ' + app.manifest.name + '?';
        requestPermission(msg, function() { app.uninstall() },
                          function() { target.classList.remove('hidden') });
        return;
      }

      target.classList.remove('hidden');
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
          this.startX = e.pageX;
          this.startY = e.pageY;
          this.onDragStart(target);
          break;

        case 'mousemove':
          if (!this.target)
            return;

          this.onDragMove(target, e.pageX - this.startX, e.pageY - this.startY);
          break;

        case 'mouseup':
          if (!this.target)
            return;

          this.onDragStop(target);
          this.target = null;
          break;
      }
    }
  };

  window.addEventListener('contextmenu', DragDropHandler, true);
  window.addEventListener('mousemove', DragDropHandler);
  window.addEventListener('mouseup', DragDropHandler);

  function overlap(element1, element2) {
    var r1 = element1.getBoundingClientRect();
    var r2 = element2.getBoundingClientRect();

    return (r1.left < r2.left + r2.width && r1.left + r1.width > r2.left &&
            r1.top < r2.top + r2.height && r1.top + r1.height > r2.top);
  }

  var button = document.createElement('button');
  button.id = 'uninstall';
  document.body.appendChild(button);
})();

