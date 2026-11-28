"use strict";
const { runCarsTestSuite } = require("./test_cars");
const { runCarFactoryTestSuite } = require("./test_car_factory");
const { runTracksTestSuite } = require("./test_tracks");
const { runPhysicsTestSuite } = require("./test_physics");
const { runShaderTests } = require("./test_shaders");
const { runControlsTestSuite } = require("./test_controls");
const { runRivalTestSuite } = require("./test_rival");
const { totalAsserts: patternsAsserts } = require("./test_patterns");
const { totalAsserts: networkAsserts } = require("./test_network");
const { totalAsserts: solidAsserts } = require("./test_solid_modules");

console.log("================================================================");
console.log("  🏎️  CARRERAS - SUITE COMPLETA DE PRUEBAS AUTOMATIZADAS");
console.log("================================================================");

const t0 = Date.now();

let totalPassed = 0;
let totalFailed = 0;

try {
  const shadersRes = runShaderTests();
  totalPassed += shadersRes.asserts;

  const carsRes = runCarsTestSuite();
  totalPassed += carsRes.passed;
  totalFailed += carsRes.failed;

  const carFactoryRes = runCarFactoryTestSuite();
  totalPassed += carFactoryRes.passed;
  totalFailed += carFactoryRes.failed;

  const tracksRes = runTracksTestSuite();
  totalPassed += tracksRes.passed;
  totalFailed += tracksRes.failed;

  const physicsRes = runPhysicsTestSuite();
  totalPassed += physicsRes.passed;
  totalFailed += physicsRes.failed;

  const controlsRes = runControlsTestSuite();
  totalPassed += controlsRes.passed;
  totalFailed += controlsRes.failed;

  const rivalRes = runRivalTestSuite();
  totalPassed += rivalRes.passed;
  totalFailed += rivalRes.failed;

  totalPassed += patternsAsserts;
  totalPassed += networkAsserts;
  totalPassed += solidAsserts;
} catch (err) {
  console.error("\n❌ ERROR CRÍTICO DURANTE LA EJECUCIÓN DE PRUEBAS:\n", err);
  process.exit(1);
}

const dt = ((Date.now() - t0) / 1000).toFixed(2);

console.log(
  "\n================================================================",
);
if (totalFailed === 0) {
  console.log(
    `  ✅ TODAS LAS PRUEBAS SUPERADAS: ${totalPassed} asserts en ${dt} s`,
  );
  console.log("  Estado del proyecto: 100% SÓLIDO Y ESTABLE");
} else {
  console.log(
    `  ❌ SE ENCONTRARON FALLOS: ${totalFailed} de ${totalPassed + totalFailed} asserts fallaron en ${dt} s`,
  );
}
console.log(
  "================================================================\n",
);

process.exit(totalFailed > 0 ? 1 : 0);
