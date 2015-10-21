'use strict';

(function() {

  var done = document.getElementById('nav-done');
  done.addEventListener('click', e => {
    e.preventDefault();
    window.close();
  });

  var link = document.querySelector('.external-link');
  link.addEventListener('click', e => {
    e.preventDefault();
    window.open(e.target.href, '', 'dialog');
  });

}());
