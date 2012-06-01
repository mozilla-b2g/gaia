/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*
  This file defines Date API
    * relative date
*/

'use strict';

const SECOND = 1000,
  MINUTE = 60 * SECOND,
  HOUR = 60 * MINUTE,
  DAY = 24 * HOUR,
  WEEK = 7 * DAY,

  MONTHS = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december'
  ];

var DateAPI = function(date) {

};


// https://wiki.mozilla.org/Gaia/Design/Patterns#Chronological_Lists
// Relative date pattern

DateAPI.getRelativeSince = function getRelativeSince(from) {

  if (!(from instanceof Date)) return null;

  let result = {},
    now = new Date;

  let diff = now - from,
    tmp;

  result.case = 'format';

  result.month = MONTHS[from.getMonth()];

  if (now.getFullYear() !== from.getFullYear()) {
    result.year = from.getFullYear() - 1970;
    result.format = 'year';
  } else if(now.getDate() === from.getDate() 
    && now.getMonth() === from.getMonth()) {
    result.time = true;
    result.format = 'time';
  } else if (now.getDate() - 1 === from.getDate()
    && now.getMonth() === from.getMonth()
    || now.getDate() === 1 
    && now.getMonth() - 1 === from.getMonth()) {
    result.case = 'yesterday';
  } else if (diff < WEEK) {
    result.case = 'days';
    result.days = Math.floor(diff / DAY);
  } else if (((tmp = Math.floor(diff / WEEK)) <= 4)) {
    result.case = 'weeks';
    result.weeks = tmp;
  } else {
    result.date = form.getDate();
    result.format = 'date';
  };

  return result;

};
