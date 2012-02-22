'use strict';

// Polyfill for requestAnimationFrame() / cancelAnimationFrame()
(function() {
  var lastTime = 0;
  var vendors = ['webkit', 'moz', 'ms', 'o'];
  
  for (var i = 0; i < vendors.length && !window.requestAnimationFrame; i++) {
    window.requestAnimationFrame = window[vendors[i] + 'RequestAnimationFrame'];
    window.cancelAnimationFrame = window[vendors[i] + 'CancelAnimationFrame'] ||
      window[vendors[i] + 'RequestCancelAnimationFrame'];
  }

  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function(callback, element) {
      var currTime = Date.now();
      var timeToCall = Math.max(0, 16 - (currTime - lastTime));
      var id = window.setTimeout(function() {
        callback(currTime + timeToCall);
      }, timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };
  }

  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function(id) {
      window.clearTimeout(id);
    };
  }
})();

var SKScrollEventType = {
  ScrollStart: 'SKScrollStart',
  ScrollEnd: 'SKScrollEnd'
};

var SKScrollBarType = {
  Horizontal: 0,
  Vertical: 1
};

var SKScrollView = function(element) {
  var kBounceTransitionDuration = 0.35;
  var kAccelerationTimeout = 250;
  var kAcceleration = 15;
  var kElasticDeceleration = 0.03;
  var kElasticAcceleration = 0.08;
  var kMinimumDecelerationVelocity = 1;
  var kDecelerationFactor = 0.95;
  var kMinimumVelocity = 0.01;
  var kScrollBarHideTimeout = 100;
  
  var _isDragging = false;
  var _isDecelerating = false;
  var _isScrolling = false;
  var _startAccelerateX = 0;
  var _startAccelerateY = 0;
  var _lastMouseX = -1;
  var _lastMouseY = -1;
  var _lastTimeStamp = Date.now();
  var _decelerationAnimationInterval = null;
  
  var $window = $(window['addEventListener'] ? window : document.body);
  var $element = this.$element = $(element);
  element = this.element = $(element).get(0);
  
  var content = this.content = new SKScrollContent(this);
  var horizontalScrollBar = this.horizontalScrollBar = new SKScrollBar(this, SKScrollBarType.Horizontal);
  var verticalScrollBar = this.verticalScrollBar = new SKScrollBar(this, SKScrollBarType.Vertical);
  var self = this;
  
  var startDeceleration = function(startTime) {
    var acceleration = (startTime - _lastTimeStamp) / kAcceleration;
    var accelerateDeltaX = self.x - _startAccelerateX;
    var accelerateDeltaY = self.y - _startAccelerateY;
    var velocityX = accelerateDeltaX / acceleration;
    var velocityY = accelerateDeltaY / acceleration;
    var minimumX = self.minimumX;
    var minimumY = self.minimumY;
    var elasticDeceleration = kElasticDeceleration;
    var elasticAcceleration = kElasticAcceleration;
    var lastFrameTime = 0;
    
    var stepAnimation = function (currentFrameTime) {
      if (!_isDecelerating) return;
      
      var deltaTime = currentFrameTime - lastFrameTime;
      var x = self.x = self.x + (!self.canScrollHorizontal() ? 0 : velocityX);
      var y = self.y = self.y + (!self.canScrollVertical() ? 0 : velocityY);
      
      velocityX *= kDecelerationFactor;
      velocityY *= kDecelerationFactor;
      
      if (Math.abs(velocityX) <= kMinimumVelocity &&
          Math.abs(velocityY) <= kMinimumVelocity) {
        _isDecelerating = false;
        scrollEnd();
        return;
      }
      
      content.translate(x, y);
      _decelerationAnimationInterval = window.requestAnimationFrame(stepAnimation);
      
      var elasticX = (x < minimumX) ? minimumX - x : (x > 0) ? -x : 0;
      var elasticY = (y < minimumY) ? minimumY - y : (y > 0) ? -y : 0;
      
      if (elasticX) velocityX = (elasticX * velocityX <= 0) ?
        velocityX + (elasticX * elasticDeceleration) : elasticX * elasticAcceleration;
      
      if (elasticY) velocityY = (elasticY * velocityY <= 0) ?
        velocityY + (elasticY * elasticDeceleration) : elasticY * elasticAcceleration;
      
      lastFrameTime = currentFrameTime;
    };
    
    if (Math.abs(velocityX) > kMinimumDecelerationVelocity ||
        Math.abs(velocityY) > kMinimumDecelerationVelocity) {
      _isDecelerating = true;
      _decelerationAnimationInterval = window.requestAnimationFrame(stepAnimation);
      lastFrameTime = Date.now();
    } else {
      scrollEnd();
    }
  };
  
  var stopDeceleration = function() {
    _isDecelerating = false;
    window.cancelAnimationFrame(_decelerationAnimationInterval);
  };
  
  var scrollStart = function() {
    if (_isScrolling) return;
    
    _isScrolling = true;
    
    if (self.canScrollHorizontal()) horizontalScrollBar.show();
    if (self.canScrollVertical()) verticalScrollBar.show();
    
    $element.trigger(SKScrollEventType.ScrollStart);
  };
  
  var scrollEnd = function() {
    if (!_isScrolling) return;
    
    _isScrolling = false;
    
    content.translate(self.x = Math.round(self.x), self.y = Math.round(self.y));
    
    if (self.canScrollHorizontal()) horizontalScrollBar.hide();
    if (self.canScrollVertical()) verticalScrollBar.hide();
    
    $element.trigger(SKScrollEventType.ScrollEnd);
  };
  
  var bounceTransitionEndHandler = function(evt) {
    $element.unbind(evt);
    scrollEnd();
  };
  
  $element.bind('mousedown touchstart', function(evt) {
    var scrollViewSize = self.getSize();
    var contentSize = content.getSize();
    
    self.minimumX = scrollViewSize.width - contentSize.width;
    self.minimumY = scrollViewSize.height - contentSize.height;
    
    _isDragging = true;
    _startAccelerateX = self.x;
    _startAccelerateY = self.y;
    _lastMouseX = (evt.type === 'touchstart') ? evt.originalEvent.touches[0].pageX : evt.pageX;
    _lastMouseY = (evt.type === 'touchstart') ? evt.originalEvent.touches[0].pageY : evt.pageY;
    _lastTimeStamp = evt.timeStamp;
    
    stopDeceleration();
    
    if (self.canScrollHorizontal()) horizontalScrollBar.update(true);
    if (self.canScrollVertical()) verticalScrollBar.update(true);
    
    evt.preventDefault();
  });
  
  $window.bind('mousemove touchmove', function(evt) {
    if (!_isDragging) return;
    
    var mouseX = (evt.type === 'touchmove') ? evt.originalEvent.touches[0].pageX : evt.pageX;
    var mouseY = (evt.type === 'touchmove') ? evt.originalEvent.touches[0].pageY : evt.pageY;
    var deltaX = mouseX - _lastMouseX;
    var deltaY = mouseY - _lastMouseY;
    var x = self.x + deltaX;
    var y = self.y + deltaY;
    
    x -= ((x < self.minimumX) ? deltaX : (x > 0) ? deltaX : 0) / 2;
    y -= ((y < self.minimumY) ? deltaY : (y > 0) ? deltaY : 0) / 2;
    x = self.x = !self.canScrollHorizontal() ? 0 : x;
    y = self.y = !self.canScrollVertical() ? 0 : y;
    
    content.translate(x, y);
    
    var accelerationTime = evt.timeStamp - _lastTimeStamp;
    
    if (accelerationTime > kAccelerationTimeout) {
      _startAccelerateX = x;
      _startAccelerateY = y;
      _lastTimeStamp = evt.timeStamp;
    }
    
    if (self.canScrollHorizontal()) horizontalScrollBar.update();
    if (self.canScrollVertical()) verticalScrollBar.update();
    if (!_isScrolling) scrollStart();
    
    _lastMouseX = mouseX;
    _lastMouseY = mouseY;
  });
  
  $window.bind('mouseup touchend', function(evt) {
    if (!_isDragging) return;
    
    var timeStamp = evt.timeStamp;
    var accelerationTime = timeStamp - _lastTimeStamp;
    var x = Math.min(Math.max(self.minimumX, self.x), 0);
    var y = Math.min(Math.max(self.minimumY, self.y), 0);
    
    var bounce = function() {
      $element.bind('webkitTransitionEnd transitionend MSTransitionEnd oTransitionEnd transitionEnd', bounceTransitionEndHandler);
      content.translate(x, y, kBounceTransitionDuration);
      
      if (self.canScrollHorizontal()) horizontalScrollBar.hide();
      if (self.canScrollVertical()) verticalScrollBar.hide();
      
      self.x = _startAccelerateX = !self.canScrollHorizontal() ? 0 : x;
      self.y = _startAccelerateY = !self.canScrollVertical() ? 0 : y;
    };
    
    if (accelerationTime < kAccelerationTimeout) {
      if (x !== self.x || y !== self.y) {
        bounce();
      } else {
        startDeceleration(timeStamp);
      }
    } else if (x !== self.x || y !== self.y) {
      bounce();
    } else {
      scrollEnd();
    }
    
    _isDragging = false;
    _lastMouseX = -1;
    _lastMouseY = -1;
    _lastTimeStamp = timeStamp;
  });
  
  $element.data('scrollView', this);
};

