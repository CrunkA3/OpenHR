namespace OpenHR.Api.Domain;

public enum UserRole
{
    Employee,
    Manager,
    Administrator,
}

public enum AbsenceUnit
{
    Workdays,
    Hours,
}

public enum ApprovalRequirement
{
    None,
    Manager,
}

public enum AbsenceStatus
{
    Pending,
    Approved,
    Rejected,
    Reported,
}

public sealed class Employee
{
    public Guid Id { get; set; }
    public required string DisplayName { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public UserRole Role { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public Guid? ManagerId { get; set; }
    public Guid? VacationApprovalManagerId { get; set; }
    public decimal VacationEntitlementDays { get; set; }
    public bool IsActive { get; set; } = true;
    public ICollection<AbsenceRequest> AbsenceRequests { get; } = new List<AbsenceRequest>();
}

public sealed class AbsenceType
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public AbsenceUnit Unit { get; set; }
    public ApprovalRequirement ApprovalRequirement { get; set; }
    public bool IsSickness { get; set; }
    public bool IsVacation { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class AbsenceRequest
{
    public Guid Id { get; set; }
    public Guid EmployeeId { get; set; }
    public Employee? Employee { get; set; }
    public Guid AbsenceTypeId { get; set; }
    public AbsenceType? AbsenceType { get; set; }
    public DateOnly StartsOn { get; set; }
    public DateOnly EndsOn { get; set; }
    public decimal Amount { get; set; }
    public AbsenceStatus Status { get; set; }
    public string? Note { get; set; }
    public Guid? DecidedById { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? DecidedAt { get; set; }
    public string? DecisionNote { get; set; }
}

public sealed class NonWorkingDay
{
    public Guid Id { get; set; }
    public DateOnly Date { get; set; }
    public required string Label { get; set; }
}

public sealed class AppNotification
{
    public Guid Id { get; set; }
    public Guid RecipientId { get; set; }
    public required string Message { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? ReadAt { get; set; }
}
