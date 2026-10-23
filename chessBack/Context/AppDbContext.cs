using chessBack.Models;
using Microsoft.EntityFrameworkCore;
namespace chessBack.Context;

public class AppDbContext: DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
        
    }
    public DbSet<User>User{get;set;}
}