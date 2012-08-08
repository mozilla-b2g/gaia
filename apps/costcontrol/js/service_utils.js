'use strict';

var SERVICE_NAME = 'CostControl';
var SERVICE_BACKGROUND_NAME = 'BGW';

function getService() {
  console.log('service');
  return window.open(
    '/background.html#0',
    SERVICE_BACKGROUND_NAME,
    'background'
  )[SERVICE_NAME];
}
