<clientConfig version="1.1">
  <emailProvider id="googlemail.com">
    <domain>gmail.com</domain>
    <domain>googlemail.com</domain>
    <!-- MX, for Google Apps -->
    <domain>google.com</domain>
    <displayName>Google Mail</displayName>
    <displayShortName>GMail</displayShortName>
    <incomingServer type="imap">
      <hostname>imap.gmail.com</hostname>
      <port>993</port>
      <socketType>SSL</socketType>
      <username>%EMAILADDRESS%</username>
      <authentication>xoauth2</authentication>
    </incomingServer>
    <outgoingServer type="smtp">
      <hostname>smtp.gmail.com</hostname>
      <port>465</port>
      <socketType>SSL</socketType>
      <username>%EMAILADDRESS%</username>
      <authentication>xoauth2</authentication>
    </outgoingServer>
    <oauth2Settings>
      <secretGroup>google</secretGroup>
      <authEndpoint>https://accounts.google.com/o/oauth2/auth</authEndpoint>
      <tokenEndpoint>https://accounts.google.com/o/oauth2/token</tokenEndpoint>
      <scope>https://mail.google.com/</scope>
    </oauth2Settings>
  </emailProvider>
</clientConfig>
