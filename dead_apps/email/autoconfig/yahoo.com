<clientConfig version="1.1">
  <emailProvider id="yahoo.com">
    <domain>yahoo.com</domain>
    <displayName>Yahoo! Mail</displayName>
    <displayShortName>Yahoo</displayShortName>
    <incomingServer type="imap">
      <hostname>imap.mail.yahoo.com</hostname>
      <port>993</port>
      <socketType>SSL</socketType>
      <username>%EMAILADDRESS%</username>
      <authentication>password-cleartext</authentication>
    </incomingServer>
    <outgoingServer type="smtp">
      <hostname>smtp.mail.yahoo.com</hostname>
      <port>465</port>
      <socketType>SSL</socketType>
      <username>%EMAILADDRESS%</username>
      <authentication>password-cleartext</authentication>
    </outgoingServer>
  </emailProvider>
</clientConfig>
