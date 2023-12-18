module.exports = {
    verbose: true,
    collectCoverage: false,
    testTimeout: 25000,
    globals: {
    },
    reporters: [
        "default",
        ["jest-html-reporter", {
          pageTitle: "Test Report",
          outputPath: "./reports/test-report.html",
          // Otras opciones...
        }]
      ],
    runner: 'groups',
};