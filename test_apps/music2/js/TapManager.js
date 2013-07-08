function TapManager(dom){
  this.dom = dom;

  Utils.setupPassParent(this, 'down');
  Utils.setupPassParent(this, 'up');
  Utils.setupPassParent(this, 'tap');
  Utils.setupPassParent(this, 'long');
  Utils.setupPassParent(this, 'longTap');

  this.state = {
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    long: false,
    potentialTap: false,
  };

  this.fns = [];

  this.registerEvents();
}

TapManager.prototype = {
  //========================
  //  STATE
  //========================
  pointerDown: function(x, y){
    if (this.dom.disabled)
      return;
    this.state.startX = x;
    this.state.startY = y;
    this.state.lastX = x;
    this.state.lastY = y;
    this.state.long = false;
    this.state.potentialTap = true;
    this.down(x, y);
    setTimeout(this.checkLong.bind(this), 500);
  },
  pointerMove: function(x, y){
    if (this.state.potentialTap && this.movedTooMuch(x, y)){
      this.state.potentialTap = false;
      this.state.lastX = x;
      this.state.lastY = y;
      this.up();
    }
  },
  movedTooMuch: function(x, y){
    return (window.Math.abs(x - this.state.startX) > 10 || 
            window.Math.abs(y - this.state.startY) > 10);
  },
  pointerUp: function(){
    if (this.state.potentialTap){
      if (this.state.long)
        this.longTap(this.state.lastX, this.state.lastY);
      else
        this.tap(this.state.lastX, this.state.lastY);
      this.state.potentialTap = false;
      this.up();
    }
  },
  pointerExit: function(){
    if (this.state.potentialTap){
      this.state.potentialTap = false;
      this.up();
    }
  },
  checkLong: function(){
    if (this.state.potentialTap && this.onlong){
      this.long(this.state.lastX, this.state.lastY);
      this.state.long = true;
    }
  },

  //========================
  //  INIT
  //========================

  addEvent: function(eventName, fn){
    this.dom.addEventListener(eventName, fn);
    this.fns.push({ 'type': eventName, 'fn': fn });
  },

  registerEvents: function(){
    if ('ontouchstart' in document.documentElement)
      this.registerTouchEvents();
    else 
      this.registerMouseEvents();
  },
  registerTouchEvents: function(){
    this.addEvent('touchstart', function(event){
      var x = event.touches[0].clientX;
      var y = event.touches[0].clientY;
      this.pointerDown(x, y);
    }.bind(this));
    this.addEvent('touchend', function(event){
      this.pointerUp();
    }.bind(this));
    this.addEvent('touchleave', function(event){
      this.pointerExit();
    }.bind(this));
    this.addEvent('touchmove', function(event){
      var x = event.touches[0].clientX;
      var y = event.touches[0].clientY;
      this.pointerMove(x, y);
    }.bind(this));
  },
  registerMouseEvents: function(){
    this.addEvent('mousedown', function(event){
      this.pointerDown(event.clientX, event.clientY);
    }.bind(this));
    this.addEvent('mouseout', function(event){
      this.pointerExit();
    }.bind(this));
    this.addEvent('mouseup', function(event){
      this.pointerUp();
    }.bind(this));
  },
  //========================
  //  DESTROY
  //========================
  destroy: function(){
    for (var i = 0; i < this.fns.length; i++){
      this.dom.removeEventListener(this.fns[i].type, this.fns[i].fn);
    }
    this.fns = [];
  }
}
