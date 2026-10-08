namespace EmailTracking.API.VM
{
    public class GetMailVM
    {
        public string? Id { get; set; }

        public string? Subject { get; set; }

        public List<GetMailRecipientVM>? To { get; set; }
        public string? From { get; set; }

        public DateTime? CreatedAt { get; set; }

        public string? Templete { get; set; }
    }


    public class GetMailRecipientVM
    {
        public string? Email { get; set; }

        public string? Status { get; set; }

        public DateTime? ReadOn { get; set; }
    }

}
