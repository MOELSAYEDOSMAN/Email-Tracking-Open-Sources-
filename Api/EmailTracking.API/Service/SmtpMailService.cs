using EmailTracking.API.Configuration;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace EmailTracking.API.Service
{
    public class SmtpMailService
    {
        readonly EmailSetting emailSetting;
        public SmtpMailService(IConfiguration configuration)
        {
            emailSetting = configuration.GetSection("EmailSetting").Get<EmailSetting>();
        }

        public async Task SendEmailAsync(string to, string subject, string body)
        {
            var message = new MimeMessage();

            message.From.Add(new MailboxAddress(emailSetting.SenderEmail, emailSetting.SenderEmail));

            message.To.Add(MailboxAddress.Parse(to));

            message.Subject = subject;

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = body
            };

            message.Body = bodyBuilder.ToMessageBody();

            using var smtp = new SmtpClient();

            await smtp.ConnectAsync(
                emailSetting.SmtpServer,
                emailSetting.SmtpPort,
                SecureSocketOptions.StartTls
            );

            await smtp.AuthenticateAsync(
                emailSetting.SenderEmail,
                emailSetting.SmtpPassword
            );

            await smtp.SendAsync(message);

            await smtp.DisconnectAsync(true);
        }
    }
}
