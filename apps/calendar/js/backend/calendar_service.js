'use strict';
importScripts('../ext/alameda.js');

require.config({
  baseUrl: '/js/backend',
  paths: {
    ext: '/js/ext'
  }
});

require(['ext/threads'], threads => {
  var service = threads.service('calendar');

  service.method('start', () => {
    // TODO
    console.log('start');
  });

  service.method('accounts/create', details => {
    // TODO
    console.log('accounts/create', details);
  });

  service.method('accounts/update', details => {
    // TODO
    console.log('accounts/update', details);
  });

  service.method('accounts/remove', account => {
    // TODO
    console.log('accounts/remove', account);
  });

  service.method('accounts/sync', account => {
    // TODO
    console.log('accounts/sync', account);
  });

  service.method('events/create', (calendarId, details) => {
    // TODO
    console.log('events/create', calendarId, details);
  });

  service.method('events/update', event => {
    // TODO
    console.log('events/update', event);
  });

  service.method('events/remove', event => {
    // TODO
    console.log('events/remove', event);
  });

  service.method('settings/set', (start, end) => {
    // TODO
    console.log('settings/set', start, end);
  });

  service.stream('accounts/list', stream => {
    // TODO
    console.log('accounts/list', stream);
  });

  service.stream('accounts/get', (stream, id) => {
    // TODO
    console.log('accounts/get', stream, id);
  });

  service.stream('calendars/list', stream => {
    // TODO
    console.log('calendars/list', stream);
  });

  service.stream('events/get', (stream, id) => {
    // TODO
    console.log('events/get', stream, id);
  });

  service.stream('busytimes/list', (stream, day) => {
    // TODO
    console.log('busytimes/list', stream, day);
  });

  service.stream('settings/get', (stream, key) => {
    // TODO
    console.log('settings/set', stream, key);
  });
});
