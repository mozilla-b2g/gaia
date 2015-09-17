pref('browser.manifestURL', "app://system.gaiamobile.org/manifest.webapp");
pref('b2g.system_manifest_url', "app://system.gaiamobile.org/manifest.webapp");
pref('b2g.neterror.url', "app://system.gaiamobile.org/net_error.html");
pref('browser.homescreenURL', "app://system.gaiamobile.org/index.html");
pref('b2g.system_startup_url', "app://system.gaiamobile.org/index.html");
pref('network.http.max-connections-per-server', 15);
pref('dom.mozInputMethod.enabled', true);
pref('layout.css.sticky.enabled', true);
pref('intl.uidirection.qps-plocm', "rtl");
pref('dom.webcomponents.enabled', true);
pref('ril.debugging.enabled', false);
pref('dom.mms.version', 17);
pref('b2g.wifi.allow_unsafe_wpa_eap', true);
pref('network.dns.localDomains', "gaiamobile.org,email.gaiamobile.org,gallery.gaiamobile.org,search.gaiamobile.org,video.gaiamobile.org,music.gaiamobile.org,fl.gaiamobile.org,collection.gaiamobile.org,ftu.gaiamobile.org,wappush.gaiamobile.org,communications.gaiamobile.org,camera.gaiamobile.org,fm.gaiamobile.org,bluetooth.gaiamobile.org,marketplace.firefox.com.gaiamobile.org,sms.gaiamobile.org,findmydevice.gaiamobile.org,verticalhome.gaiamobile.org,sharedtest.gaiamobile.org,keyboard.gaiamobile.org,browser.gaiamobile.org,wallpaper.gaiamobile.org,emergency-call.gaiamobile.org,costcontrol.gaiamobile.org,bookmark.gaiamobile.org,settings.gaiamobile.org,operatorvariant.gaiamobile.org,clock.gaiamobile.org,system.gaiamobile.org,callscreen.gaiamobile.org,homescreen.gaiamobile.org,pdfjs.gaiamobile.org,calendar.gaiamobile.org,ringtones.gaiamobile.org,feedback.gaiamobile.org,sheet-app-1.gaiamobile.org,uitest.gaiamobile.org,test-container.gaiamobile.org,contacts-manager.gaiamobile.org,test-sensors.gaiamobile.org,test-receiver-2.gaiamobile.org,test-otasp.gaiamobile.org,contacts-ds-provider2.gaiamobile.org,marketplace-dev.allizom.org.gaiamobile.org,template.gaiamobile.org,test-ime.gaiamobile.org,demo-keyboard.gaiamobile.org,test-fxa-client.gaiamobile.org,test-receiver-1.gaiamobile.org,music2.gaiamobile.org,marketplace.allizom.org.gaiamobile.org,test-findmydevice.gaiamobile.org,ds-test.gaiamobile.org,sheet-app-3.gaiamobile.org,test-iac-subscriber.gaiamobile.org,image-uploader.gaiamobile.org,test-iac-publisher.gaiamobile.org,homescreen-stingray.gaiamobile.org,uitest-privileged.gaiamobile.org,test-agent.gaiamobile.org,test-keyboard-app.gaiamobile.org,test-receiver-inline.gaiamobile.org,bookmarks-reader.gaiamobile.org,sheet-app-2.gaiamobile.org,in_app_pay_test.gaiamobile.org,share-receiver.gaiamobile.org,contacts-ds-provider1.gaiamobile.org,mochitest.gaiamobile.org,testpermission.gaiamobile.org,crystalskull.gaiamobile.org,test-wappush.gaiamobile.org,membuster.gaiamobile.org,cubevid.gaiamobile.org,geoloc.gaiamobile.org");

pref("geo.gps.supl_server", "supl.izatcloud.net");
pref("geo.gps.supl_port", 22024);
pref("dom.payment.provider.0.name", "firefoxmarket");
pref("dom.payment.provider.0.description", "marketplace.firefox.com");
pref("dom.payment.provider.0.uri", "https://marketplace.firefox.com/mozpay/?req=");
pref("dom.payment.provider.0.type", "mozilla/payments/pay/v1");
pref("dom.payment.provider.0.requestMethod", "GET");
pref("dom.payment.skipHTTPSCheck", true);
pref("dom.payment.debug", true);

pref("dom.payment.provider.1.name", "firefoxmarketdev");
pref("dom.payment.provider.1.description", "marketplace-dev.allizom.org");
pref("dom.payment.provider.1.uri", "https://marketplace-dev.allizom.org/mozpay/?req=");
pref("dom.payment.provider.1.type", "mozilla-dev/payments/pay/v1");
pref("dom.payment.provider.1.requestMethod", "GET");

pref("dom.payment.provider.2.name", "firefoxmarketstage");
pref("dom.payment.provider.2.description", "marketplace.allizom.org");
pref("dom.payment.provider.2.uri", "https://marketplace.allizom.org/mozpay/?req=");
pref("dom.payment.provider.2.type", "mozilla-stage/payments/pay/v1");
pref("dom.payment.provider.2.requestMethod", "GET");

pref("dom.payment.provider.3.name", "mockpayprovider");
pref("dom.payment.provider.3.description", "Mock Payment Provider");
pref("dom.payment.provider.3.uri", "http://ferjm.github.io/gaia-mock-payment-provider/index.html?req=");
pref("dom.payment.provider.3.type", "tests/payments/pay/v1");
pref("dom.payment.provider.3.requestMethod", "GET");

