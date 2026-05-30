// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {CuentaCorrienteRegistry} from "../src/CuentaCorrienteRegistry.sol";

contract CuentaCorrienteRegistryTest is Test {
    CuentaCorrienteRegistry internal reg;

    address internal owner = address(0xB0B);
    uint256 internal emisorPk = 0xA11CE;
    uint256 internal receptorPk = 0xBEEF;
    address internal emisor;
    address internal receptor;

    bytes32 internal constant TX_ID = bytes32(uint256(0x1234));
    uint256 internal constant MONTO = 125000_00; // centavos
    uint256 internal constant DEADLINE = 1_000_000_000;

    bytes32 internal constant ACTION_TYPEHASH =
        keccak256("Action(bytes32 txId,uint8 action,uint256 monto,uint256 nonce,uint256 deadline)");

    function setUp() public {
        emisor = vm.addr(emisorPk);
        receptor = vm.addr(receptorPk);

        vm.prank(owner);
        reg = new CuentaCorrienteRegistry(owner);

        // ancla una FACTURA base
        vm.prank(owner);
        reg.anchorTransaction(
            TX_ID,
            keccak256("payload"),
            keccak256("pdf"),
            emisor,
            receptor,
            MONTO,
            CuentaCorrienteRegistry.Tipo.FACTURA
        );
    }

    // ─────────── helpers ───────────

    function _digest(uint8 action, uint256 nonce, uint256 deadline) internal view returns (bytes32) {
        bytes32 structHash =
            keccak256(abi.encode(ACTION_TYPEHASH, TX_ID, action, MONTO, nonce, deadline));
        bytes32 domainSep = reg.domainSeparator();
        return keccak256(abi.encodePacked("\x19\x01", domainSep, structHash));
    }

    function _sign(uint256 pk, uint8 action, uint256 nonce, uint256 deadline)
        internal
        view
        returns (bytes memory)
    {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, _digest(action, nonce, deadline));
        return abi.encodePacked(r, s, v);
    }

    function _confirm(uint256 nonce) internal {
        bytes memory se = _sign(emisorPk, 1, nonce, DEADLINE);
        bytes memory sr = _sign(receptorPk, 1, nonce, DEADLINE);
        vm.prank(owner);
        reg.confirmInvoice(TX_ID, nonce, DEADLINE, se, sr);
    }

    function _pay(uint256 nonce) internal {
        bytes memory se = _sign(emisorPk, 2, nonce, DEADLINE);
        bytes memory sr = _sign(receptorPk, 2, nonce, DEADLINE);
        vm.prank(owner);
        reg.payInvoice(TX_ID, nonce, DEADLINE, se, sr);
    }

    // ─────────── anchor ───────────

    function test_anchor_onlyOwner() public {
        vm.expectRevert();
        reg.anchorTransaction(
            bytes32(uint256(0x9)),
            bytes32(0),
            bytes32(0),
            emisor,
            receptor,
            1,
            CuentaCorrienteRegistry.Tipo.PAGO
        );
    }

    function test_anchor_doubleReverts() public {
        vm.prank(owner);
        vm.expectRevert(bytes("ALREADY_ANCHORED"));
        reg.anchorTransaction(
            TX_ID, bytes32(0), bytes32(0), emisor, receptor, 1, CuentaCorrienteRegistry.Tipo.FACTURA
        );
    }

    function test_anchor_storesState() public {
        CuentaCorrienteRegistry.Anchor memory a = reg.getAnchor(TX_ID);
        assertEq(uint8(a.estado), uint8(CuentaCorrienteRegistry.Estado.REGISTRADA));
        assertEq(a.emisor, emisor);
        assertEq(a.receptor, receptor);
        assertEq(a.monto, MONTO);
    }

    // ─────────── confirm ───────────

    function test_confirm_bothSigsAdvances() public {
        _confirm(1);
        assertEq(
            uint8(reg.getAnchor(TX_ID).estado), uint8(CuentaCorrienteRegistry.Estado.CONFIRMADA)
        );
    }

    function test_confirm_wrongSignerReverts() public {
        bytes memory se = _sign(emisorPk, 1, 1, DEADLINE);
        bytes memory bad = _sign(0xDEAD, 1, 1, DEADLINE); // no es el receptor
        vm.prank(owner);
        vm.expectRevert(bytes("BAD_SIG_RECEPTOR"));
        reg.confirmInvoice(TX_ID, 1, DEADLINE, se, bad);
    }

    function test_confirm_expiredDeadlineReverts() public {
        vm.warp(DEADLINE + 1);
        bytes memory se = _sign(emisorPk, 1, 1, DEADLINE);
        bytes memory sr = _sign(receptorPk, 1, 1, DEADLINE);
        vm.prank(owner);
        vm.expectRevert(bytes("EXPIRED"));
        reg.confirmInvoice(TX_ID, 1, DEADLINE, se, sr);
    }

    function test_confirm_nonceReuseReverts() public {
        _confirm(5);
        bytes memory se = _sign(emisorPk, 1, 5, DEADLINE);
        bytes memory sr = _sign(receptorPk, 1, 5, DEADLINE);
        vm.prank(owner);
        vm.expectRevert(bytes("NONCE_USED"));
        reg.confirmInvoice(TX_ID, 5, DEADLINE, se, sr);
    }

    // ─────────── pay / refund state machine ───────────

    function test_pay_requiresConfirmada() public {
        bytes memory se = _sign(emisorPk, 2, 10, DEADLINE);
        bytes memory sr = _sign(receptorPk, 2, 10, DEADLINE);
        vm.prank(owner);
        vm.expectRevert(bytes("BAD_STATE")); // todavía REGISTRADA
        reg.payInvoice(TX_ID, 10, DEADLINE, se, sr);
    }

    function test_pay_afterConfirm() public {
        _confirm(1);
        _pay(2);
        assertEq(uint8(reg.getAnchor(TX_ID).estado), uint8(CuentaCorrienteRegistry.Estado.PAGADA));
    }

    function test_refund_requiresPagada() public {
        _confirm(1);
        bytes memory se = _sign(emisorPk, 3, 2, DEADLINE);
        bytes memory sr = _sign(receptorPk, 3, 2, DEADLINE);
        vm.prank(owner);
        vm.expectRevert(bytes("BAD_STATE")); // CONFIRMADA, no PAGADA
        reg.refund(TX_ID, 2, DEADLINE, se, sr);
    }

    function test_refund_afterPay() public {
        _confirm(1);
        _pay(2);
        bytes memory se = _sign(emisorPk, 3, 3, DEADLINE);
        bytes memory sr = _sign(receptorPk, 3, 3, DEADLINE);
        vm.prank(owner);
        reg.refund(TX_ID, 3, DEADLINE, se, sr);
        assertEq(
            uint8(reg.getAnchor(TX_ID).estado), uint8(CuentaCorrienteRegistry.Estado.REEMBOLSADA)
        );
    }

    function test_coSign_onlyOwnerSubmits() public {
        bytes memory se = _sign(emisorPk, 1, 1, DEADLINE);
        bytes memory sr = _sign(receptorPk, 1, 1, DEADLINE);
        // un tercero (no owner) no puede enviar aunque las firmas sean válidas
        vm.expectRevert();
        reg.confirmInvoice(TX_ID, 1, DEADLINE, se, sr);
    }
}