SKScrollView.prototype = {
  minimumX: 0,
  minimumY: 0,
  element: null,
  $element: null,
  content: null,
  horizontalScrollBar: null,
  verticalScrollBar: null,
  x: 0,
  y: 0,
  canScrollHorizontal: function() { return (this.minimumX < 0); },
  canScrollVertical: function() { return (this.minimumY < 0); },
  getSize: function() {
    var $element = this.$element;
    return { width: $element.width(), height: $element.height() };
  }
};

var SKScrollContent = function(scrollView) {
  this.scrollView = scrollView;
  scrollView.$element.wrapInner('<div class="sk-scroll-content"/>');
  
  var $element = this.$element = scrollView.$element.children('.sk-scroll-content');
  var element = this.element = $element.get(0);
};

SKScrollContent.prototype = {
  element: null,
  $element: null,
  scrollView: null,
  getSize: function() {
    var $element = this.$element;
    return { width: $element.width(), height: $element.height() };
  },
  translate: function(x, y, duration) {
    var translate3d = 'translate3d(' + x + 'px, ' + y + 'px, 0)';
    var translate = 'translate(' + x + 'px, ' + y + 'px)';
    
    duration = (duration) ? duration + 's' : '0s';
    
    this.$element.css({
      '-webkit-transition-duration': duration,
      '-moz-transition-duration': duration,
      '-ms-transition-duration': duration,
      '-o-transition-duration': duration,
      'transition-duration': duration,
      '-webkit-transform': translate3d,
      '-moz-transform': translate,
      '-ms-transform': translate,
      '-o-transform': translate,
      'transform': translate
    });
    
    var scrollView = this.scrollView;
    
    if (scrollView.canScrollHorizontal()) scrollView.horizontalScrollBar.update();
    if (scrollView.canScrollVertical()) scrollView.verticalScrollBar.update();
  }
};

