namespace chessBack.Models;

public class User
{
    public int Id {get;set;}
    public string? UserName {get;set;}
    public string? HashedPassord{get;set;}
    public int Attempt {get;set;}=0;
    public int Solved{get;set;}=0;
}