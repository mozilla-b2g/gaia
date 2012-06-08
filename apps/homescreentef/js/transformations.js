/*
 *  Module: Transformations for HTMLElement
 *
 *  Product: Open Web Device
 *
 *  Copyright(c) 2012 Telefónica I+D S.A.U.
 *
 *  LICENSE: Apache 2.0
 *
 *  @author José M. Cantera (jmcf@tid.es)
 *
 *
 * @example (translation)
 *
 *  element.translate(10px,10px);
 *
 *  @example (rotation)
 *
 *  element.rotate()
 *
 *
*/
HTMLElement.prototype.translate = function(x,y,absolute) {
  function getRule(x,y) {
     var rule = '';

    if(y === 0) {
      rule = 'translateX' + '(' + x + 'px' + ')';
    }
    else {
          rule = 'translate(' + x + 'px' + ',' + y + 'px' + ') ';
    }

    return rule;
  }

  if(absolute && absolute === true) {
    this.style.MozTransform = getRule(x,y);
  }
  else {
        this.style.MozTransform += getRule(x,y);
  }
}


/**
 *   Resets all transformations over an element
 *
 */
HTMLElement.prototype.transReset = function() {
  this.style.MozTransform = 'none';
}