var SKScrollBar = function(scrollView, type) {
  this.scrollView = scrollView;
  this.type = type;
  
  var $element = this.$element = $('<div class="sk-scroll-bar"/>');
  var element = this.element = $element.get(0);
  
  scrollView.$element.append($element);
  
  if (this.type === SKScrollBarType.Horizontal) {
    this.thickness = parseInt($element.css('height'), 10);
    $element.css({ 'bottom': '0', 'left': '0' });
  } else {
    this.thickness = parseInt($element.css('width'), 10);
    $element.css({ 'top': '0', 'right': '0' });
  }
};

SKScrollBar.prototype = {
  _size: 0,
  _scrollViewSize: null,
  _contentSize: null,
  element: null,
  $element: null,
  scrollView: null,
  type: SKScrollBarType.Horizontal,
  minimumSize: 34,
  thickness: 5,
  setSize: function(value) {
    this._size = value;
    this.$element.css((this.type === SKScrollBarType.Horizontal) ? 'width' : 'height', value + 'px');
  },
  update: function(recalculateSize) {
    var scrollView = this.scrollView;
    var minimumSize = this.minimumSize;
    var thickness = this.thickness;
    var type = this.type;
    var content = scrollView.content;
    var scrollViewSize, contentSize
    
    if (recalculateSize) {
      scrollViewSize = this._scrollViewSize = scrollView.getSize();
      contentSize = this._contentSize = content.getSize();
    } else {
      scrollViewSize = this._scrollViewSize;
      contentSize = this._contentSize;
    }
    
    var canScrollHorizontal = scrollView.canScrollHorizontal();
    var canScrollVertical = scrollView.canScrollVertical();
    var margin, size, scrollPosition, minimumPosition, position, translate3d, translate;
    
    if (type === SKScrollBarType.Horizontal) {
      margin = (canScrollVertical ? thickness * 2 : thickness) + 1;
      scrollPosition = scrollView.x;
      size = (!recalculateSize && minimumPosition < scrollPosition && scrollPosition < 0) ?
        this._size : Math.max(minimumSize, Math.round(
          (scrollViewSize.width / contentSize.width) * (scrollViewSize.width - margin)
        ));
      
      minimumPosition = scrollView.minimumX;
      position = (scrollPosition / minimumPosition) * (scrollViewSize.width - margin - size);
      
      if (scrollPosition > 0) {
        size = Math.round(Math.max(size - scrollPosition, thickness));
        position = 1;
      } else if (scrollPosition < minimumPosition) {
        size = Math.round(Math.max(size - minimumPosition + scrollPosition, thickness));
        position = scrollViewSize.width - size - margin;
      }
      
      translate3d = 'translate3d(' + position + 'px, 0, 0)';
      translate = 'translate(' + position + 'px, 0)';
    } else {
      margin = (canScrollHorizontal ? thickness * 2 : thickness) + 1;
      scrollPosition = scrollView.y;
      size = (!recalculateSize && minimumPosition < scrollPosition && scrollPosition < 0) ?
        this._size : Math.max(minimumSize, Math.round(
          (scrollViewSize.height / contentSize.height) * (scrollViewSize.height - margin)
        ));
      
      minimumPosition = scrollView.minimumY;
      position = (scrollPosition / minimumPosition) * (scrollViewSize.height - margin - size);
      
      if (scrollPosition > 0) {
        size = Math.round(Math.max(size - scrollPosition, thickness));
        position = 1;
      } else if (scrollPosition < minimumPosition) {
        size = Math.round(Math.max(size - minimumPosition + scrollPosition, thickness));
        position = scrollViewSize.height - size - margin;
      }
      
      translate3d = 'translate3d(0, ' + position + 'px, 0)';
      translate = 'translate(0, ' + position + 'px)';
    }
    
    if (this._size !== size) this.setSize(size);
    
    this.$element.css({
      '-webkit-transform': translate3d,
      '-moz-transform': translate,
      '-ms-transform': translate,
      '-o-transform': translate,
      'transform': translate
    });
  },
  show: function() {
    this.$element.addClass('active');
  },
  hide: function() {
    this.$element.removeClass('active');
  }
};

$(function() {
  $('.sk-scroll-view').each(function(index, element) { new SKScrollView(element); });
});
