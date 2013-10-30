/*exported FixturePhones */

'use strict';
/**
 * Derived from
 * /dom/phonenumberutils/tests/test_phonenumber.xul
 *
 * isTestable: true|false
 *
 *    Fixtures marked isTestable: false are effectively
 *    placeholders that stand-in to show the correct
 *    behaviour in cases where
 *    navigator.mozPhoneNumberService.normalize is
 *    available (sufficient permissions required)
 *
 *
 * title: string
 *
 *    Description used for the suite title.
 *
 * values: array
 *
 *    Array of values that are tested by comparing
 *    each value to every other value.
 *
 */
var FixturePhones = [
  {
    // This is only tested where there are sufficient permissions
    // to use navigator.mozPhoneNumberService.normalize
    isTestable: !!navigator.mozPhoneNumberService.normalize,
    title: 'Non-Digit in Contact',
    values: [
      '1-800-BUY-A-CAR', '1 800 BUY A CAR', '1 (800) BUY A CAR',
      '+18002892227', '18002892227', '8002892227'
    ]
  },
  {
    isTestable: true,
    title: 'US',
    values: [
      '9995551234', '+19995551234', '(999) 555-1234',
      '1 (999) 555-1234', '+1 (999) 555-1234', '+1 999-555-1234'
    ]
  },
  {
    isTestable: true,
    title: 'DE',
    values: [
      '01149451491934', '49451491934', '451491934',
      '0451 491934', '+49 451 491934', '+49451491934'
    ]
  },
  {
    isTestable: true,
    title: 'IT',
    values: [
      '0577-555-555', '0577555555', '05 7755 5555', '+39 05 7755 5555'
    ]
  },
  {
    isTestable: true,
    title: 'ES',
    values: [
      '612123123', '612 12 31 23', '+34 612 12 31 23'
    ]
  },
  {
    isTestable: true,
    title: 'BR',
    values: [
      '01187654321', '0411187654321', '551187654321',
      '90411187654321', '+551187654321'
    ]
  },
  {
    isTestable: true,
    title: 'CL',
    values: [
      '0997654321', '997654321', '(99) 765 4321', '+56 99 765 4321'
    ]
  },
  {
    isTestable: true,
    title: 'CO',
    values: [
      '5712234567', '12234567', '(1) 2234567', '+57 1 2234567'
    ]
  },
  {
    isTestable: true,
    title: 'FR',
    values: [
      '0123456789', '+33123456789', '0033123456789',
      '01.23.45.67.89', '01 23 45 67 89', '01-23-45-67-89',
      '+33 1 23 45 67 89', '+33 (1) 23456789'
    ]
  }
];
