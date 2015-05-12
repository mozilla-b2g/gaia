# ESLint in Gaia

## Why ESLint?
ESLint has great support for ES6 and allows pluggable rules. That helps 
performing custom checks for outdated APIs or [unsafe coding practices]
(https://developer.mozilla.org/en-US/Firefox_OS/Security/Security_Automation)

## How

For now ESLint will use the jshint ignore file `.jshintignore`. Every other 
configuration specific to ESLint is in `.eslintrc`. 

From the Gaia root directory:
* Run `make eslint` to lint your code using eslint.

You can use `APP=<app directory>` (eg `APP=sms`) to restrict the run to a
specific application.

## Unsafe assignment to innerHTML or Unsafe call to insertAdjacentHTML

These tests are to prevent [DOM-based Cross-Site Scripting](https://www.owasp.org/index.php/DOM_based_XSS_Prevention_Cheat_Sheet).
The idea is to disallow innerHTML as well as insertAdjacentHTML unless a 
known-good escaping  function is used. For more information, please refer to the 
[guide on MDN](https://developer.mozilla.org/en-US/Firefox_OS/Security/Security_Automation)
