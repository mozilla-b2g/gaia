'use strict';

/*

  This mock represents the following google contacts response for a list of contacts

  'use strict';

/*

  This is the entry we are getting

<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:openSearch="http://a9.com/-/spec/opensearch/1.1/" xmlns:gContact="http://schemas.google.com/contact/2008" xmlns:batch="http://schemas.google.com/gdata/batch" xmlns:gd="http://schemas.google.com/g/2005" gd:etag="W/&quot;DkENRHY6fyt7I2A9WhBSGUU.&quot;">
    <id>someemail@gmail.com</id>
    <updated>2013-02-27T17:04:55.817Z</updated>
    <category scheme="http://schemas.google.com/g/2005#kind" term="http://schemas.google.com/contact/2008#contact" />
    <title>someone's Contacts</title>
    <link rel="alternate" type="text/html" href="http://www.google.com/" />
    <link rel="http://schemas.google.com/g/2005#feed" type="application/atom+xml" href="https://www.google.com/m8/feeds/contacts/somegoogleemail%40gmail.com/full" />
    <link rel="http://schemas.google.com/g/2005#post" type="application/atom+xml" href="https://www.google.com/m8/feeds/contacts/somegoogleemail%40gmail.com/full" />
    <link rel="http://schemas.google.com/g/2005#batch" type="application/atom+xml" href="https://www.google.com/m8/feeds/contacts/somegoogleemail%40gmail.com/full/batch" />
    <link rel="self" type="application/atom+xml" href="https://www.google.com/m8/feeds/contacts/somegoogleemail%40gmail.com/full?max-results=25" />
    <link rel="next" type="application/atom+xml" href="https://www.google.com/m8/feeds/contacts/somegoogleemail%40gmail.com/full?start-index=26&amp;max-results=25" />
    <author>
        <name>someone</name>
        <email>someemail@gmail.com</email>
    </author>
    <generator version="1.0" uri="http://www.google.com/m8/feeds">Contacts</generator>
    <openSearch:totalResults>2</openSearch:totalResults>
    <openSearch:startIndex>1</openSearch:startIndex>
    <openSearch:itemsPerPage>25</openSearch:itemsPerPage>
    <entry gd:etag="&quot;RXs7ejVSLit7I2A9WxNRFE4IQAY.&quot;">
        <id>http://www.google.com/m8/feeds/contacts/somegoogleemail%40gmail.com/base/1</id>
        <updated>2009-09-08T17:58:44.502Z</updated>
        <app:edited xmlns:app="http://www.w3.org/2007/app">2009-09-08T17:58:44.502Z</app:edited>
        <category scheme="http://schemas.google.com/g/2005#kind" term="http://schemas.google.com/contact/2008#contact" />
        <title />
        <link rel="http://schemas.google.com/contacts/2008/rel#photo" type="image/*" href="https://www.google.com/m8/feeds/photos/media/somegoogleemail%40gmail.com/1" />
        <link rel="self" type="application/atom+xml" href="https://www.google.com/m8/feeds/contacts/somegoogleemail%40gmail.com/full/1" />
        <link rel="edit" type="application/atom+xml" href="https://www.google.com/m8/feeds/contacts/somegoogleemail%40gmail.com/full/1" />
        <gd:email rel="http://schemas.google.com/g/2005#other" address="another@gmail.com" primary="true" />
        <gd:email rel="http://schemas.google.com/g/2005#work" address="work@gmail.com" primary="true" />
    </entry>
    <entry gd:etag="&quot;RHY4fTNRKyt7I2A9WhJbEkQDQgY.&quot;">
        <id>http://www.google.com/m8/feeds/contacts/somegoogleemail%40gmail.com/base/2</id>
        <updated>2012-09-22T07:38:45.835Z</updated>
        <app:edited xmlns:app="http://www.w3.org/2007/app">2012-09-22T07:38:45.835Z</app:edited>
        <category scheme="http://schemas.google.com/g/2005#kind" term="http://schemas.google.com/contact/2008#contact" />
        <title>John Doe</title>
        <gd:name>
          <gd:fullName>John Doe</gd:fullName>
          <gd:givenName>John</gd:givenName>
          <gd:additionalName></gd:additionalName>
          <gd:familyName>Doe</gd:familyName>
        </gd:name>
        <gContact:birthday when="1990-01-01" />
        <link rel="http://schemas.google.com/contacts/2008/rel#photo" type="image/*" href="https://www.google.com/m8/feeds/photos/media/somegoogleemail%40gmail.com/2" gd:etag="&quot;UR5VJUMvbCt7I2BcOB46EypYQV4BJGx4YVc.&quot;" />
        <link rel="self" type="application/atom+xml" href="https://www.google.com/m8/feeds/contacts/somegoogleemail%40gmail.com/full/2" />
        <link rel="edit" type="application/atom+xml" href="https://www.google.com/m8/feeds/contacts/somegoogleemail%40gmail.com/full/2" />
    </entry>
</feed>

*/

