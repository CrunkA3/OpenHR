using OpenHR.Web.Data;

namespace OpenHR.Web.Components.Shared;

public sealed class NewAttendanceDialogResult
{
    public required Attendance Attendance { get; init; }
    public required DateOnly StartDate { get; init; }
    public required DateOnly EndDate { get; init; }
    public required HashSet<DayOfWeek> SelectedDays { get; init; }
}
