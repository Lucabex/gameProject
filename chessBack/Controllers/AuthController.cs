using chessBack.Context;
using chessBack.Models;
using chessBack.Services;
using Microsoft.AspNetCore.Mvc;
using chessBack.DTO;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using chessBack.Records;

namespace chessBack.Controllers;
[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IHttpClientFactory _factroy;
    private readonly JwtService _jwt;

    public AuthController(IHttpClientFactory factory,AppDbContext context,JwtService jwt)
    {
        _context = context;
        _factroy = factory;
        _jwt = jwt;

    }
    [HttpPost("log")]
    public async Task<IActionResult> Log(InputDto dto)
    {
        //check if the user correctly input username and password
        if(string.IsNullOrEmpty(dto.UserName)|| string.IsNullOrEmpty(dto.Password))
        {
            return BadRequest("Missing username or password");
        }
        //store the user data inside user
        var user = await _context.User.FirstOrDefaultAsync(u=>u.UserName.ToLower() == dto.UserName.ToLower());
        //check if user exists and if the password match the one stored in the db
        if(user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.HashedPassord))
        {
            return BadRequest("Invalid userName or Passowrd");
        }
        //if user exist and password is correct genenrate token
        var token = _jwt.GenerateToken(user);

        var name = user.UserName;
        var id = user.Id;
        var attempt = user.Attempt;
        var solved = user.Solved;
        return Ok(new
        {
            message=$"{user.UserName} correctly logge in",
            Token= token,
            Id = id,
            UserName = name,
            Attempt = attempt,
            Solved = solved,
            });

    }
    [HttpPost("reg")]
    public async Task<IActionResult> Reg(InputDto dto)
    {
         //check if the user correctly input username and password
        if(string.IsNullOrEmpty(dto.UserName)|| string.IsNullOrEmpty(dto.Password))
        {
            return BadRequest("Missing username or password");
        }
        if(await _context.User.AnyAsync(u=>u.UserName.ToLower()== dto.UserName.ToLower()))
        {
            return BadRequest("UserName already in use");

        }
        var user = new User
        {
            UserName = dto.UserName,
            HashedPassord = BCrypt.Net.BCrypt.HashPassword(dto.Password),
        };
        _context.User.Add(user);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            Message = $"{user.UserName} correctly registered",
            
        });
    }
    [HttpGet("puz")]
    [Authorize]
    public async Task<IActionResult> Puzz1(){

        var userClaimId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if(string.IsNullOrEmpty(userClaimId) || !int.TryParse(userClaimId,out int userId))
        {
            return Unauthorized("Please log-in");
        }
        var url= "https://lichess.org/api/puzzle/daily";
        var client = _factroy.CreateClient();
        var response = await client.GetFromJsonAsync<Puzzle1>(url);
        if(response?.Puzzle.Fen == null || response?.Puzzle.Solution == null || response?.Puzzle.Themes == null)
        {
            return StatusCode(503,"Service not available try agin later");
        }

        return Ok(response);

    }
     [HttpGet("puz2")]
     [Authorize]
    public async Task<IActionResult> GetPuzzle2()
    {
        var userClaimId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if(userClaimId == null || !int.TryParse(userClaimId,out int userId))
        {
            return Unauthorized("Please log-in");
        }
        var client = _factroy.CreateClient();
        var url = "https://chess-puzzles-api.vercel.app/puzzles?themes=mateIn4&min_rating=800&max_rating=2000&limit=20";       
        var response = await client.GetFromJsonAsync<List<Puzzle2>>(url);

    if (response == null || response.Count == 0 || response.Count <20)
    {
        return StatusCode(503, "No puzzles available from API");
    }
    int randomNumber = Random.Shared.Next(0,21);

    return Ok(response[randomNumber]);
    }
    
}