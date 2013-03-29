import unittest
from gaia_unit_test.reporters.base import Base
import factory


class BaseExtended(Base):
    def __init__(self, flag):
        Base.__init__(self, flag)
        self.calledWith = None

    # whitespace case
    def on_test_end(self, data):
        self.calledWith = data


class BaseTestCase(unittest.TestCase):

    def setUp(self):
        self.subject = Base(False)

    def test_initailize(self):
        self.assertEqual(self.subject.passes, 0)
        self.assertEqual(self.subject.failures, 0)
        self.assertEqual(self.subject.duration, 0)
        self.assertEqual(self.subject.indent, 0)

    def test_report(self):
        subject = self.subject

        subject.report('foo')
        self.assertEqual(subject.output[0], 'foo')

        subject.indent = 2

        subject.report('xfoo', True)
        self.assertEqual(subject.output[1], '    xfoo')

    def test_handle_event(self):
        subject = self.subject
        # pass
        subject.handle_event('pass', factory.passed())
        self.assertEqual(subject.passes, 1)

        # fail
        expected_fail = factory.failed()
        subject.handle_event('fail', expected_fail)
        self.assertEqual(subject.failures, 1)
        self.assertEqual(subject.failed_tests[0], expected_fail)

        # indent
        subject.handle_event('suite', factory.suite())
        self.assertEqual(subject.indent, 1)
        subject.handle_event('suite end', factory.suite())
        self.assertEqual(subject.indent, 0)

        # end
        subject.handle_event('end', {
            'tests': 10,
            'duration': 123,
            'suites': 10
        })

        self.assertEqual(subject.tests, 10)
        self.assertEqual(subject.duration, 123)
        self.assertEqual(subject.suites, 10)

    def test_handle_event_extended(self):
        subject = BaseExtended(False)

        inputObj = {'foo': 'bar'}

        subject.handle_event('test end', inputObj)
        self.assertDictContainsSubset(inputObj, subject.calledWith)

        self.calledWith = None

        # should be silently ignored...
        subject.handle_event('random thing', 'foo')
        self.assertEqual(self.calledWith, None)

if __name__ == '__main__':
    unittest.main(verbosity=2)
