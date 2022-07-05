//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IProject {
    function latestId() external returns(uint256);

    function getSuperAdmin() external view returns (address);

    function getProject(uint256 _projectId) external view returns(ProjectInfo memory);

    function isAdmin(address _account) external view returns(bool);

    function getManager(uint256 _projectId) external view returns(address);

    function getApproval(uint256 _projectId) external view returns(ApprovalInfo memory);
}

struct ProjectInfo {
    uint256 id;
    bool isCreatedByAdmin;
    bool isSingle;
    bool isRaise;
    address token;
    address manager;
    uint256 joinStart;
    uint256 joinEnd;
    uint256 saleStart;
    uint256 saleEnd;
    uint256 distributionStart;
    ProjectStatus status;
}

struct ApprovalInfo {
    uint256 projectId;
    uint256 percent;
    bool isApproved;
}

enum ProjectStatus {
    INACTIVE,
    STARTED,
    ENDED
}