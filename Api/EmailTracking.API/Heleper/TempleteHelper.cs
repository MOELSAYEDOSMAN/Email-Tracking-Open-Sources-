namespace EmailTracking.API.Heleper
{
    public static class TempleteHelper
    {
        public static string AddSecrectTempelete(this string templete, string apiRequest,string messageId)
            => templete = $"<html>{templete} <img src=\"{apiRequest}/api/Mail/Read/{messageId}/{{to}}\" style=\"display:none\"  width=\"1\" height=\"1\"></html>";
    
    
        public static string ReplaceSecrectTempelete(this string templete, string to)
            => templete = templete.Replace("{to}", to);

    }
}
