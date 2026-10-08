namespace EmailTracking.API.Configuration
{
    public class EmailSetting
    {
        public string SmtpServer { get; set; }
        public int SmtpPort { get; set; }
        public string SmtpUser { get; set; }
        public string SmtpPassword { get; set; }
        public string SenderEmail { get; set; }
    }
}
