define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */
var debug = require('debug')('view:selftimer');
var View = require('vendor/view');
var find = require('lib/find');
/**
 * Exports
 */

module.exports = View.extend({
  name:'selftimer',
  /**
   * On capture click if timer is set
   * add show the timer
   **/
  addTimerUI:function(value){
    var divEle = document.createElement('div');
    divEle.id = 'timerDiv';
    divEle.classList.add('capturetimer');
    divEle.setAttribute('data-value',value.toString());
    var span = document.createElement('span');
    span.id = 'valueSpan';
    span.innerHTML = value;
    
    divEle.appendChild(span);
    document.body.appendChild(divEle);
    debug("self Timer");
  },
  /**
   * Update Left time 
   * In Timer
   **/
  updateTumerUI:function(value){
    var elem = find('#timerDiv', document);
    var span = find('#valueSpan',elem);
    span.innerHTML = value;
    elem.setAttribute('data-value',value.toString());
    if (value === 0){
      this.addLastTimeWrapper();
    }
  },
  /**
   * Once Timer finish remove timer
   **/
  removeTimerUI:function(){
    var elem = find('#timerDiv', this.elem);
    elem.innerHTML = '';
    elem.parentNode.removeChild(elem);
  },
  /**
   * Add the effect in timer before removing the timer
   **/
  addLastTimeWrapper:function(){
    var divEle = document.createElement('div');
    divEle.classList.add('captureDiv');
    document.body.appendChild(divEle);
    setTimeout(function(){
      divEle.parentNode.removeChild(divEle);
    },1000);
  }
  
});

});