using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OpenHR.Web.Data;

public class OrganisationUnit
{
    [DatabaseGenerated(DatabaseGeneratedOption.Identity), Key]
    public Guid? Key { get; set; }

    [Required, Length(3, 20)]
    public string? OrganisationUnitName { get; set; }

    [Required, Length(1, 5)]
    public string? OrganisationUnitShortName { get; set; }
}
