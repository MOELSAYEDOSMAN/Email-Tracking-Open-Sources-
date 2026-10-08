using EmailTracking.API.Enum;
using EmailTracking.API.Service.Abstact;
using EmailTracking.API.VM;
using MongoDB.Bson.Serialization.Attributes;

namespace EmailTracking.API.Model
{
    public class ReadMail:BaseEntity,IPrototype<GetMailRecipientVM>
    {
        [BsonElement(nameof(To)), BsonRepresentation(MongoDB.Bson.BsonType.String)]
        public string To { get; set; }
        [BsonElement(nameof(Status)), BsonRepresentation(MongoDB.Bson.BsonType.Int32)]
        public MailTrackingStauts Status { get; set; }


        public ReadMail UpdateStuats(MailTrackingStauts newStatus)
        {
            UpdateAlert();
            this.Status = newStatus;
            return this;
        }

        


        public GetMailRecipientVM IClone()
        {
            return new GetMailRecipientVM
            {
                Email = this.To,
                Status = this.Status.ToString(),
                ReadOn = this.MofiyOn
            };
        }
    }
}
