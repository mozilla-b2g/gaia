/* exported MockTzSelect */
'use strict';

var MockTzSelect = function tzSelect(regionSelector,
                                     citySelector,
                                     onchange,
                                     onload)  {
  var timezone = {
    id: 'Fake ID',
    region: 'Fake Region',
    city: 'Fake City',
    cc: 'Fake CC',
    utcOffset: '+0:00',
    dstOffset: '+0:00'
  };

  onchange(timezone);
  onload(timezone);
};
