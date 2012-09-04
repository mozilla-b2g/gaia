/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/*
*  Mouse2Touch is a shim that listens to MouseEvent but passes
*  fake TouchEvent object to touch event handler
*
*  XXX: remove this if we are not going to support testing on
*  non-touch devices, e.g. B2G Desktop, Nightly, or,
*  make the creation of this object optional if we can reliably detect
*  touch support by evaluate (document instanceof DocumentTouch)
*
*/
var Mouse2Touch = (function m2t() {
  var Mouse2TouchEvent = {
   'mousedown': 'touchstart',
   'mousemove': 'touchmove',
   'mouseup': 'touchend'
  };

  var Touch2MouseEvent = {
   'touchstart': 'mousedown',
   'touchmove': 'mousemove',
   'touchend': 'mouseup'
  };

  var ForceOnWindow = {
   'touchmove': true,
   'touchend': true
  };

  var addEventHandler = function m2t_addEventHandlers(target,
                                                      name,
                                                      listener) {
   target = ForceOnWindow[name] ? window : target;
   name = Touch2MouseEvent[name] || name;
   target.addEventListener(name, {
     handleEvent: function m2t_handleEvent(evt) {
       if (Mouse2TouchEvent[evt.type]) {
         var original = evt;
         evt = {
           type: Mouse2TouchEvent[original.type],
           target: original.target,
           touches: [original],
           preventDefault: function() {
             original.preventDefault();
           }
         };
         evt.changedTouches = evt.touches;
       }
       return listener.handleEvent(evt);
     }
   }, true);
  };

  var removeEventHandler = function m2t_removeEventHandler(target,
                                                           name,
                                                           listener) {
   target = ForceOnWindow[name] ? window : target;
   name = Touch2MouseEvent[name] || name;
   target.removeEventListener(name, listener);
  };

  return {
    addEventHandler: addEventHandler,
    removeEventHandler: removeEventHandler
  };
})();
