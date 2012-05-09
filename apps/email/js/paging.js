/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';


const PAGING_TRANSITION = 300;

var Paging = function Paging(page, data) {
  this.pages = new Map();
  this.navigationStack = [];

  if (page) {
    this.registerPage(page, data);
    this.navigationStack.push(page);
    page.hidden = false;
  }
};

Paging.prototype = {
  registerPage: function(page, data) {
    //{
    // push: function(){},
    // pop: function(){}
    //}

    if (page && !this.pages.has(page)) {
      this.pages.set(page, data || {});
      page.hidden = true;
    }

  },
  moveToPage: function(page) {
    if (!page || this.moving) return false;

    var data = this.pages.get(page),
      stack = this.navigationStack,
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
          var data = self.pages.get(current);
          if (data && data.pop) {
            data.pop.call(current);
          }
          current.hidden = true;
        });
      };
    };

    {

      window.addEventListener('MozAfterPaint', function afterPaint(e) {

        console.log(stack.length + ' current');

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
      if (data && data.push) {
        data.push.call(page);
      }

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

        console.log(stack.length + ' prev');

        //if (e.target === prev) {
          window.removeEventListener('MozAfterPaint', afterPrev);
          Transition.run(prev, {
            MozTransform: ''
          }, {
            duration: PAGING_TRANSITION
          }, function() {
            self.moving = false;
          });
        //}
      });

      let data = self.pages.get(prev);

      Transition.stop(prev);

      prev.style.MozTransform = Transform.translate(-window.innerWidth);
      prev.hidden = false;

      if (data && data.push) {
        data.push.call(prev);
      }

      window.addEventListener('MozAfterPaint', function afterCurrent() {
        window.removeEventListener('MozAfterPaint', afterCurrent);
        Transition.run(current, {
          MozTransform: Transform.translate(window.innerWidth)
        }, {
          duration: PAGING_TRANSITION
        }, function() {
          var data = self.pages.get(current);
          if (data && data.pop) {
            data.pop.call(current);
          }
          current.hidden = true;
        });
      });
    }
  }
};