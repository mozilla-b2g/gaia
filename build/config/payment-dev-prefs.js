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
