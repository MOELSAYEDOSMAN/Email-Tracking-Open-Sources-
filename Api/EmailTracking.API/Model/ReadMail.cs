using EmailTracking.API.Enum;
using MongoDB.Bson.Serialization.Attributes;

namespace EmailTracking.API.Model
{
    public class ReadMail:BaseEntity
    {
        [BsonElement(nameof(To)), BsonRepresentation(MongoDB.Bson.BsonType.String)]
        public string To { get; set; }
        [BsonElement(nameof(Status)), BsonRepresentation(MongoDB.Bson.BsonType.Int32)]
        public MailTrackingStauts Status { get; set; }
    }
}
