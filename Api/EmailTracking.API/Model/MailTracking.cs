using EmailTracking.API.Enum;
using MongoDB.Bson.Serialization.Attributes;

namespace EmailTracking.API.Model
{
    public class MailTracking:BaseEntity
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
        public IEnumerable<ReadMail> ReadMails { get; set; } = new List<ReadMail>();


        public MailTracking UpdateTemplete(string newTemplete)
        {
            this.Templete = newTemplete;
            return this;
        }
    }
}
