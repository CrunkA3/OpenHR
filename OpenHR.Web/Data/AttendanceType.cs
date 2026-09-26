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
}
