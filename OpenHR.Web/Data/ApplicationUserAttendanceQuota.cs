namespace OpenHR.Web.Data
{
    public class ApplicationUserAttendanceQuota
    {
        public string ApplicationUserId { get; set; } = default!;

        public Guid AttendanceTypeKey { get; set; }

        public int Quota { get; set; }

        public ApplicationUser ApplicationUser { get; set; } = default!;

        public AttendanceType AttendanceType { get; set; } = default!;
    }
}
