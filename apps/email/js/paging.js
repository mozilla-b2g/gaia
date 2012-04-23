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
    page.classList.remove('hidden');
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
      page.classList.add('hidden');
    }

  },
  moveToPage: function(page) {
    if (!page) return false;

    var data = this.pages.get(page),
      stack = this.navigationStack,
      self = this;

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
          current.classList.add('hidden');
        });
      };
    };

    {
      stack.push(page)
      Transition.stop(page);
      page.style.MozTranstion = '';
      page.style.MozTransform = Transform.translate(window.innerWidth);
      page.classList.remove('hidden');
      if (data && data.push) {
        data.push.call(page);
      }

      window.addEventListener('MozAfterPaint', function afterPaint() {
        window.removeEventListener('MozAfterPaint', afterPaint);
        moveCurrent();
        Transition.run(page, {
         MozTransform: ''
        }, {
          duration: PAGING_TRANSITION
        });
      });

    }
  },
  toPreviousPage: function() {
    var stack = this.navigationStack,
      current = stack.pop(),
      self = this;

    if (current) {
      let prev = stack[stack.length - 1];

      Transition.stop(current);
      if (prev) {
        let data = self.pages.get(prev);

        Transition.stop(prev);

        prev.style.MozTransform = Transform.translate(-window.innerWidth);
        prev.classList.remove('hidden');

        if (data && data.push) {
          data.push.call(prev);
        }

        window.addEventListener('MozAfterPaint', function afterPaint() {
          window.removeEventListener('MozAfterPaint', afterPaint);
          Transition.run(prev, {
            MozTransform: ''
          }, {
            duration: PAGING_TRANSITION
          });
        });

      }

      window.addEventListener('MozAfterPaint', function afterPaint() {
        window.removeEventListener('MozAfterPaint', afterPaint);
        Transition.run(current, {
          MozTransform: Transform.translate(window.innerWidth)
        }, {
          duration: PAGING_TRANSITION
        }, function() {
          var data = self.pages.get(current);
          if (data && data.pop) {
            data.pop.call(current);
          }
          current.classList.add('hidden');
        });
      });
    }
  }
};