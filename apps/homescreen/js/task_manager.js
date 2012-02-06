/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var emulateRun = (window.navigator.userAgent.indexOf('B2G') == -1);

if (!window['Gaia'])
  var Gaia = {};

Gaia.AnimationLoop = function(renderCallback) {
  var isRunning = true;
  var lastFrame = Date.now();
  var requestAnimationFrame = function(animFrameCallback) {
    if (window.mozRequestAnimationFrame)
      window.mozRequestAnimationFrame(animFrameCallback);
    else if (window.webkitRequestAnimationFrame)
      window.webkitRequestAnimationFrame(animFrameCallback);
    else if (window.requestAnimationFrame)
      window.requestAnimationFrame(animFrameCallback);
  };

  (function loop(currentFrame) {
    if (isRunning !== false) {
      requestAnimationFrame(loop);
      isRunning = renderCallback(currentFrame - lastFrame);
      lastFrame = currentFrame;
    }
  })(lastFrame);
};

(function() {

  var lastDragPosition = -1;
  var isKeyDown = false;
  var checkKeyPressTimeout = null;
  var animateScrollInterval = null;

  Gaia.TaskManager = {

    _isActive: false,

    get isActive() {
      return this._isActive;
    },

    setActive: function(value) {
      if (this._isActive && value)
        return;

      this._isActive = value;

      Gaia.WindowManager.setActive(false);
      
      var windows = Gaia.WindowManager.windows;
      var listItemWidth = window.innerWidth * 0.5;

      if (value) {
        for (var i = 0, length = windows.length; i < length; i++)
          windows[i].setActive(true);
        
        this.listElement.scrollLeft = listItemWidth;
        this.element.classList.add('active');
      } else {
        for (var i = 0, length = windows.length; i < length; i++)
          windows[i].setActive(false);
        
        this.element.classList.remove('active');
      }
    },

    get element() {
      delete this.element;

      return this.element = document.getElementById('taskManager');
    },

    get listElement() {
      delete this.listElement;

      return this.listElement = this.element.getElementsByTagName('ul')[0];
    },

    init: function() {
      window.addEventListener('keydown', this);
      window.addEventListener('keyup', this);

      var listElement = this.listElement;
      listElement.addEventListener('touchstart', this);
      listElement.addEventListener('touchmove', this);
      listElement.addEventListener('touchend', this);
    },

    handleEvent: function(evt) {
      switch (evt.type) {
        case 'keydown':
          if (evt.keyCode !== (emulateRun ? evt.DOM_VK_ESCAPE : evt.DOM_VK_HOME) || isKeyDown)
            return;

          if (checkKeyPressTimeout) {
            clearTimeout(checkKeyPressTimeout);
            checkKeyPressTimeout = null;
          }

          isKeyDown = true;

          if (this.isActive)
            this.setActive(false);
          else {
            checkKeyPressTimeout = window.setTimeout(function checkKeyPress(self) {
              checkKeyPressTimeout = null;

              if (isKeyDown)
                self.setActive(true);
            }, 1000, this);
          }
          break;
        case 'keyup':
          if (evt.keyCode !== (emulateRun ? evt.DOM_VK_ESCAPE : evt.DOM_VK_HOME))
            return;

          if (checkKeyPressTimeout) {
            clearTimeout(checkKeyPressTimeout);
            checkKeyPressTimeout = null;
          }

          isKeyDown = false;
          break;
        case 'touchstart':
          var touches = evt.changedTouches;

          if (touches.length !== 1)
            return;

          var touch = touches[0];
          lastDragPosition = touch.pageX;
          break;
        case 'touchmove':
          if (lastDragPosition === -1)
            return;

          var touches = evt.changedTouches;

          if (touches.length !== 1)
            return;

          var touch = touches[0];
          this.listElement.scrollLeft -= touch.pageX - lastDragPosition;
          lastDragPosition = touch.pageX;
          break;
        case 'touchend':
          var listElement = this.listElement;
          var windowCount = Gaia.WindowManager.windows.length;
          var listItemWidth = window.innerWidth * 0.5;
          var listIndex = Math.round(listElement.scrollLeft / listItemWidth);
          
          listIndex = (listIndex === 0) ?
            1 : (listIndex > windowCount) ?
              windowCount : listIndex;

          var currentScrollLeft = listElement.scrollLeft;
          var targetScrollLeft = listIndex * listItemWidth;
          var willAnimateToTheLeft = (currentScrollLeft < targetScrollLeft);

          if (currentScrollLeft !== targetScrollLeft) {
            Gaia.AnimationLoop(function(deltaTime) {
              if (willAnimateToTheLeft) {
                currentScrollLeft += 20 * deltaTime / 16;
                listElement.scrollLeft = currentScrollLeft;

                if (currentScrollLeft >= targetScrollLeft) {
                  listElement.scrollLeft = currentScrollLeft = targetScrollLeft;
                  return false;
                }
              } else {
                currentScrollLeft -= 20 * deltaTime / 16;
                listElement.scrollLeft = currentScrollLeft;

                if (currentScrollLeft <= targetScrollLeft) {
                  listElement.scrollLeft = currentScrollLeft = targetScrollLeft;
                  return false;
                }
              }
            });
          }

          lastDragPosition = -1;
          break;
        default:
          throw new Error('Unhandled event in TaskManager');
          break;
      }
    },

    add: function(app, id) {
      var listElement = this.listElement;
      var item = document.createElement('li');
      item.id = 'task_' + id;

      var mozElement = 'background: -moz-element(#window_' + id + ') no-repeat';
      item.setAttribute('style', mozElement);
      
      var close = document.createElement('a');
      close.href = '#';
      close.addEventListener('click', (function(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        this.remove(app, id);
      }).bind(this), true);

      var title = document.createElement('h1');
      title.innerHTML = app.name;
      item.appendChild(close);
      item.appendChild(title);

      if (listElement.hasChildNodes())
        listElement.insertBefore(item, listElement.firstChild);
      else
        listElement.appendChild(item);
      
      var self = this;
      
      item.addEventListener('click', function taskClickHandler(evt) {
        self.setActive(false);
        window.setTimeout(function launchApp() {
          Gaia.WindowManager.launch(app.url);
        }, 400);
      });

      return item;
    },

    remove: function(app, id) {
      var listElement = this.listElement;
      var item = document.getElementById('task_' + id);
      listElement.removeChild(item);
      Gaia.WindowManager.kill(app.url);
    },

    sendToFront: function(id) {
      var listElement = this.listElement;
      var item = document.getElementById('task_' + id);
      var firstItem = listElement.firstChild;

      if (item === firstItem)
        return;

      listElement.removeChild(item);
      listElement.insertBefore(item, firstItem);
    }

  };

  window.addEventListener('load', function(evt) {
    Gaia.TaskManager.init();
  });

})();
