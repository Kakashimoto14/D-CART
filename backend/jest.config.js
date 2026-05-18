export default {
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  transform: {},
  collectCoverageFrom: ["src/**/*.js", "!src/server.js", "!src/worker.js"]
};
