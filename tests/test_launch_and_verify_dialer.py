from marionette_test import MarionetteTestCase
from errors import *

class TestDialerLaunch(MarionetteTestCase):
    """Trivial example of launching a Gaia app and performing some test on it.
    """

    def test_launch_dialer(self):
        marionette = self.marionette
        marionette.set_script_timeout(10000)
        # Launch dialer app.
        app_frame = self.launch_gaia_app('../dialer/dialer.html')

        # Verify that Each of the button label areas
        one_button = self.marionette.execute_script("""
var frame = arguments[0];
return frame.contentWindow.document.getElementsByTagName('span')[0].innerHTML;
""", [app_frame])

        two_button = self.marionette.execute_script("""
var frame = arguments[0];
return frame.contentWindow.document.getElementsByTagName('span')[2].innerHTML;
""", [app_frame])

        two_button_text = self.marionette.execute_script("""
var frame = arguments[0];
return frame.contentWindow.document.getElementsByTagName('span')[3].innerHTML;
""", [app_frame])

        three_button = self.marionette.execute_script("""
var frame = arguments[0];
return frame.contentWindow.document.getElementsByTagName('span')[4].innerHTML;
""", [app_frame])

        three_button_text = self.marionette.execute_script("""
var frame = arguments[0];
return frame.contentWindow.document.getElementsByTagName('span')[5].innerHTML;
""", [app_frame])

        four_button = self.marionette.execute_script("""
var frame = arguments[0];
return frame.contentWindow.document.getElementsByTagName('span')[6].innerHTML;
""", [app_frame])

        four_button_text = self.marionette.execute_script("""
var frame = arguments[0];
return frame.contentWindow.document.getElementsByTagName('span')[7].innerHTML;
""", [app_frame])

        five_button = self.marionette.execute_script("""
var frame = arguments[0];
return frame.contentWindow.document.getElementsByTagName('span')[8].innerHTML;
""", [app_frame])

        five_button_text = self.marionette.execute_script("""
var frame = arguments[0];
return frame.contentWindow.document.getElementsByTagName('span')[9].innerHTML;
""", [app_frame])

        six_button = self.marionette.execute_script("""
var frame = arguments[0];
return frame.contentWindow.document.getElementsByTagName('span')[10].innerHTML;
""", [app_frame])

        six_button_text = self.marionette.execute_script("""
var frame = arguments[0];
return frame.contentWindow.document.getElementsByTagName('span')[11].innerHTML;
""", [app_frame])

        seven_button = self.marionette.execute_script("""
var frame = arguments[0];
return frame.contentWindow.document.getElementsByTagName('span')[12].innerHTML;
""", [app_frame])

        seven_button_text = self.marionette.execute_script("""
var frame = arguments[0];
return frame.contentWindow.document.getElementsByTagName('span')[13].innerHTML;
""", [app_frame])

        eight_button = self.marionette.execute_script("""
var frame = arguments[0];
return frame.contentWindow.document.getElementsByTagName('span')[14].innerHTML;
""", [app_frame])

        eight_button_text = self.marionette.execute_script("""
var frame = arguments[0];
return frame.contentWindow.document.getElementsByTagName('span')[15].innerHTML;
""", [app_frame])

        nine_button = self.marionette.execute_script("""
var frame = arguments[0];
return frame.contentWindow.document.getElementsByTagName('span')[16].innerHTML;
""", [app_frame])

        nine_button_text = self.marionette.execute_script("""
var frame = arguments[0];
return frame.contentWindow.document.getElementsByTagName('span')[17].innerHTML;
""", [app_frame])

        star_button = self.marionette.execute_script("""
var frame = arguments[0];
return frame.contentWindow.document.getElementsByTagName('span')[18].innerHTML;
""", [app_frame])

        zero_button = self.marionette.execute_script("""
var frame = arguments[0];
return frame.contentWindow.document.getElementsByTagName('span')[20].innerHTML;
""", [app_frame])

        zero_button_text = self.marionette.execute_script("""
var frame = arguments[0];
return frame.contentWindow.document.getElementsByTagName('span')[21].innerHTML;
""", [app_frame])

        hash_button = self.marionette.execute_script("""
var frame = arguments[0];
return frame.contentWindow.document.getElementsByTagName('span')[22].innerHTML;
""", [app_frame])

        call_button = self.marionette.execute_script("""
var frame = arguments[0];
return frame.contentWindow.document.getElementsByTagName('span')[24].innerHTML;
""", [app_frame])

        #verify that each of the button labels contains the correct numbers/text
        self.assertEqual(one_button, '1')
        self.assertEqual(two_button, '2')
        self.assertEqual(two_button_text, 'abc')
        self.assertEqual(three_button, '3')
        self.assertEqual(three_button_text, 'def')
        self.assertEqual(four_button, '4')
        self.assertEqual(four_button_text, 'ghi')
        self.assertEqual(five_button, '5')
        self.assertEqual(five_button_text, 'jkl')
        self.assertEqual(six_button, '6')
        self.assertEqual(six_button_text, 'mno')
        self.assertEqual(seven_button, '7')
        self.assertEqual(seven_button_text, 'pqrs')
        self.assertEqual(eight_button, '8')
        self.assertEqual(eight_button_text, 'tuv')
        self.assertEqual(nine_button, '9')
        self.assertEqual(nine_button_text, 'wxyz')
        self.assertEqual(star_button, u'\u2217')
        self.assertEqual(zero_button, '0')
        self.assertEqual(zero_button_text, '+')
        self.assertEqual(hash_button, '#')
        self.assertEqual(call_button, 'Call')

        
        # Kill the app
        self.kill_gaia_app('../dialer/dialer.html')