var MockGoogleListing = (function MockGoogleListing() {

  var entryBuffer = '<?xml version="1.0" encoding="UTF-8"?> <feed xmlns="http://www.w3.org/2005/Atom" xmlns:openSearch="http://a9.com/-/spec/opensearch/1.1/" xmlns:gContact="http://schemas.google.com/contact/2008" xmlns:batch="http://schemas.google.com/gdata/batch" xmlns:gd="http://schemas.google.com/g/2005" gd:etag="W/&quot;DkENRHY6fyt7I2A9WhBSGUU.&quot;"> <id>someemail@gmail.com</id> <updated>2013-02-27T17:04:55.817Z</updated> <category scheme="http://schemas.google.com/g/2005#kind" term="http://schemas.google.com/contact/2008#contact" /> <title>someone\'s Contacts</title> <link rel="alternate" type="text/html" href="http://www.google.com/" /> <link rel="http://schemas.google.com/g/2005#feed" type="application/atom+xml" href="https://www.google.com/m8/feeds/contacts/somegoogleemail%40gmail.com/full" /> <link rel="http://schemas.google.com/g/2005#post" type="application/atom+xml" href="https://www.google.com/m8/feeds/contacts/somegoogleemail%40gmail.com/full" /> <link rel="http://schemas.google.com/g/2005#batch" type="application/atom+xml" href="https://www.google.com/m8/feeds/contacts/somegoogleemail%40gmail.com/full/batch" /> <link rel="self" type="application/atom+xml" href="https://www.google.com/m8/feeds/contacts/somegoogleemail%40gmail.com/full?max-results=25" /> <link rel="next" type="application/atom+xml" href="https://www.google.com/m8/feeds/contacts/somegoogleemail%40gmail.com/full?start-index=26&amp;max-results=25" /> <author> <name>someone</name> <email>someemail@gmail.com</email> </author> <generator version="1.0" uri="http://www.google.com/m8/feeds">Contacts</generator> <openSearch:totalResults>2</openSearch:totalResults> <openSearch:startIndex>1</openSearch:startIndex> <openSearch:itemsPerPage>25</openSearch:itemsPerPage> <entry gd:etag="&quot;RXs7ejVSLit7I2A9WxNRFE4IQAY.&quot;"> <id>http://www.google.com/m8/feeds/contacts/somegoogleemail%40gmail.com/base/1</id> <updated>2009-09-08T17:58:44.502Z</updated> <app:edited xmlns:app="http://www.w3.org/2007/app">2009-09-08T17:58:44.502Z</app:edited> <category scheme="http://schemas.google.com/g/2005#kind" term="http://schemas.google.com/contact/2008#contact" /> <title /> <link rel="http://schemas.google.com/contacts/2008/rel#photo" type="image/*" href="https://www.google.com/m8/feeds/photos/media/somegoogleemail%40gmail.com/1" /> <link rel="self" type="application/atom+xml" href="https://www.google.com/m8/feeds/contacts/somegoogleemail%40gmail.com/full/1" /> <link rel="edit" type="application/atom+xml" href="https://www.google.com/m8/feeds/contacts/somegoogleemail%40gmail.com/full/1" /> <gd:email rel="http://schemas.google.com/g/2005#other" address="another@gmail.com" primary="true" /> <gd:email rel="http://schemas.google.com/g/2005#work" address="work@gmail.com" primary="true" /> </entry> <entry gd:etag="&quot;RHY4fTNRKyt7I2A9WhJbEkQDQgY.&quot;"> <id>http://www.google.com/m8/feeds/contacts/somegoogleemail%40gmail.com/base/2</id> <updated>2012-09-22T07:38:45.835Z</updated> <app:edited xmlns:app="http://www.w3.org/2007/app">2012-09-22T07:38:45.835Z</app:edited> <category scheme="http://schemas.google.com/g/2005#kind" term="http://schemas.google.com/contact/2008#contact" /> <title>John Doe</title> <gd:name> <gd:fullName>John Doe</gd:fullName> <gd:givenName>John</gd:givenName> <gd:additionalName></gd:additionalName> <gd:familyName>Doe</gd:familyName> </gd:name> <gContact:birthday when="1990-01-01" /> <link rel="http://schemas.google.com/contacts/2008/rel#photo" type="image/*" href="https://www.google.com/m8/feeds/photos/media/somegoogleemail%40gmail.com/2" gd:etag="&quot;UR5VJUMvbCt7I2BcOB46EypYQV4BJGx4YVc.&quot;" /> <link rel="self" type="application/atom+xml" href="https://www.google.com/m8/feeds/contacts/somegoogleemail%40gmail.com/full/2" /> <link rel="edit" type="application/atom+xml" href="https://www.google.com/m8/feeds/contacts/somegoogleemail%40gmail.com/full/2" /> </entry> </feed>';
  var parser = new DOMParser();
  var listing = parser.parseFromString(entryBuffer, 'text/xml');

  return listing;

})();