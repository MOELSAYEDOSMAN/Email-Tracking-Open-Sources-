using MongoDB.Driver;
namespace EmailTracking.API.DbContextConfiguration
{
    public class ApplicationMongoDBContext
    {
        readonly IMongoDatabase Database;
        public ApplicationMongoDBContext(IConfiguration configuration)
        {
            string connectionStrring = configuration.GetConnectionString("DefaultConnection");
            var mongoUrl = MongoUrl.Create(connectionStrring);
            var mongoClient = new MongoClient(mongoUrl);
            Database = mongoClient.GetDatabase(mongoUrl.DatabaseName);
        }

        public IMongoDatabase GetDataBase() => Database;



    }
}
