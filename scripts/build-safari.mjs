const mode = process.argv[2] ?? "--plan";

if (mode !== "--plan") {
  console.error("Safari lane is not implemented as a build target yet.");
  console.error("See docs/safari-support.md for the current workstream plan.");
  process.exit(1);
}

console.log("CalmBlock Safari workstream plan");
console.log("");
console.log("- current repo artifacts: chrome, firefox");
console.log("- Safari is a separate Apple packaging/distribution lane");
console.log("- current recommendation: keep docs and certification planning in place before adding a real Safari build");
console.log("- next implementation gate: choose Xcode/App Store Connect/TestFlight packaging path");
