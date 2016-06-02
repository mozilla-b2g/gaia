<clientConfig version="1.1">
  <emailProvider id="163.com">
    <domain>163.com</domain>
    <displayName>163.com</displayName>
    <displayShortName>163.com</displayShortName>
    <incomingServer type="imap">
      <hostname>imap.163.com</hostname>
      <port>993</port>
      <socketType>SSL</socketType>
      <username>%EMAILADDRESS%</username>
      <authentication>password-cleartext</authentication>
    </incomingServer>
    <outgoingServer type="smtp">
      <hostname>smtp.163.com</hostname>
      <port>465</port>
      <socketType>SSL</socketType>
      <username>%EMAILADDRESS%</username>
      <authentication>password-cleartext</authentication>
    </outgoingServer>
  </emailProvider>
</clientConfig>
