/* global
  Defer,
  Main
*/

(function(exports) {
  'use strict';

  var stack = [Main.prepareForDisplay()];

  exports.Navigation = {
    waitForTransition() {
      var defer = new Defer();

      var count = 2;
      document.body.addEventListener('transitionend', function onTransition(e) {
        if (!e.target.classList.contains('panel')) {
          return;
        }

        if (--count) {
          return;
        }

        document.body.removeEventListener('transitionend', onTransition);
        defer.resolve();
      });

      return defer.promise;
    },

    push: function(panel) {
      return Promise.resolve(panel).then((panel) => {
        stack[stack.length - 1].classList.add('back');
        panel.classList.remove('next');
        stack.push(panel);

        return this.waitForTransition();
      });
    },

    pop: function() {
      var toPop = stack.pop();
      toPop.classList.add('next');
      var toDisplay = stack[stack.length - 1];
      toDisplay.classList.remove('back');

      return this.waitForTransition().then(() => {
        toPop.dispatchEvent(new CustomEvent('Navigation:pop'));
        toDisplay.dispatchEvent(new CustomEvent('Navigation:display'));
      });
    },

    popToRoot: function() {
      if (stack.length == 1) {
        return Promise.resolve();
      }

      return this.pop().then(() => {
        return this.popToRoot();
      });
    }
  };
})(window);
