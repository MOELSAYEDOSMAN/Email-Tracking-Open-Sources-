namespace EmailTracking.API.Service.Abstact
{
    public interface IPrototype<T>
    {
        public T IClone();
    }
}
