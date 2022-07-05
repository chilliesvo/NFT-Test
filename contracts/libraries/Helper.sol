// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

library Helper {
	function safeTransferNative(
		address to,
		uint256 value
	) internal {
		(bool success, ) = to.call{ value: value }(new bytes(0));
		require(success, "SafeTransferNative: transfer failed");
	}
}
