// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {CuentaCorrienteRegistry} from "../src/CuentaCorrienteRegistry.sol";

contract DeployScript is Script {
    function run() external {
        vm.startBroadcast();
        // owner = la cuenta que firma el broadcast (--private-key). No hardcodear.
        CuentaCorrienteRegistry registry = new CuentaCorrienteRegistry(msg.sender);
        console.log("CuentaCorrienteRegistry deployed at:", address(registry));
        console.log("Owner:", msg.sender);
        vm.stopBroadcast();
    }
}
