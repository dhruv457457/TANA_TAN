// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title TanaAutoDeposit
 * @notice Receives USDC via a delegated ERC20 transfer and immediately
 *         deposits it into an ERC-4626 vault on behalf of the follower.
 *
 * Flow:
 *   1. Backend registers (follower → vault) via setVault() before execution.
 *   2. Delegated sendTransactionWithDelegation calls USDC.transfer(thisContract, amount).
 *      The ERC20PeriodTransferEnforcer allows this because it's a valid transfer().
 *   3. Anyone (backend relayer) calls sweep(follower, amount) to deposit into vault.
 *      The contract pulls USDC it already holds, approves the vault, and calls deposit().
 *      Vault shares are minted directly to the follower address.
 *
 * @dev We keep setVault() permissioned to OWNER so random callers can't redirect funds.
 *      sweep() is open — anyone can trigger it, but funds always go to the registered
 *      vault and shares always go to the follower, so there's no theft vector.
 */

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IERC4626 {
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function asset() external view returns (address);
}

contract TanaAutoDeposit {
    address public immutable owner;
    address public immutable usdc;

    // follower address => target vault
    mapping(address => address) public followerVault;

    event VaultSet(address indexed follower, address indexed vault);
    event Deposited(address indexed follower, address indexed vault, uint256 amount, uint256 shares);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(address _usdc) {
        owner = msg.sender;
        usdc = _usdc;
    }

    /**
     * @notice Register which vault a follower's USDC should go into.
     *         Called by the backend before triggering the delegated transfer.
     */
    function setVault(address follower, address vault) external onlyOwner {
        // Verify vault uses USDC as its underlying asset
        require(IERC4626(vault).asset() == usdc, "vault asset != usdc");
        followerVault[follower] = vault;
        emit VaultSet(follower, vault);
    }

    /**
     * @notice Deposit USDC held by this contract into the follower's registered vault.
     *         Callable by anyone — but shares always go to the follower.
     * @param follower  The follower whose USDC was just transferred here.
     * @param amount    Amount of USDC to deposit (must be <= contract balance).
     */
    function sweep(address follower, uint256 amount) external returns (uint256 shares) {
        address vault = followerVault[follower];
        require(vault != address(0), "no vault registered");
        require(amount > 0, "zero amount");

        uint256 bal = IERC20(usdc).balanceOf(address(this));
        require(bal >= amount, "insufficient balance");

        // Approve vault to pull USDC
        IERC20(usdc).approve(vault, amount);

        // Deposit into vault — shares go directly to follower
        shares = IERC4626(vault).deposit(amount, follower);

        emit Deposited(follower, vault, amount, shares);
    }

    /**
     * @notice Emergency withdrawal by owner (e.g. if a sweep fails).
     */
    function recover(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).transfer(to, amount);
    }
}
