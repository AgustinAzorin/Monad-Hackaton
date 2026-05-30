// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title CuentaCorrienteRegistry
/// @notice Registro inmutable y co-firmado del libro mayor de la app de cuenta corriente.
///         - El backend (owner) ancla cada transacción (#1) junto al hash de su factura (#4).
///         - Las transiciones de estado (confirmar factura / pagar / reembolsar) requieren las
///           firmas EIP-712 de AMBAS partes; el backend las envía y paga el gas (modelo gasless).
///         No mueve valor: solo registra estado + hashes (la cadena es el "libro de verdad").
contract CuentaCorrienteRegistry is Ownable, EIP712 {
    enum Estado {
        NONE,
        REGISTRADA,
        CONFIRMADA,
        PAGADA,
        REEMBOLSADA
    }

    enum Tipo {
        PAGO,
        FACTURA
    }

    struct Anchor {
        bytes32 payloadHash; // keccak256 del payload canónico de la fila de DB
        bytes32 facturaHash; // sha256 de los bytes del PDF (#4); 0x0 si no hay factura
        address emisor; // wallet registrada del emisor
        address receptor; // wallet registrada del receptor
        uint256 monto; // centavos enteros (monto * 100)
        Tipo tipo;
        Estado estado;
        uint64 createdAt;
        bool exists;
    }

    // action codes (deben coincidir con frontend/backend)
    uint8 internal constant ACTION_CONFIRMAR = 1;
    uint8 internal constant ACTION_PAGAR = 2;
    uint8 internal constant ACTION_REEMBOLSAR = 3;

    bytes32 private constant ACTION_TYPEHASH =
        keccak256("Action(bytes32 txId,uint8 action,uint256 monto,uint256 nonce,uint256 deadline)");

    mapping(bytes32 => Anchor) public anchors; // key = txId
    mapping(bytes32 => uint256) public usedNonce; // key = keccak256(txId, action) -> último nonce usado

    event TransactionAnchored(
        bytes32 indexed txId,
        bytes32 payloadHash,
        bytes32 facturaHash,
        address emisor,
        address receptor,
        uint256 monto,
        Tipo tipo
    );
    event InvoiceConfirmed(bytes32 indexed txId, uint256 nonce);
    event InvoicePaid(bytes32 indexed txId, uint256 nonce);
    event Refunded(bytes32 indexed txId, uint256 nonce);

    constructor(address initialOwner)
        Ownable(initialOwner)
        EIP712("CuentaCorrienteRegistry", "1")
    {}

    // ─────────────────────────── #1 + #4: anclaje (owner) ───────────────────────────

    /// @notice Ancla una transacción recién creada. Solo el backend (owner).
    function anchorTransaction(
        bytes32 txId,
        bytes32 payloadHash,
        bytes32 facturaHash,
        address emisor,
        address receptor,
        uint256 monto,
        Tipo tipo
    ) external onlyOwner {
        require(!anchors[txId].exists, "ALREADY_ANCHORED");
        require(emisor != address(0) && receptor != address(0), "ZERO_PARTY");

        anchors[txId] = Anchor({
            payloadHash: payloadHash,
            facturaHash: facturaHash,
            emisor: emisor,
            receptor: receptor,
            monto: monto,
            tipo: tipo,
            estado: Estado.REGISTRADA,
            createdAt: uint64(block.timestamp),
            exists: true
        });

        emit TransactionAnchored(txId, payloadHash, facturaHash, emisor, receptor, monto, tipo);
    }

    // ─────────────────────────── #2: transiciones co-firmadas ───────────────────────────

    function confirmInvoice(
        bytes32 txId,
        uint256 nonce,
        uint256 deadline,
        bytes calldata sigEmisor,
        bytes calldata sigReceptor
    ) external onlyOwner {
        Anchor storage a = _verifyBoth(txId, ACTION_CONFIRMAR, nonce, deadline, sigEmisor, sigReceptor);
        require(a.estado == Estado.REGISTRADA, "BAD_STATE");
        a.estado = Estado.CONFIRMADA;
        emit InvoiceConfirmed(txId, nonce);
    }

    function payInvoice(
        bytes32 txId,
        uint256 nonce,
        uint256 deadline,
        bytes calldata sigEmisor,
        bytes calldata sigReceptor
    ) external onlyOwner {
        Anchor storage a = _verifyBoth(txId, ACTION_PAGAR, nonce, deadline, sigEmisor, sigReceptor);
        require(a.estado == Estado.CONFIRMADA, "BAD_STATE");
        a.estado = Estado.PAGADA;
        emit InvoicePaid(txId, nonce);
    }

    function refund(
        bytes32 txId,
        uint256 nonce,
        uint256 deadline,
        bytes calldata sigEmisor,
        bytes calldata sigReceptor
    ) external onlyOwner {
        Anchor storage a = _verifyBoth(txId, ACTION_REEMBOLSAR, nonce, deadline, sigEmisor, sigReceptor);
        require(a.estado == Estado.PAGADA, "BAD_STATE");
        a.estado = Estado.REEMBOLSADA;
        emit Refunded(txId, nonce);
    }

    // ─────────────────────────── internals ───────────────────────────

    /// @dev Verifica deadline, existencia, nonce monotónico y AMBAS firmas EIP-712.
    ///      El monto firmado se toma del anchor almacenado (vincula el importe sin confiar en params).
    ///      Consume el nonce (efecto de estado) — por eso NO es `view`.
    function _verifyBoth(
        bytes32 txId,
        uint8 action,
        uint256 nonce,
        uint256 deadline,
        bytes calldata sigEmisor,
        bytes calldata sigReceptor
    ) internal returns (Anchor storage a) {
        require(block.timestamp <= deadline, "EXPIRED");
        a = anchors[txId];
        require(a.exists, "UNKNOWN_TX");

        bytes32 nonceKey = keccak256(abi.encodePacked(txId, action));
        require(usedNonce[nonceKey] < nonce, "NONCE_USED");

        bytes32 structHash =
            keccak256(abi.encode(ACTION_TYPEHASH, txId, action, a.monto, nonce, deadline));
        bytes32 digest = _hashTypedDataV4(structHash);

        require(ECDSA.recover(digest, sigEmisor) == a.emisor, "BAD_SIG_EMISOR");
        require(ECDSA.recover(digest, sigReceptor) == a.receptor, "BAD_SIG_RECEPTOR");

        usedNonce[nonceKey] = nonce;
    }

    // ─────────────────────────── views ───────────────────────────

    function getAnchor(bytes32 txId) external view returns (Anchor memory) {
        return anchors[txId];
    }

    /// @notice Expone el domain separator para debug/integración.
    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
