using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OpenHR.Web.Data;

public sealed class AttendanceType
{
    [DatabaseGenerated(DatabaseGeneratedOption.Identity), Key]
    public Guid? Key { get; set; }


    [Required, Length(3,20)]
    public string? AttendanceName { get; set; }


    [Required, Length(1, 3)]
    public string? AttendanceShortName { get; set; }

    [Required]
    public bool? IsAbsent { get; set; }

    [Required, DefaultValue(false)]
    public bool? HasQuota { get; set; }

    [Length(7, 7)]
    [RegularExpression("^#([0-9a-fA-F]{6})$")]
    public string? Color { get; set; }

    public ICollection<ApplicationUserAttendanceQuota> UserQuotaLinks { get; set; } = [];

}
