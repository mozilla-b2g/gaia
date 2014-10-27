define(function(require, exports) {
  'use strict';

  // ---------------------------------------------------------
  // Constants

  exports.DAYS_STARTING_MONDAY = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
    'saturday', 'sunday'];

  exports.DAYS_STARTING_SUNDAY = [
    'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
    'saturday'];

  exports.DAY_STRING_TO_L10N_ID = {
    'sunday': 'weekday-0-short',
    'monday': 'weekday-1-short',
    'tuesday': 'weekday-2-short',
    'wednesday': 'weekday-3-short',
    'thursday': 'weekday-4-short',
    'friday': 'weekday-5-short',
    'saturday': 'weekday-6-short'
  };

});
