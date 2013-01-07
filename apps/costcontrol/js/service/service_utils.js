'use strict';

// This utility library has been developed to support the building of
// client-service web applications for Gecko and Chrome [1] & [2].
//
// The library eases the coordination between requesting the service instance
// and initialization of the service itseltf. You should do:
//
// SERVICE PART:
// 1- Include service_utils.js in the SERVICE
// 2- Configure SERVICE_NAME, SERVICE_BACKGROUND_NAME and ENTRY_POINT.
// 3- Create your service object and pass it to setService() function
// 4- Set up / initialize the service object, the call nowIAmReady() function
//
// CLIENT PART:
// 1- Include service_utils.js in the SERVICE
// 2- Call getService() function when you need the service.
//
// NOTE: If service is not available when calling getService(), null wil be
// returned. You can provide a callback to the getService() function. This
// callback will be called when the service is set up.
//
// [1] https://developers.google.com/chrome/apps/docs/background
// [2] https://developer.mozilla.org/en-US/docs/DOM/window.open

// Adjust depending on your needs
var SERVICE_NAME = 'CostControl';
var SERVICE_BACKGROUND_NAME = 'BGW';
var ENTRY_POINT = '/service.html#0';

// Call only from the client!
//
// If the service is ready, returns the service and ignores the callback.
// If not, it returns null but if the service is properly configured
// (it calls nowIAmReady() when initialized), then the passed callback is
// called.
function getService(readyCallback) {
  // Retrieve the service frame
  var serviceFrame = window.open(
    ENTRY_POINT,
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
  return null;
}

// Call only from the service!
//
// Set the service. It does not mean the service has been fully initialized.
// When so, please call nowIAmReady()
function setService(service) {
  window[SERVICE_NAME] = service;
}

// Call only from the service!
//
// Indicates the service is ready dispatching a custom event 'serviceready' to
// all windows trying to get the service.
function nowIAmReady() {
  window.serviceReady = true;
  if (Array.isArray(window.waitingForService)) {
    for (var i = 0, otherWindow;
      otherWindow = window.waitingForService[i]; i++) {

      otherWindow.dispatchEvent(new CustomEvent('serviceready', {
        detail: { service: window[SERVICE_NAME] }
      }));
    }
  }
}
