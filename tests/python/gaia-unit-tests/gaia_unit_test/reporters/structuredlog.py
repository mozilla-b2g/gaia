from base import Base
import json

class StructuredLogReporter(Base):
    def __init__(self, *args, **kwargs):
        self.logger = kwargs.pop('logger')
        Base.__init__(self, *args, **kwargs)

    def log_message(self, log_type, data, testname):
        message = []
        for item in data.get('messages', []):
            if isinstance(item, basestring):
                message += [item]
            else:
                message += [json.dumps(item)]
        self.logger.info('TEST-INFO | %s | %s: %s' % (testname, log_type, ' '.join(message)))

    def on_log(self, data, testname):
        self.log_message('log', data, testname)

    def on_info(self, data, testname):
        self.log_message('info', data, testname)

    def on_warn(self, data, testname):
        self.log_message('warn', data, testname)

    def on_dir(self, data, testname):
        self.log_message('dir', data, testname)

    def on_error(self, data, testname):
        self.log_message('error', data, testname)

    def on_pass(self, data, testname):
        self.logger.test_status(testname, data['fullTitle'], 'PASS')

    def on_fail(self, data, testname):
        subtest = data['fullTitle']
        msg = None
        stack = None
        if 'err' in data:
            if 'message' in data['err']:
                msg = data['err']['message']
            if 'stack' in data['err']:
                stack = '\n'.join(['    %s' % x for x in data['err']['stack'].split('\n')])
        self.logger.test_status(testname, subtest, status='FAIL', message=msg, stack=stack)

    def on_start(self, data, testname):
        self.logger.test_start(testname)

    def on_end(self, data, testname):
        self.logger.test_end(testname, 'OK')
        self.logger.info('suite results (pass/fail): %d/%d' %
                         (self.passes, self.failures))
