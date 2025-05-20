// IMPORTANT: register the platform specific implementations of the protocol
import "./aptos/index.js";
import "./evm/index.js";
import "./sui/index.js";
import "./svm/index.js";

export * from "./routes";
