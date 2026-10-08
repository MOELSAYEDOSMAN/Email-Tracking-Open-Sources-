using EmailTracking.API.DbContextConfiguration;
using EmailTracking.API.Model;
using EmailTracking.API.Service.Abstact;
using MongoDB.Bson;
using MongoDB.Driver;
using System.Linq.Expressions;

namespace EmailTracking.API.Service
{
    public class MongoRepository<T> : IMongoRepository<T> where T:BaseEntity
    {
        private readonly IMongoCollection<T> _collection;

        public MongoRepository(ApplicationMongoDBContext context)
        {
            _collection = context.GetDataBase().GetCollection<T>($"{typeof(T).Name??"Mail"}s");
        }

        public async Task<T?> GetByIdAsync(string id)
        {
            var filter = Builders<T>.Filter.Eq("_id", new ObjectId(id));

            return await _collection
                .Find(filter)
                .FirstOrDefaultAsync();
        }

        public async Task<IEnumerable<T>> GetAllAsync()
        {
            return await _collection
                .Find(Builders<T>.Filter.Empty)
                .ToListAsync();
        }

        public async Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> filter)
        {
            return await _collection.Find(filter)
                .ToListAsync();
        }

        public async Task InsertAsync(T entity)
        {
            await _collection.InsertOneAsync(entity);
        }

        public async Task InsertManyAsync(
            IEnumerable<T> entities)
        {
            await _collection.InsertManyAsync(entities);
        }

        public async Task UpdateAsync(string id,T entity)
        {
            var filter = Builders<T>.Filter.Eq("_id", new ObjectId(id));

            await _collection.ReplaceOneAsync(
                filter,
                entity);
        }

        public async Task DeleteAsync(string id)
        {
            var filter = Builders<T>.Filter.Eq("_id", new ObjectId(id));

            await _collection.DeleteOneAsync(filter);
        }

        public async Task<bool> ExistsAsync(Expression<Func<T, bool>> filter)
        {
            return await _collection
                .Find(filter)
                .AnyAsync();
        }

        public IMongoCollection<T> DbContext()
            => _collection;
    }
}
