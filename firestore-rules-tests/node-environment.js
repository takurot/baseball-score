// jest 27 (bundled with react-scripts) hides Node's global fetch from the test
// sandbox, but @firebase/rules-unit-testing needs it to talk to the emulator.
const NodeEnvironment = require('jest-environment-node');

class NodeWithFetchEnvironment extends NodeEnvironment {
  async setup() {
    await super.setup();
    Object.assign(this.global, { fetch, Headers, Request, Response });
  }
}

module.exports = NodeWithFetchEnvironment;
