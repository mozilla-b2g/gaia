/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
 /* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

const TRANSITION_PROPERTY = 'MozTransition',
  TRANSFORM_MAP = {
    translatex: 'px',
    translatey: 'px',
    translate: 'px',
    scale: '',
    rotate: 'deg',
    skew: 'deg',
    skewx: 'deg',
    skewy: 'deg'
  },
  PROPERTIES_MAP = {
    transform: '-moz-transform',
    transformOrigin: '-moz-transform-origin'
  },
  R_CAMEL_TO_CSS = /([A-Z])(?=[a-z])/g,
  DEFAULT_TRANSITION_DURATION = 300,
  DEFAULT_TRANSITION_FUNCTION = 'linear',
  DEFAULT_TRANSITION_DELAY = 0;



var Transition = function(params, duration, timing, delay) {

  var stack = this.stack = [];

  params || (params = []);

  params.forEach(function(key) {
    stack.push([
      key.replace(R_CAMEL_TO_CSS, function(str, w) {
        return '-' + w.toLowerCase();
      }),
      (duration || DEFAULT_TRANSITION_DURATION) + 'ms',
      (timing || DEFAULT_TRANSITION_FUNCTION),
      (delay || DEFAULT_TRANSITION_DELAY) + 'ms'
    ].join(' '));
  });

};

Transition.stop = function(element) {
  element.style[TRANSITION_PROPERTY] = 'null';
};
Transition.run = function(elem, props, params, callback) {
  var transition = [],
    style = elem.style;

  if (typeof params === 'function') {
    callback = params;
    params = {};
  }

  params || (params = {});

  Object.keys(props).forEach(function(key) {
    transition.push(key);
    style[key] = props[key];
  });

  elem.addEventListener('transitionend', function transitionListener(e) {
    if (e.eventPhase !== e.AT_TARGET) return;

    elem.removeEventListener('transitionend', transitionListener, true);
    callback && callback.call(this, e);
    style.MozTransition = '';

  }, true);

  style.MozTransition = new Transition(
    transition, params.duration, params.timing, params.delay);

};

Transition.prototype = {
  toString: function() {
    return this.stack.join(', ');
  }/*,
  start: function(element){
    if(element.style){
      let style = element.style,
        properties = this.properties,
        callback = this.callback;
      element.addEventListener('transitionend', function(e){
        if(e.eventPhase === e.AT_TARGET){
          element[TRANSITION_PROPERTY] = '';
          callback && callback.call(element, e);
        }
      }, true);
      style[TRANSITION_PROPERTY] = this.stack.join(', ');
      Object.keys(this.properties).forEach(function(prop){
        if(properties[prop]){
          style.setProperty(prop, properties[prop]);
        }else{
          style.removeProperty(prop);
        }

      });
    }
  }*/
};

var Transform = function(map) {
  var stack = this.stack = [];

  Object.keys(map).forEach(function(name) {
    stack
      .push(name + '(' + (map[name] + '')
      .replace(/\s*(,)|$\s*/g, TRANSFORM_MAP[name.toLowerCase()] + '$1') + ')');
  });

};
Transform.translate = function(x, y) {
  return [
    'translate(',
    x || 0,
    'px,',
    y || 0,
    ')'
  ].join('');
};

['translate', 'rotate', 'scale'].forEach(function(key) {
  Transform.prototype[key] = function() {
    this.stack.push(Transform[key].apply(null, arguments));
    return this;
  }
});

Transform.prototype.toString = function() {
  return this.stack.join(' ');
};
