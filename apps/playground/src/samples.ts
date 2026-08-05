export const jsSamples = {
  happyPath: 'console.log("starting")\nlet x = 1 + 1\nconsole.log(x)\nconsole.log("done")',
  error: 'console.log("starting")\nthrow new Error("something went wrong")\nconsole.log("unreachable")',
};

export const xyzlangSamples = {
  happyPath: 'print "starting"\nlet x = "42"\nprint x\nprint "done"',
  error: 'print "starting"\nfail "something went wrong"\nprint "unreachable"',
};
