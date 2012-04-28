/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function dragdropHandler() {

  function overlap(element1, element2) {
    var r1 = element1.getBoundingClientRect();
    var r2 = element2.getBoundingClientRect();

    return (r1.left < r2.left + r2.width && r1.left + r1.width > r2.left &&
            r1.top < r2.top + r2.height && r1.top + r1.height > r2.top);
  }


  var floatingClone = null;
  function createFloatingClone(target) {
    floatingClone = target.cloneNode(true);
    floatingClone.id = 'clone';

    var rect = target.getBoundingClientRect();
    floatingClone.style.left = rect.left + 'px';
    floatingClone.style.top = rect.top + 'px';

    floatingClone.style.backgroundImage = target.style.backgroundImage;
    document.body.appendChild(floatingClone);
  }

  function updateFloatingClone(deltaX, deltaY) {
    var transform = 'scale(1.1) translate(' + deltaX + 'px, ' + deltaY + 'px)';
    floatingClone.style.MozTransform = transform;
  }

  function destroyFloatingClone() {
    document.body.removeChild(floatingClone);
  }


  var uninstallButton = null;
  function createUninstallButton() {
    uninstallButton = document.createElement('button');
    uninstallButton.id = 'uninstall';
    document.body.appendChild(uninstallButton);
  }

  function updateUninstallButton(active) {
    active ? uninstallButton.classList.add('active')
           : uninstallButton.classList.remove('active');
  }

  function destroyUninstallButton() {
    document.body.removeChild(uninstallButton);
  }


  var DragDropHandler = {
    onDragStart: function ddh_onDragStart(evt) {
      createFloatingClone(this.target);
      this.target.style.opacity = 0.2;

      createUninstallButton();
    },

    onDragStop: function ddh_onDragStop(evt) {
      var target = this.target;

      if (overlap(floatingClone, uninstallButton)) {
        var app = appscreen.getAppByOrigin(target.dataset.url);

        // FIXME: localize this message
        // FIXME: This could be a simple confirm() (see bug 741587)
        requestPermission(
          'Do you want to uninstall ' + app.manifest.name + '?',
          function() { app.uninstall(); },
          function() { target.style.opacity = 1.0 }
        );
      } else {
        target.style.opacity = 1.0;
      }

      destroyFloatingClone();
      destroyUninstallButton();
    },

    onDragMove: function ddh_onDragMove(evt) {
      updateFloatingClone(evt.pageX - this.startX, evt.pageY - this.startY);
      updateUninstallButton(overlap(floatingClone, uninstallButton));
    },

    target: null,
    startX: 0,
    startY: 0,
    handleEvent: function ddh_handleEvent(evt) {
      var target = evt.target;

      switch (evt.type) {
        case 'contextmenu':
          if (!('url' in target.dataset))
            return;
          this.target = target;
          this.startX = evt.pageX;
          this.startY = evt.pageY;

          this.onDragStart(evt);
          break;
        case 'mouseup':
          if (!this.target)
            return;

          this.onDragStop(evt);
          this.target = null;
          break;
        case 'mousemove':
          if (!this.target)
            return;

          this.onDragMove(evt);
          break;
      }
    }
  };

  window.addEventListener('contextmenu', DragDropHandler, true);
  window.addEventListener('mousemove', DragDropHandler);
  window.addEventListener('mouseup', DragDropHandler);
})();

