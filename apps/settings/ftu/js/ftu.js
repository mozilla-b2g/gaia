
'use strict';

window.addEventListener('load', function onFTUload() {
  gWifiManager.setEnabled(true);

  var settings = window.navigator.mozSettings;
  if (!settings)
    return;
  settings.createLock().set({ 'wifi.enabled': true });
});

function onTimeChanged(evt) {
  var value = evt.target.value;
  var linkedElement = evt.target.nextElementSibling.lastElementChild;
  linkedElement.textContent = value;

  if (navigator.mozTime) {
    var future = new Date();
    future.setHours(parseInt(value.split(':')[0]));
    future.setMinutes(parseInt(value.split(':')[1]));
    future.setSeconds(0);
    navigator.mozTime.set(future);
  }
}

function onDateChanged(evt) {
  var value = evt.target.value;
  var linkedElement = evt.target.nextElementSibling.lastElementChild;
  linkedElement.textContent = value;

  if (navigator.mozTime) {
    var future = new Date();
    // XXX Once the input type="date" lands (pull 4919), this code
    // should really do something.
    future.setFullYear(2012);
    future.setMonth(9);
    future.setDay(23);
    navigator.mozTime.set(future);
  }
}

function onTimeZoneChanged(evt) {
  var value = evt.target.value;
  var linkedElement = evt.target.nextElementSibling.lastElementChild;
  linkedElement.textContent = value;

  navigator.mozSettings.set('time.timezone', value);
}

window.addEventListener('animationend', function(evt) {
  if (evt.target === document.querySelector('#root img:nth-child(4)')) {
    var rootSection = document.querySelector('#root');
    rootSection.classList.add('show');

    var buttons = document.getElementById('navigation-buttons');
    buttons.classList.add('show');
  }
});

window.addEventListener('hashchange', function(evt) {
  var back = document.getElementById('back');
  var next = document.getElementById('next');

  switch (document.location.hash) {
    case '#root':
      back.dataset.target = '';
      next.dataset.target = 'wifi';
      break;
    case '#wifi':
      back.dataset.target = 'root';
      next.dataset.target = 'datetime';
      break;
    case '#datetime':
      back.dataset.target = 'wifi';
      next.dataset.target = 'contacts';
      break;
    case '#contacts':
      back.dataset.target = 'datetime';
      next.dataset.target = 'privacy';
      break;
    case '#privacy':
      back.dataset.target = 'contacts';
      next.dataset.target = 'privacy2';
      break;
    case '#privacy2':
      back.dataset.target = 'privacy';
      next.dataset.target = 'end';
      break;
    case '#end':
      back.dataset.target = '';
      next.dataset.target = '';
      break;
  }
});
