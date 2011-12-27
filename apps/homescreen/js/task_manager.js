/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

if (!window['Gaia'])
  var Gaia = {};

(function() {
  
  var lastDragPosition = -1;
  var isKeyDown = false;
  var checkKeyPressTimeout = null;
  var animateScrollInterval = null;
  
  var animationLoop = function(renderCallback) {
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
  
  Gaia.TaskManager = {
    
    _isActive: false,
    
    get isActive() {
      return this._isActive;
    },
    
    setActive: function(value) {
      if (this._isActive && value)
        return;
      
      this._isActive = value;
      
      var runningApps = Gaia.AppManager.runningApps;
      var listItemWidth = window.innerWidth * 0.6;
      
      if (value) {
        this.listElement.scrollLeft = listItemWidth;
        this.element.classList.add('active');
        for (var i = 0; i < runningApps.length; i++) {
          var classList = runningApps[i].window.classList;
          classList.add('active');
          classList.add('noTransition');
        }
      } else {
        this.element.classList.remove('active');
        for (var i = 0; i < runningApps.length; i++) {
          var classList = runningApps[i].window.classList;
          classList.remove('active');
          classList.remove('noTransition');
        }
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
          if (evt.keyCode !== evt.DOM_VK_ESCAPE || isKeyDown)
            return;
          
          if (checkKeyPressTimeout) {
            clearTimeout(checkKeyPressTimeout);
            checkKeyPressTimeout = null;
          }
          
          isKeyDown = true;
          
          if (this.isActive)
            this.setActive(false);
          else {
            checkKeyPressTimeout = setTimeout(function checkKeyPress(self) {
              checkKeyPressTimeout = null;
              
              if (isKeyDown)
                self.setActive(true);
            }, 1000, this);
          }
          break;
        case 'keyup':
          if (evt.keyCode !== evt.DOM_VK_ESCAPE)
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
          var runningAppCount = Gaia.AppManager.runningApps.length;
          var listItemWidth = window.innerWidth * 0.6;
          var listIndex = Math.round(listElement.scrollLeft / listItemWidth);
          
          if (listIndex === 0)
            listIndex = 1;
          else if (listIndex > runningAppCount)
            listIndex = runningAppCount;
          
          var currentScrollLeft = listElement.scrollLeft;
          var targetScrollLeft = listIndex * listItemWidth;
          var willAnimateToTheLeft = (currentScrollLeft < targetScrollLeft);
          
          if (currentScrollLeft !== targetScrollLeft) {
            animationLoop(function(deltaTime) {
              if (willAnimateToTheLeft) {
                listElement.scrollLeft = currentScrollLeft += 20 * deltaTime / 16;
                
                if (currentScrollLeft >= targetScrollLeft) {
                  listElement.scrollLeft = currentScrollLeft = targetScrollLeft;
                  return false;
                }
              } else {
                listElement.scrollLeft = currentScrollLeft -= 20 * deltaTime / 16;
                
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
      item.setAttribute('style', 'background: -moz-element(#app_' + id + ') no-repeat');
      
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
      
      return item;
    },
    
    remove: function(app, id) {
      var listElement = this.listElement;
      var item = document.getElementById('task_' + id);
      listElement.removeChild(item);
      Gaia.AppManager.kill(app.url);
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