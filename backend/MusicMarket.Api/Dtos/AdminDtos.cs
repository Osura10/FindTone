namespace MusicMarket.Api.Dtos;

public record UpdateApprovalDto(
    bool Approval
);

public record AdminStatsDto(
    int TotalBuyers,
    int ApprovedShops,
    int PendingShops,
    int ApprovedAdmins,
    int PendingAdmins,
    int TotalUsers
);

public record CreateAdminDto(
    string Name,
    string Email,
    string PhoneNumber,
    string NicCardNumber
);
