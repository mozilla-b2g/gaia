/* global pref */

// This pref is only for firefox tests which contain web components and
// debugging/testing portions of gaia in firefox nightly. We can remove this
// pref once webcomponents are ready for the entire web (and not just certified
// apps seee bug 1000199)
pref('dom.webcomponents.enabled', true);

pref('devtools.serviceWorkers.testing.enabled', true);
pref('devtools.webconsole.filter.serviceworkers', true);
pref('dom.serviceWorkers.enabled', true);

