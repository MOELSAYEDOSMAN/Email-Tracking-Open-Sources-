using EmailTracking.API.Enum;
using EmailTracking.API.Service.Abstact;
using EmailTracking.API.VM;
using MongoDB.Bson.Serialization.Attributes;

namespace EmailTracking.API.Model
{
    public class MailTracking:BaseEntity,IPrototype<GetMailVM>
    {
        [BsonElement(nameof(From)), BsonRepresentation(MongoDB.Bson.BsonType.String)]
        public string From { get; set; }
        [BsonElement(nameof(To)), BsonRepresentation(MongoDB.Bson.BsonType.String)]
        public IEnumerable<string> To { get; set; } = new List<string>();
        
        [BsonElement(nameof(Stauts)), BsonRepresentation(MongoDB.Bson.BsonType.Int32)]
        public MailTrackingStauts Stauts { get; set; } = MailTrackingStauts.Sent;

        [BsonElement(nameof(Subject)), BsonRepresentation(MongoDB.Bson.BsonType.String)]
        public string Subject { get; set; }

        [BsonElement(nameof(Templete)), BsonRepresentation(MongoDB.Bson.BsonType.String)]
        public string Templete { get; set; }

        [BsonElement(nameof(ReadMails))]
        public List<ReadMail> ReadMails { get; set; } = new List<ReadMail>();

        public GetMailVM IClone()
        {
            return new GetMailVM
            {
                Id = this.Id,
                From = this.From,
                To = this.ReadMails.Select(r=>r.IClone()).ToList(),
                Subject = this.Subject,
                Templete = this.Templete,
                CreatedAt = this.CreatedOn
            };
        }
        public MailTracking UpdateStatus(MailTrackingStauts newStatus)
        {
            this.Stauts = newStatus;
            return this;
        }

        public MailTracking UpdateFrom(string from)
        {
            this.From = from;
            return this;
        }

        public MailTracking UpdateTemplete(string newTemplete)
        {
            this.Templete = newTemplete;
            return this;
        }
    }
}
