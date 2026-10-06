using System.ComponentModel.DataAnnotations;

namespace OpenHR.Web.Data
{
    public class ApplicationUserAttendanceQuota
    {
        public string ApplicationUserId { get; set; } = default!;

        public Guid AttendanceTypeKey { get; set; }

        [Required]
        public int Quota { get; set; }


        [Required]
        public int ValidFromYear { get; set; }



        public ApplicationUser ApplicationUser { get; set; } = default!;

        public AttendanceType AttendanceType { get; set; } = default!;
    }
}
