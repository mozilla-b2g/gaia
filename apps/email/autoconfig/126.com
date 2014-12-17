<clientConfig version="1.1">
  <emailProvider id="126.com">
    <domain>126.com</domain>
    <displayName>126.com</displayName>
    <displayShortName>126.com</displayShortName>
    <incomingServer type="imap">
      <hostname>imap.126.com</hostname>
      <port>993</port>
      <socketType>SSL</socketType>
      <username>%EMAILADDRESS%</username>
      <authentication>password-cleartext</authentication>
    </incomingServer>
    <outgoingServer type="smtp">
      <hostname>smtp.126.com</hostname>
      <port>465</port>
      <socketType>SSL</socketType>
      <username>%EMAILADDRESS%</username>
      <authentication>password-cleartext</authentication>
    </outgoingServer>
  </emailProvider>
</clientConfig>
