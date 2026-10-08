using EmailTracking.API.Model;
using System.Linq.Expressions;

namespace EmailTracking.API.Service.Abstact
{
    public interface IMongoRepository<T> where T : BaseEntity
    {
        Task<T?> GetByIdAsync(string id);

        Task<IEnumerable<T>> GetAllAsync();

        Task<IEnumerable<T>> FindAsync(
            Expression<Func<T, bool>> filter);

        Task InsertAsync(T entity);

        Task InsertManyAsync(IEnumerable<T> entities);

        Task UpdateAsync(
            string id,
            T entity);

        Task DeleteAsync(string id);

        Task<bool> ExistsAsync(
            Expression<Func<T, bool>> filter);
    }
}
