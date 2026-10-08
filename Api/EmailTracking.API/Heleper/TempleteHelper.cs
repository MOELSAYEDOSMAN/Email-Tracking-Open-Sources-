namespace EmailTracking.API.Heleper
{
    public static class TempleteHelper
    {
        public static string AddSecrectTempelete(this string templete, string apiRequest,string messageId)
            => templete = $"<html>{templete} <img src=\"{apiRequest}/api/Mail/Read/{messageId}\"  width=\"1\" height=\"1\"></html>";
    }
}
