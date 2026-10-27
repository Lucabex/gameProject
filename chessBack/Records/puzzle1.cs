using System.ComponentModel;
using System.Text.Json.Serialization;

namespace chessBack.Records;
public record Puzzle1(
    [property:JsonPropertyName("puzzle")]DailyPuzzle Puzzle
);

public record DailyPuzzle(
    [property:JsonPropertyName("fen")]string Fen,
    [property:JsonPropertyName("solution")]List<string> Solution,
    [property:JsonPropertyName("themes")]List<string> Themes
);