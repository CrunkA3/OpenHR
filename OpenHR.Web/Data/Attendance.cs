using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OpenHR.Web.Data;

public class Attendance
{
    [DatabaseGenerated(DatabaseGeneratedOption.Identity), Key]
    public Guid? Key { get; set; }

    [Required]
    public string ApplicationUserId { get; set; } = default!;

    [Required]
    public Guid AttendanceTypeKey { get; set; }

    [Required]
    public DateTime Date { get; set; }

    [Required, DefaultValue(1)]
    public decimal Amount { get; set; } = 1;





    public ApplicationUser ApplicationUser { get; set; } = default!;

    public AttendanceType AttendanceType { get; set; } = default!;


}
