'use strict';

document.querySelector('#open-popup').addEventListener('click', () => {
  window.open('popup.html', '', 'dialog');
});

Array.from(document.querySelectorAll('.change-theme')).forEach(
    el => el.addEventListener('click', evt => {
    document.querySelector('meta[name="theme-color"]')
      .setAttribute('content', evt.target.dataset.color);
  }));
