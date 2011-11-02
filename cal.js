var mondays = Array(0, 31, 59, 90, 120, 151, 181, 212,
		    243, 273, 304, 334, 365);
var mondays_l = Array(0, 31, 60, 91, 121, 152, 182, 213,
		      244, 274, 305, 335, 366);

// Is it after the switching from Julian Calendar to Gregorian Calendar?
function gcswitch(y, m, d) {
    return (y > 1752) || (y == 1752 && (m > 9 || (m ==9 && d > 2)));
}

// Is it a leap year?
function isleap(y) {
    if(!gcswitch(y, 1, 1)) {
	return y % 4 == 0;
    } else {
	return (((y % 4) == 0) && ((y % 100) != 0)) || ((y % 400) == 0);
    }
}

// Get week day of a given date.
function get_day_of_week(y, m, d) {
    var nd;
    var im, id; /* internal representation */
    var ly;     /* last year */

    im = m - 1; /* 0 ~ 11 */
    id = d - 1; /* 0 ~ 30 */
    ly = y - 1; /* last year */
    nd = ly * 365 + Math.floor(ly / 4);
    if(gcswitch(y, m, d))
	nd = nd - 10 - Math.floor((ly - 1600) / 100) +
	    Math.floor((ly - 1600) / 400);
    if(!isleap(y))
	nd = nd + mondays[im] + id;
    else {
	nd = nd + mondays_l[im] + id;
    }
    return (nd + 6) % 7;
}

// Get how many days of a given month
function get_days_of_month(y, m) {
    var im = m - 1;		// internal month
    var _mondays = isleap(y)? mondays_l: mondays;
    
    return _mondays[im + 1] - _mondays[im];
}
