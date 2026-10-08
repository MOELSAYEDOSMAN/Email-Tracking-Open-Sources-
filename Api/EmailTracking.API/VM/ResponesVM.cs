namespace EmailTracking.API.VM
{
    public record ResponesVM<T>(T data, Enum.StatusCode statusCode = Enum.StatusCode.Success, string message = "", Dictionary<string, string[]> errors = null, object meta = null)
    {
        static ResponesVM<T> Sucss(T Data, string? message, object? meta = null)
            => new ResponesVM<T>(Data, Enum.StatusCode.Success, message, null, meta);

        static ResponesVM<T> BadRequest( string? message, Dictionary<string, string[]>? errors=null, object? meta = null)
             => new ResponesVM<T>(default(T), Enum.StatusCode.BadRequest, message, errors, meta);

        static ResponesVM<T> NotFound(string? message, Dictionary<string, string[]>? errors = null, object? meta = null)
            => new ResponesVM<T>(default(T), Enum.StatusCode.NotFound, message, errors, meta);

        static ResponesVM<T> ServerError(string? message, Dictionary<string, string[]>? errors = null, object? meta = null)
            => new ResponesVM<T>(default(T), Enum.StatusCode.InternalServerError, message, errors, meta);

    }
}
