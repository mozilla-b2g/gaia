/* exported MockWindowMozWifiNetwork */

'use strict';

function MockWindowMozWifiNetwork(network) {
  for (var elem in network) {
    this[elem] = network[elem];
  }
}
