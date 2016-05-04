/* exported MockMozWifiNetwork */

'use strict';

function MockMozWifiNetwork(network) {
  for (var elem in network) {
    this[elem] = network[elem];
  }
}
