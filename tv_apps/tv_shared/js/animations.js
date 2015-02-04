(function(exports) {
  'use strict';

  exports.Animations = {

    createCircleAnimation: function (container) {

      var winHalfWidth = window.innerWidth / 2;
      var winHeight = window.innerHeight;
      var finalSize = 2 * Math.ceil(Math.sqrt(winHalfWidth * winHalfWidth +
                                          winHeight * winHeight));

      /**
       * circleSize is the base size of circle element with any scaling.
       * It must be the same as width length in animation-circle css class.
       * Lower circleSize value can achieve better performance, but may have
       * bad resolution on circle border.
       * @type {Number}
       */
      const circleSize = 500;
      var scale = finalSize / circleSize;
      var isPlaying = false;
      var play = function (param, callback) {
        isPlaying = true;
        // initialize circle element scaling
        var circleElem = document.createElement('div');
        circleElem.className = 'animation-circle';
        param.type = param.type || 'grow';
        switch(param.type) {
          case 'shrink':
            circleElem.classList.add('shrink');
            circleElem.style.transform = 'scale(' + scale + ')';
            break;
          case 'grow':
            circleElem.classList.add('grow');
            circleElem.style.transform = 'scale(0)';
            break;
        }
        if (param.backgroundColor) {
          circleElem.style.backgroundColor = param.backgroundColor;
        }
        container.appendChild(circleElem);

        // force reflow the circle element style
        getComputedStyle(circleElem).width;

        // start transition
        switch(param.type) {
          case 'shrink':
            circleElem.style.transform = 'scale(0)';
            break;
          case 'grow':
            circleElem.style.transform = 'scale(' + scale + ')';
            break;
        }

        // remove the circle element
        circleElem.addEventListener('transitionend', function(evt) {
          if (evt.target === circleElem) {
            container.removeChild(circleElem);
            if (callback) {
              callback();
            }
            isPlaying = false;
          }
        });
      };

      return {
        play: play,
        isPlaying: function() {
          return isPlaying;
        }
      };
    }
  };
})(window);
