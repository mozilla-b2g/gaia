/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

if (!window['Gaia'])
  var Gaia = {};

(function() {
  
  Gaia.UI = {
    NavController: function(navBar, rootView) {
      this.navBar = navBar;
      this.titleBar = navBar.getElementsByTagName('h1')[0];
      this.rootView = rootView;
      this.views = [rootView];
      
      var backButton = document.createElement('a');
      backButton.className = 'button left hide';
      backButton.href = '#';
      backButton.innerHTML = 'Back';
      backButton.navController = this;
      backButton.addEventListener('click', function(evt) {
        this.navController.popView();
      });
      
      navBar.appendChild(backButton);
      
      this.backButton = backButton;
      
      rootView.classList.add('active');
      
      this.titleBar.innerHTML = rootView.getAttribute('data-title');
    },
    ToggleSwitch: function(checkbox) {      
      var element = this.element = document.createElement('a');
      var onElement = this.onElement = document.createElement('span');
      var leverElement = this.leverElement = document.createElement('span');
      var offElement = this.offElement = document.createElement('span');
      var hiddenInput = this.hiddenInput = document.createElement('input');
      var checkedValue = this.checkedValue = checkbox.value || 1;
      
      var _isOn = this._isOn = checkbox.hasAttribute('checked');
      
      var parent = checkbox.parentNode;
      
      element.toggleSwitch = this;
      
      element.className = (_isOn) ? 'toggleSwitch on' : 'toggleSwitch off';
      onElement.className = 'on';
      leverElement.className = 'lever';
      offElement.className = 'off';

      onElement.innerHTML = 'On';
      leverElement.innerHTML = '&nbsp;';
      offElement.innerHTML = 'Off';
      
      element.appendChild(onElement);
      element.appendChild(leverElement);
      element.appendChild(offElement);
      
      parent.removeChild(checkbox);
      parent.appendChild(element);
      
      hiddenInput.type = 'hidden';
      hiddenInput.id = checkbox.id;
      hiddenInput.name = checkbox.name;
      hiddenInput.value = (_isOn) ? checkedValue : '';
      hiddenInput.toggleSwitchElement = element;
      
      element.appendChild(hiddenInput);
      
      element.addEventListener('click', function(evt) {
        var toggleSwitch = this.toggleSwitch;
        
        if (!toggleSwitch._isAnimating)
          toggleSwitch.isOn = !toggleSwitch.isOn;
        
        evt.preventDefault();
      });
    }
  };
  
  Gaia.UI.NavController.prototype = {
    get topView() {
      var views = this.views;
      return views[views.length - 1];
    },
    views: [],
    pushView: function(view) {
      var views = this.views;
      var topView = this.topView;
      
      topView.classList.remove('pop');
      topView.classList.add('push');
      
      view.classList.add('active');
      view.classList.remove('popTop');
      view.classList.add('pushTop');
      
      views.push(view);
      
      this.titleBar.innerHTML = view.getAttribute('data-title');
    },
    popView: function() {
      var views = this.views;
      var topView = this.topView;
      
      // Make sure there is always at least one view on the stack.
      if (views.length > 1) {

        var topViewAnimationHandler = function() {
          this.removeEventListener('animationend', topViewAnimationHandler);
          this.classList.remove('active');
          this.classList.remove('popTop');
        };
      
        topView.addEventListener('animationend', topViewAnimationHandler);
      
        topView.classList.remove('pushTop');
        topView.classList.add('popTop');
      
        views.pop();
      
        var newTopView = this.topView;
        
        var newTopViewAnimationHandler = function() {
          this.removeEventListener('animationend', newTopViewAnimationHandler);
          this.classList.remove('pop');
        };
      
        newTopView.addEventListener('animationend', newTopViewAnimationHandler);
        
        newTopView.classList.remove('push');
        newTopView.classList.add('pop');
      
        this.titleBar.innerHTML = newTopView.getAttribute('data-title');
        
        return topView;
      }
      
      return null;
    }
  };
  
  Gaia.UI.ToggleSwitch.prototype = {
    _isAnimating: false,
    get isOn() {
      return this._isOn;
    },
    set isOn(value) {
      if (this._isOn === value)
        return;
        
      var isOn = this._isOn = value;
      var element = this.element;
      var hiddenInput = this.hiddenInput;
      var checkedValue = this.checkedValue;
      var classList = element.classList;
      var toggleAnimationHandler;

      if (isOn) {
        toggleAnimationHandler = function() {
          var classList = this.classList;
          this.removeEventListener('animationend', toggleAnimationHandler);
          classList.remove('animateOn');
          classList.add('on');
          this.toggleSwitch._isAnimating = false;
        };
        
        element.addEventListener('animationend', toggleAnimationHandler);
        
        classList.remove('off');
        classList.add('animateOn');
        hiddenInput.value = checkedValue;
      } else {
        toggleAnimationHandler = function() {
          var classList = this.classList;
          this.removeEventListener('animationend', toggleAnimationHandler);
          classList.remove('animateOff');
          classList.add('off');
          this.toggleSwitch._isAnimating = false;
        };
        
        element.addEventListener('animationend', toggleAnimationHandler);
        
        classList.remove('on');
        classList.add('animateOff');
        hiddenInput.value = '';
      }
      
      this._isAnimating = true;
      
      var evt = document.createEvent('UIEvents');
      evt.initUIEvent('change', true, true, window, isOn ? checkedValue : '');
      element.dispatchEvent(evt);
    }
  };
  
  window.addEventListener('click', function(evt) {
    var target = evt.target;
    var targetNodeName = target.nodeName.toLowerCase();
    var classList = target.classList;
    
    switch (targetNodeName) {
      case 'a':
        
        // Handle drill down cells.
        if (classList.contains('drillDownCell')) {
          if (window['navController']) {
            var targetHash = target.hash;
            if (targetHash) {
              var targetView = document.getElementById(targetHash.substr(1));
              if (targetView) {
                window.navController.pushView(targetView);
                evt.preventDefault();
              }
            }
          }
        }
        
        break;
      default:
        target = target.parentNode;
        targetNodeName = target.nodeName.toLowerCase();
        classList = target.classList;
        
        if (targetNodeName === 'a' && classList.contains('drillDownCell')) {
          target.click();
          evt.preventDefault();
        }
      
        break;
    }
  });
  
  window.addEventListener('load', function() {
    var i, j;
    
    // Initialize table views.
    var tableViews = document.getElementsByClassName('tableView');
    
    for (i = 0; i < tableViews.length; i++) {
      var tableView = tableViews[i];
      var drillDownCells = tableView.getElementsByClassName('drillDownCell');
      
      for (j = 0; j < drillDownCells.length; j++) {
        var drillDownCell = drillDownCells[j];
        
        if (drillDownCell.hash) {
          var arrow = document.createElement('span');
          arrow.className = 'arrowRight';
          drillDownCell.appendChild(arrow);
        }
      };
    }
    
    // Initialize toggle switches.
    var toggleSwitchCheckboxes = document.getElementsByClassName('toggleSwitch');
    
    for (i = 0; i < toggleSwitchCheckboxes.length; i++) {
      var checkbox = toggleSwitchCheckboxes[i];
      new Gaia.UI.ToggleSwitch(checkbox);
    }
  });
  
  window.addEventListener('keypress', function(evt) {
    if (evt.keyCode === evt.DOM_VK_ESCAPE) {
      var navController = window['navController'];
    
      if (navController && navController.popView()) {
        evt.preventDefault();
      }
    }
  }, true);
  
})();
