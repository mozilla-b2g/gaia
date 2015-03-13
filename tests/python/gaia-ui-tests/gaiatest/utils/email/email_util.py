#!/usr/bin/env python

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import smtplib
from email.mime.text import MIMEText


class EmailUtil:

    def send(self, account, email):
        """
        account = {
            'hostname': 'smtp.example.com',
            'port': 25,
            'username': 'username',
            'password': 'password'}
        email = {
            'from': 'from@example.com',
            'to': 'to@example.com',
            'subject': 'Subject',
            'message': 'Message'}
        """
        smtp = smtplib.SMTP_SSL(account['hostname'], account['port'])
        smtp.set_debuglevel(False)
        smtp.login(account['username'], account['password'])

        message = MIMEText(email.get('message'))
        message['Subject'] = email.get('subject')
        message['From'] = email['from']
        message['To'] = email['to']

        smtp.sendmail(email['from'],
                      email['to'],
                      message.as_string())
        smtp.quit()
