using System.Collections.Concurrent;
using chessBack.Models;
using Microsoft.AspNetCore.SignalR;

namespace chessBack.Hubs;

public class ChessHub : Hub
{
    private static readonly ConcurrentDictionary<string, string> _awaitingPlayer = new ConcurrentDictionary<string, string>();
    private static readonly ConcurrentDictionary<string, string> _connectionToRoom = new ConcurrentDictionary<string, string>();

    public async Task FindNewMatch(string userName)
    {
        Console.WriteLine("!!! 🚨 CRITICAL: FINDNEWMATCH METHOD WAS HIT! 🚨 !!!");
        Console.WriteLine($"[HUB] FindNewMatch called by user: '{userName}', ConnectionId: '{Context.ConnectionId}'");

        var opponent = _awaitingPlayer.FirstOrDefault();
        
        if (opponent.Key != null)
        {
            Console.WriteLine($"[HUB] ✅ MATCH FOUND! Pairing '{userName}' with awaiting player '{opponent.Value}'");
            
            _awaitingPlayer.TryRemove(opponent.Key, out _); 
            
            var roomId = Guid.NewGuid().ToString();
            _connectionToRoom[Context.ConnectionId] = roomId;
            _connectionToRoom[opponent.Key] = roomId;

            await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
            await Groups.AddToGroupAsync(opponent.Key, roomId);

            Console.WriteLine($"[HUB] 📡 Sending 'MatchFound' to opponent (white)");
            await Clients.Client(opponent.Key).SendAsync("MatchFound", roomId, userName, "white");
            
            Console.WriteLine($"[HUB] 📡 Sending 'MatchFound' to caller (black)");
            await Clients.Caller.SendAsync("MatchFound", roomId, opponent.Value, "black");
            
            Console.WriteLine("[HUB] 🏁 FindNewMatch completed successfully.");
        }
        else
        {
            Console.WriteLine($"[HUB] ⏳ No opponent found. Adding '{userName}' to the queue.");
            _awaitingPlayer.TryAdd(Context.ConnectionId, userName);
            
            Console.WriteLine($"[HUB] 📡 Sending 'WaitingForMatch' to caller");
            await Clients.Caller.SendAsync("WaitingForMatch");
            
            Console.WriteLine("[HUB] 🏁 FindNewMatch completed (added to queue).");
        } 
    }

    public async Task MakeOnlineMove(string roomId, object moveData)
    {
        Console.WriteLine($"[HUB] 📡 Broadcasting move in room: {roomId}");
        await Clients.OthersInGroup(roomId).SendAsync("OpponentMove", moveData);
    }

    public async Task CancelSearch()
    {
        Console.WriteLine($"[HUB] ❌ CancelSearch called by ConnectionId: {Context.ConnectionId}");
        _awaitingPlayer.TryRemove(Context.ConnectionId, out _);
        await Clients.Caller.SendAsync("CancelSearch");
    }
}