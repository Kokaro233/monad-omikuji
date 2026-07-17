// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title Monad Omikuji
/// @notice Records one pseudo-random shrine fortune per wallet per UTC day.
/// @dev Demo randomness is not safe for valuable outcomes. A production release
///      should use a verifiable randomness provider such as Chainlink VRF.
contract FortuneContract {
    uint256 public constant MAX_DAILY_DRAWS = 10;
    struct FortuneRecord {
        address wallet;
        uint256 fortuneId;
        uint256 timestamp;
    }

    mapping(address => uint256) public lastDrawDay;
    mapping(address => mapping(uint256 => uint256)) public drawsPerDay;
    mapping(address => FortuneRecord[]) private records;

    event FortuneDrawn(address indexed user, uint256 fortuneId, uint256 timestamp);

    error DailyLimitReached(uint256 nextDrawTimestamp);

    function drawFortune() external returns (uint256 fortuneId) {
        uint256 currentDay = block.timestamp / 1 days;
        if (drawsPerDay[msg.sender][currentDay] >= MAX_DAILY_DRAWS) {
            revert DailyLimitReached((currentDay + 1) * 1 days);
        }

        uint256 roll = uint256(
            keccak256(
                abi.encodePacked(
                    block.prevrandao,
                    block.timestamp,
                    msg.sender,
                    records[msg.sender].length
                )
            )
        ) % 100;

        fortuneId = _fortuneForRoll(roll);
        lastDrawDay[msg.sender] = currentDay;
        drawsPerDay[msg.sender][currentDay] += 1;
        records[msg.sender].push(FortuneRecord(msg.sender, fortuneId, block.timestamp));
        emit FortuneDrawn(msg.sender, fortuneId, block.timestamp);
    }

    function canDraw(address user) external view returns (bool) {
        return drawsPerDay[user][block.timestamp / 1 days] < MAX_DAILY_DRAWS;
    }

    function getLatestFortune(address user) external view returns (FortuneRecord memory) {
        uint256 length = records[user].length;
        require(length > 0, "No fortune found");
        return records[user][length - 1];
    }

    function getFortuneAt(address user, uint256 index) external view returns (FortuneRecord memory) {
        return records[user][index];
    }

    function getRecordCount(address user) external view returns (uint256) {
        return records[user].length;
    }

    function previewFortuneForRoll(uint256 roll) external pure returns (uint256) {
        require(roll < 100, "Roll out of range");
        return _fortuneForRoll(roll);
    }

    function _fortuneForRoll(uint256 roll) private pure returns (uint256) {
        if (roll < 5) return 0;  // 5%  Great Blessing / SSR
        if (roll < 17) return 1; // 12% Rising Fortune / SR
        if (roll < 35) return 2; // 18% Gentle Blessing / SR
        if (roll < 60) return 3; // 25% Good Fortune / R
        if (roll < 80) return 4; // 20% Future Fortune / R
        if (roll < 95) return 5; // 15% Caution / R
        return 6;                // 5% Great Caution / R
    }
}
