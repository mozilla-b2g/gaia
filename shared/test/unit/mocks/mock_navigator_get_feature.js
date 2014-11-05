'use strict';
/* global Promise */
window.MockNavigatorGetFeature = function(key) {
  return new Promise((resolve, reject) => {
    resolve(window.MockNavigatorGetFeature._values[key]);
  });
};

window.MockNavigatorGetFeature._values = {};
