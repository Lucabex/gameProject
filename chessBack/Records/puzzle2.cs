using System.Text.Json.Serialization;
namespace chessBack.Records;

public record Puzzle2(
    [property:JsonPropertyName("FEN")]string Fen,
    [property:JsonPropertyName("Moves")]string Moves,
    [property:JsonPropertyName("Themes")]string Themes
    
);