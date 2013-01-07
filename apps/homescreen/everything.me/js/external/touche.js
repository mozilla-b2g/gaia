// shouldn't need to wait DOM readiness (famous last words...)

if(!('ontouchstart' in window)) {
  // keep track of the button state.  we don't want to fire touchmove when the mouse is up
  var isMouseDown = false;
  
  var originator = null;
  var fireTouch = function(type, e) {
    var target = originator || e.target;
    var newEvent = document.createEvent('MouseEvent');  // trying to create an actual TouchEvent will create an error
    newEvent.initMouseEvent(type, true, true, window, e.detail,
                            e.screenX, e.screenY, e.clientX, e.clientY,
                            e.ctrlKey, e.shiftKey, e.altKey, e.metaKey,
                            e.button, e.relatedTarget);
    
    // touches/targetTouches/changedTouches emulation
    var touchesObj = [{
      // identifier: unique id for the touch event (lazy.. just hooking it into the timestamp)
      // not using Date.now() just for greater support
      identifier: (new Date()).getTime(),
      pageX: e.pageX,
      pageY: e.pageY,
      clientX: e.clientX,
      clientY: e.clientY,
      target: target,
      screenX: e.screenX,
      screenY: e.screenY
    }];

    switch(type) {
      case 'touchstart':  // e.touches only
        originator = target;
        newEvent.touches = newEvent.targetTouches = touchesObj;
      break;
      
      case 'touchmove':   // e.touches and e.changedTouches
        newEvent.touches = newEvent.changedTouches = newEvent.targetTouches = touchesObj;
      break;
      
      case 'touchend':    // e.changedTouches only
        originator = null;
        newEvent.changedTouches = newEvent.targetTouches = touchesObj;
      break;
      default:
      break;
    }
    
    // fire off the event!
    e.target.dispatchEvent(newEvent);
  }
  
  // hook up the mouse->touch mapped listeners
  var mousedown = function(e) {
    isMouseDown = true;
    fireTouch('touchstart', e);
  }
  var mousemove = function(e) {
    if(!isMouseDown) return;
    fireTouch('touchmove', e);
  }
  var mouseup = function(e) {
    isMouseDown = false;
    fireTouch('touchend', e);
  }
  document.addEventListener('mousedown', mousedown, false);
  document.addEventListener('mouseup', mouseup, false);
  document.addEventListener('mousemove', mousemove, false);
  
  // old style handlers - only here to get around feature detection (comment if you need to)
  window['ontouchstart'] = mousedown;
  window['ontouchmove'] = mousemove;
  window['ontouchend'] = mouseup;
}
