using OpenHR.Web.Data;

namespace OpenHR.Web.Components.Shared;

public sealed class NewAttendanceDialogResult
{
    public required string ApplicationUserId { get; init; }
    public required Guid AttendanceTypeKey { get; init; }
    public required IEnumerable<DateOnly> SelectedRangeDates { get; init; }
}
