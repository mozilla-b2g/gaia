from base import Base

from base import FAIL_MARK, PASS_MARK

class Spec(Base):

    def on_test_end(self, data):
        mark = ' ';

        if data['state'] == 'passed':
            mark += PASS_MARK
        else:
            mark += FAIL_MARK

        self.report('  ' + data['title'] + mark, True)

    def on_suite(self, data):
        #print self.indent
        self.report(data['title'], True)
