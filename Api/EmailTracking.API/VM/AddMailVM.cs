using EmailTracking.API.Model;
using EmailTracking.API.Service.Abstact;
using System.ComponentModel.DataAnnotations;

namespace EmailTracking.API.VM
{
    public class AddMailVM: IPrototype<MailTracking>
    {
        [MinLength(1)]
        public AddEmailToVM[] To { get; set; }

        [Required]
        public string Templete { get; set; }

        [Required]
        public string Sbject { get; set; }

        
        
        
        public MailTracking IClone()
        {
            return new()
            {
                From = "Me",
                Subject = this.Sbject,
                Stauts = Enum.MailTrackingStauts.Sent,
                To = this.To.Select(t => t.To),
                Templete = this.Templete
            };
        }
    }

    public class AddEmailToVM
    {
        [Required,EmailAddress]
        public string To { get; set; }
    }
}
