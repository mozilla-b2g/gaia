/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

if (!window['Gaia'])
  var Gaia = {};

(function() {
  
  var lastDragPosition = -1;
  var isKeyDown = false;
  
  Gaia.TaskManager = {
    
    _isActive: false,
    
    get isActive() {
      return this._isActive;
    },
    
    set isActive(value) {
      this._isActive = value;
      
      var runningApps = Gaia.AppManager.runningApps;
      
      if (value) {
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
      window.addEventListener('keypress', this);
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
          
          isKeyDown = true;
          
          if (this.isActive)
            this.isActive = false;
          else {
            setTimeout(function(self) {
              if (isKeyDown)
                self.isActive = true;
            }, 1000, this);
          }
          break;
        case 'keyup':
          if (evt.keyCode !== evt.DOM_VK_ESCAPE)
            return;
          
          isKeyDown = false;
          break;
        case 'keypress':
          // if (evt.keyCode !== evt.DOM_VK_ESCAPE)
          //             return;
          // 
          //           this.isActive = !this.isActive;
          //           evt.preventDefault();
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
          lastDragPosition = -1;
          break;
        default:
          throw new Error('Unhandled event in TaskManager');
          break;
      }
    },
    
    add: function(id) {
      var item = document.createElement('li');
      item.id = 'task_' + id;
      item.setAttribute('style', 'background: -moz-element(#app_' + id + ') no-repeat');
      this.listElement.appendChild(item);
      return item;
    },
    
    remove: function(id) {
      var listElement = this.listElement;
      var item = listElement.getElementById('task_' + id);
      listElement.removeChild(item);
    }
    
  };
  
  window.addEventListener('load', function(evt) {
    Gaia.TaskManager.init();
  });
  
})();