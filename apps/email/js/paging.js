/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';


const PAGING_TRANSITION = 300;

var Paging = function Paging(page) {
  this.navigationStack = [];

  if (page) {
    this.navigationStack.push(page);
    page.hidden = false;
  }
};

Paging.prototype = {
  moveToPage: function(page) {
    if (!page || this.moving) return false;

    var stack = this.navigationStack,
      self = this;

    this.moving = true;

    if (stack.length) {
      let current = stack[stack.length - 1];
      var moveCurrent = function() {
        Transition.stop(current);
        Transition.run(current, {
          MozTransform: Transform.translate(-window.innerWidth)
        }, {
          duration: PAGING_TRANSITION
        }, function() {
          var e = new CustomEvent('poppage');
          current.dispatchEvent(e);
          current.hidden = true;
        });
      };
    };

    {

      window.addEventListener('MozAfterPaint', function afterPaint(e) {

        window.removeEventListener('MozAfterPaint', afterPaint);
        moveCurrent && moveCurrent();
        Transition.run(page, {
         MozTransform: 'translate(0)'
        }, {
          duration: PAGING_TRANSITION
        }, function() {
          self.moving = false;
        });

      });

      stack.push(page)
      Transition.stop(page);
      page.style.MozTranstion = '';
      page.style.MozTransform = Transform.translate(window.innerWidth);
      page.hidden = false;
      let e = new CustomEvent('pushpage');
      page.dispatchEvent(e);

    }
  },
  toPreviousPage: function() {
    var stack = this.navigationStack,
      self = this;

    if (stack.length > 1 && !self.moving) {
      let current = stack.pop(),
        prev = stack[stack.length - 1];

      Transition.stop(current);

      self.moving = true;


      window.addEventListener('MozAfterPaint', function afterPrev(e) {

        window.removeEventListener('MozAfterPaint', afterPrev);
        Transition.run(prev, {
          MozTransform: ''
        }, {
          duration: PAGING_TRANSITION
        }, function() {
          self.moving = false;
        });

      });

      Transition.stop(prev);

      prev.style.MozTransform = Transform.translate(-window.innerWidth);
      prev.hidden = false;

      let e = new CustomEvent('pushpage');
      prev.dispatchEvent(e);

      window.addEventListener('MozAfterPaint', function afterCurrent() {
        window.removeEventListener('MozAfterPaint', afterCurrent);
        Transition.run(current, {
          MozTransform: Transform.translate(window.innerWidth)
        }, {
          duration: PAGING_TRANSITION
        }, function() {
          var e = new CustomEvent('poppage');
          current.dispatchEvent(e);
          current.hidden = true;
        });
      });
    }
  }
};