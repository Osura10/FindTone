using System.Globalization;

namespace MusicMarket.Api.Helpers;

/// <summary>
/// Small helpers to clean user text before we save it.
/// </summary>
public static class TextNormalizer
{
    /// <summary>
    /// Trim and collapse inner spaces. Returns null for null, "" or only spaces.
    /// </summary>
    public static string? CleanOrNull(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return string.Join(' ', value.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
    }

    /// <summary>
    /// Free-text names like category and brand: trim, single spaces, Title Case.
    /// If the name matches a known value (ignoring case), the known spelling is used,
    /// e.g. "audio-technica" -> "Audio-Technica", "ELECTRIC GUITAR" -> "Electric Guitar".
    /// Short all-caps words (PRS, ESP, AKG) are kept as they are.
    /// </summary>
    public static string NormalizeName(string? value, IEnumerable<string>? knownValues = null)
    {
        var cleaned = CleanOrNull(value);
        if (cleaned == null) return "";

        if (knownValues != null)
        {
            var known = knownValues.FirstOrDefault(k => string.Equals(k, cleaned, StringComparison.OrdinalIgnoreCase));
            if (known != null) return known;
        }

        var textInfo = CultureInfo.InvariantCulture.TextInfo;
        var words = cleaned.Split(' ').Select(w =>
            w.Length <= 3 && w.All(c => !char.IsLetter(c) || char.IsUpper(c))
                ? w
                : textInfo.ToTitleCase(w.ToLowerInvariant()));
        return string.Join(' ', words);
    }

    /// <summary>
    /// "Good, like_new,,GOOD" -> "good,like_new". Returns null when nothing is left.
    /// </summary>
    public static string? NormalizeConditions(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var parts = value.Split(',')
            .Select(p => p.Trim().ToLowerInvariant())
            .Where(p => p.Length > 0)
            .Distinct()
            .ToList();
        return parts.Count == 0 ? null : string.Join(',', parts);
    }
}
