using EmailTracking.API.Heleper;
using EmailTracking.API.Model;
using EmailTracking.API.Service.Abstact;
using EmailTracking.API.VM;

namespace EmailTracking.API.Service
{
    public class MailService(IMongoRepository<MailTracking> context , IHttpContextAccessor httpContext, SmtpMailService smtpMailService)
    {

        public async Task<bool> CreateMail(AddMailVM newMial)
        {
            
            var data = newMial.IClone();
            data = data.UpdateTemplete(data.Templete.AddSecrectTempelete($"{httpContext.HttpContext.Request.Scheme}://{httpContext.HttpContext.Request.Host.Value}", data.Id));
            await context.InsertAsync(data);
            foreach (var to in data.To)
            {
                await smtpMailService.SendEmailAsync(to,newMial.Sbject, data.Templete);
            }

            return true;
        }


        public async Task UpdateReadStatus(string mailId)
        {
            var data = await context.GetByIdAsync(mailId);
            var email = "";
            if (data != null)
            {


                var to = data.To.FirstOrDefault(x => x == email);
                if (to != null)
                {
                    data.ReadMails = data.ReadMails.Append(new ReadMail() { To = email, Status = Enum.MailTrackingStauts.Opened });
                    await context.UpdateAsync(data.Id, data);
                }
            }
        }



    }
}
