namespace EasyToRead.Api;

internal static class FormDataParser
{
    internal static Dictionary<string, string> Parse(string body)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        if (string.IsNullOrEmpty(body))
            return result;

        foreach (var part in body.Split('&'))
        {
            var idx = part.IndexOf('=');
            if (idx < 0) continue;

            var key = Uri.UnescapeDataString(part[..idx].Replace('+', ' '));
            var value = Uri.UnescapeDataString(part[(idx + 1)..].Replace('+', ' '));
            result[key] = value;
        }

        return result;
    }
}
