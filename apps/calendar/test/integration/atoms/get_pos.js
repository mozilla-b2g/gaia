/**
 * Returns the absolute x,y of an element.
 *
 * { left: 10, top: 200 }
 */
return (function(element) {

  var left = 0;
  var top = 0;

  while ((element = element.offsetParent)) {
    left += element.offsetLeft;
    top += element.offsetTop;
  }

  return { left: left, top: top };

}.apply(this, arguments));
