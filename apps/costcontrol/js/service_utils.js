'use strict';

var SERVICE_NAME = 'CostControl';
var SERVICE_BACKGROUND_NAME = 'BGW';

// Call only from the client!
// If the service is ready, returns the service and ignores the callback.
// If not, it returns null but if the service is properly configured
// (it calls nowIAmReady() when initialized), then the passed callback is
// called.
function getService(readyCallback) {
  // Retrieve the service frame
  var serviceFrame = window.open(
    '/background.html#0',
    SERVICE_BACKGROUND_NAME,
    'background'
  );

  // Check if the service is ready, if so return the service
  if (SERVICE_NAME in serviceFrame && serviceFrame.serviceReady)
    return serviceFrame[SERVICE_NAME];

  // If not, add the window to those waiting for ready
  if (serviceFrame.waitingForService)
    serviceFrame.waitingForService.push(window);
  else
    serviceFrame.waitingForService = [window];

  window.addEventListener('serviceready', readyCallback);
}

// Call only from the service!
// Set the service. It does not mean the service has been fully initialized.
// When so, please call nowIAmReady()
function setService(service) {
  window[SERVICE_NAME] = service;
}

// Call only from the service!
// Indicates the service is ready dispatching a custom event 'serviceready' to
// all windows trying to get the service.
function nowIAmReady() {
  window.serviceReady = true;
  console.log(window.waitingForService.length + '');
  if (Array.isArray(window.waitingForService)) {
    for (var i = 0, otherWindow;
      otherWindow = window.waitingForService[i]; i++) {

      otherWindow.dispatchEvent(new CustomEvent('serviceready', {
        detail: { service: window[SERVICE_NAME] }
      }));
    }
  }
}
