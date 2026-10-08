using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace EmailTracking.API.Model
{
    public class BaseEntity
    {
        [BsonId]
        [BsonElement("_id"),BsonRepresentation(MongoDB.Bson.BsonType.ObjectId)] 
        public string Id { get; set; }

        [BsonElement(nameof(CreateBy)), BsonRepresentation(MongoDB.Bson.BsonType.String)]
        public string? CreateBy { get; set; }

        [BsonElement(nameof(MofiyBy)), BsonRepresentation(MongoDB.Bson.BsonType.String)]
        public string? MofiyBy { get; set; }

        [BsonElement(nameof(DeletedBy)), BsonRepresentation(MongoDB.Bson.BsonType.String)]
        public string? DeletedBy { get; set; }

        [BsonElement(nameof(CreatedOn)), BsonRepresentation(MongoDB.Bson.BsonType.DateTime)]
        public DateTime? CreatedOn { get; set; }

        [BsonElement(nameof(MofiyOn)), BsonRepresentation(MongoDB.Bson.BsonType.DateTime)]
        public DateTime? MofiyOn { get; set; }

        [BsonElement(nameof(DeletedOn)), BsonRepresentation(MongoDB.Bson.BsonType.DateTime)]
        public DateTime? DeletedOn { get; set; }

        [BsonElement(nameof(IsDeleted)), BsonRepresentation(MongoDB.Bson.BsonType.Boolean)]
        public bool IsDeleted { get; set; }

        public BaseEntity()
        {
            this.CreatedOn = DateTime.UtcNow;
            this.MofiyOn = DateTime.UtcNow;
            this.IsDeleted = false;
            this.Id = ObjectId.GenerateNewId().ToString();
        }

        public BaseEntity UpdateAlert()
        {
            this.MofiyOn = DateTime.UtcNow;
            return this;
        }
    }
}
