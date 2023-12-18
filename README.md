#  Jest-Automation 

## Installation

To install the code, follow these steps:

1. Clone the repository: `git clone https://gitlab.com/tribal-credit/development/tribal-qa/jest-automation.git`
2. Change into the project directory: `cd  jest-automation `
3. Install dependencies: `npm install`

## Usage

To use the backend framework, you need the following:

- Node.js (version v16.20.2)
- npm (version 8.19.4)

## Running Tests

To run the tests, you can use the following command:

* ### For all the tests inside a spec.js
    npx jest janus.spec.js

* ### For a certain test
    npx jest janus.spec.js --testNamePattern='Create new customer and user'

*   ### Or you can add a name in package.json and use the command "npm run" to execute the test:
    "scripts": {
        "test1": "jest janus.spec.js --testNamePattern='Create new customer and user'", 
    }

    npm run test1


## Note: 
To run the tests and use kafka and DB, it is needed a file with credentials
