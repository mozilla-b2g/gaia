'use strict';

(function() {

  var done = document.getElementById('nav-done');
  done.addEventListener('click', e => {
    e.preventDefault();
    window.close();
  });

  var links = document.querySelectorAll('.external-link');
  Array.slice(links).forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      window.open(e.target.href, '', 'dialog');
    });
  });

}());
