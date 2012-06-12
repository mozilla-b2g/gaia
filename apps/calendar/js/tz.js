/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

(function() {
  // http://www.usno.navy.mil/USNO/astronomical-applications/astronomical-information-center/julian-date-form
  function GregorianToJulian(date) {
    var year = date.getYear();
    if (year < 1000)
      year += 1900;
    var month = date.getMonth() + 1;
    var day = date.getDate();
    var hour = date.getHours();
    var min = date.getMinutes();
    var sec = date.getSeconds();
    var UT = hour + (min / 60) + (sec / 3600);
    var sign = ((100 * year + month - 190002.5) >= 0) ? 1 : -1;
    return (367 * year) -
      (Math.floor((7 * (year + Math.floor((month + 9) / 12))) / 4)) +
      (day + Math.floor((275 * month) / 9)) +
      (1721013.5 + (UT / 24)) -
      (0.5 * sign) +
      0.5;
  }

  function JulianToGregorian(julian) {
    var X = julian + 0.5;
    var Z = Math.floor(X);
    var F = X - Z;
    var Y = Math.floor((Z - 1867216.25) / 36524.25);
    var A = Z + 1 + Y - Math.floor(Y / 4);
    var B = A + 1524;
    var C = Math.floor((B - 122.1) / 365.25);
    var D = Math.floor(365.25 * C);
    var G = Math.floor((B - D) / 30.6001);
    var month = (G < 13.5) ? (G - 1) : (G - 13);
    var year = (month < 2.5) ? (C - 4715) : (C - 4716);
    month -= 1;
    var UT = B - D - Math.floor(30.6001 * G) + F;
    var day = Math.floor(UT);
    UT -= Math.floor(UT);
    UT *= 24;
    var hour = Math.floor(UT);
    UT -= Math.floor(UT);
    UT *= 60;
    var min = Math.floor(UT);
    UT -= Math.floor(UT);
    UT *= 60;
    var sec = Math.round(UT);
    return new Date(Date.UTC(year, month, day, hour, min, sec));
  }
})();
