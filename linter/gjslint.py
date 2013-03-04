from closure_linter import gjslint
import customrules

if __name__ == '__main__':
  customrules.InjectErrorReporter()
  gjslint.main()
