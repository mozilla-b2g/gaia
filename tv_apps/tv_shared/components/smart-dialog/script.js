'use strict';

window.SmartDialog = (function(win) {

  // Extend from the HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  /**
   * gernerate bezier curve with corresponding parameters
   * @param {[Object]} bezier curve parameters (p1, p2, p3, p4)
   */
  win.GenerateBezierCurve = function(bezierParam) {
    var p1 = bezierParam.p1 || 0;
    var p2 = bezierParam.p2 || 0;
    var p3 = bezierParam.p3 || 0;
    var p4 = bezierParam.p4 || 0;
    var a1 = 3.0 * p1;
    var b1 = 3.0 * (p3 - p1) - a1;
    var c1 = 1.0 - a1 - b1;
    var a2 = 3.0 * p2;
    var b2 = 3.0 * (p4 - p2) - a2;
    var c2 = 1.0 - a2 - b2;

    var curveX = function(t) {
      return ((c1 * t + b1) * t + a1) * t;
    };

    var curveY = function(t) {
      return ((c2 * t + b2) * t + a2) * t;
    };

    var calculateCurve = function(x, epsilon) {
      var t0;
      var t1;
      var t2;
      var x2;
       
      t0 = 0.0;
      t1 = 1.0;
      t2 = x;
       
      if (t2 < t0) {
        return t0;
      }
      if (t2 > t1) {
        return t1;
      }
       
      while (t0 < t1) {
        x2 = curveX(t2);
        if (Math.abs(x2 - x) < epsilon) {
          return t2;
        }
        if (x > x2) {
          t0 = t2;
        } else {
          t1 = t2;
        }
        t2 = (t1 - t0) * 0.5 + t0;
      }
       
      return t2;
    };
     
    return function(x) {
      return curveY(calculateCurve(x, 0.001));
    };
  };

  proto.circleAnimation = function(element, duration, bezierParam, callback) {

    var winHalfWidth = window.innerWidth / 2;
    var winHeight = window.innerHeight;
    var finalSize = Math.sqrt((winHalfWidth * winHalfWidth +
                               winHeight * winHeight));

    // create svg element
    var svgEle = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    var existingSvg = document.getElementById((element.id || 'smart-dialog') +
                                               '-svg');
    if (existingSvg) {
      document.body.removeChild(existingSvg);
    }
    svgEle.setAttribute('id', element.id + '-svg');
    svgEle.setAttribute('width', 0);
    svgEle.setAttribute('height', 0);

    // create clipPath element with clip-path id
    var clipPathEle = document.createElementNS('http://www.w3.org/2000/svg',
                                               'clipPath');
    clipPathEle.setAttribute('id', element.id + '-clipCircle');

    // create circle element as the shape of element border
    var circleEle = document.createElementNS('http://www.w3.org/2000/svg',
                                             'circle');
    circleEle.setAttribute('cx', winHalfWidth);
    circleEle.setAttribute('cy', winHeight);

    // set element clip-path style
    element.style.clipPath = 'url(\"#' + element.id + '-clipCircle\")';
    element.style.transitionProperty = 'none';

    clipPathEle.appendChild(circleEle);
    svgEle.appendChild(clipPathEle);
    document.body.appendChild(svgEle);

    // animation
    var resizeAnimation = function(type) {
      var startTime;
      /* global GenerateBezierCurve */
      var bezierFunc = GenerateBezierCurve(bezierParam);
      var step = function(time) {
        if (!startTime) {
          startTime = time;
        }
        
        var progress = (time - startTime) / duration;
        switch(type) {
          case 'grow':
            circleEle.setAttribute('r', finalSize * bezierFunc(progress));
            break;
          case 'shrink':
            circleEle.setAttribute('r', finalSize *
                                        (1 - bezierFunc(progress)));
            break;
        }

        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
          if (callback) {
            callback();
          }
          // remove properties we added
          document.body.removeChild(svgEle);
          element.style.clipPath = '';
        }
      };

      // start animation
      window.requestAnimationFrame(step);
    };

    return {
      grow: function() {
        circleEle.setAttribute('r', 0);
        resizeAnimation('grow');
      },
      shrink: function() {
        circleEle.setAttribute('r', finalSize);
        resizeAnimation('shrink');
      }
    };
  };

  proto.fireEvent = function(event, detail) {
    var evtObject = new CustomEvent(event, {
                                      bubbles: false,
                                      detail: detail || this
                                    });
    this.dispatchEvent(evtObject);
  };

  proto.open = function(duration, bezierParam, callback) {
    if (this.children.length > 1) {
      throw 'Smart Dialog can only have one child node';
    }
    this.fireEvent('will-open');
    this.circleAnimation(this.children[0], duration, bezierParam, callback)
                        .grow();
  };

  proto.close = function(duration, bezierParam, callback) {
    if (this.children.length > 1) {
      throw 'Smart Dialog can only have one child node';
    }
    this.fireEvent('will-close');
    this.circleAnimation(this.children[0], duration, bezierParam, callback)
                        .shrink();
  };

  // Register and return the constructor
  return document.registerElement('smart-dialog', { prototype: proto });
})(window);
