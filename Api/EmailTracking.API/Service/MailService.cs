using EmailTracking.API.Heleper;
using EmailTracking.API.Model;
using EmailTracking.API.Service.Abstact;
using EmailTracking.API.VM;
using MongoDB.Driver;

namespace EmailTracking.API.Service
{
    public class MailService(IMongoRepository<MailTracking> context, IHttpContextAccessor httpContext, SmtpMailService smtpMailService,IConfiguration configuration)
    {

        public async Task<bool> CreateMail(AddMailVM newMial)
        {

            var data = newMial.IClone();
            data = data
                .UpdateFrom(configuration["EmailSetting:SmtpUser"]??"Me");
           
            await context.InsertAsync(data);

            string template = data.Templete
                .AddSecrectTempelete($"{httpContext.HttpContext.Request.Scheme}://{httpContext.HttpContext.Request.Host.Value}", data.Id);
                


            foreach (var to in data.To)
            {

                await smtpMailService.SendEmailAsync(to, newMial.Sbject,template.ReplaceSecrectTempelete(to));
            }

            return true;
        }


        public async Task UpdateReadStatus(string mailId, string email)
        {
            var data = await context.GetByIdAsync(mailId);
            if (data != null)
            {
                var to = data.To.FirstOrDefault(t => t == email);
                if (to != null)
                {

                    if (data.ReadMails.FirstOrDefault(r => r.To == email) != null)
                    {
                        data.ReadMails.FirstOrDefault(r => r.To == email).UpdateStuats(Enum.MailTrackingStauts.Opened);
                    }
                    else
                    {
                       data.ReadMails.Add(new ReadMail() { To = email, Status = Enum.MailTrackingStauts.Delivered });
                    }

                    await context.UpdateAsync(data.Id, data);
                }
            }
        }


        public async Task<IEnumerable<GetMailVM>> GetLastMailAsync()
        {
            var data = await context.DbContext().Find(x => !x.IsDeleted).SortByDescending(x => x.CreatedOn).ToListAsync();
            return data.Select(d => d.IClone()).ToList();
        }

    }
}
