'use strict';

navigator.mozSetMessageHandler('activity', req => {
  var source = req.source;
  var sourceData = source.data;
  var activityName = source.name;
  var dataType = sourceData.type;
  var url = sourceData.url || sourceData.URI;

  document.getElementById('activity-name').textContent = activityName;
  document.getElementById('activity-data-type').textContent = dataType;
  document.getElementById('activity-url').textContent = url;
});
