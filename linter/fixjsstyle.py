from closure_linter import fixjsstyle
import customrules

if __name__ == '__main__':
  customrules.InjectErrorReporter()
  fixjsstyle.main()
