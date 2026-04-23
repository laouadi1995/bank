using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NoxaBank.Api.Data;
using NoxaBank.Api.Models;

namespace NoxaBank.Api.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/profile")]
    public class AdminProfileController : ControllerBase
    {
        private readonly AppDbContext _db;

        public AdminProfileController(AppDbContext db)
        {
            _db = db;
        }

        // ========= DTOs =========
        public record CreateClientDto(
            string FullName,
            string Email,
            string Phone,
            string PassportNumber,
            DateTime? BirthDate,
            string Password,
            bool IsActive
        );

        public record UpdateClientDto(
            string FullName,
            string Email,
            string Phone,
            DateTime? BirthDate,
            bool IsActive
        );

        // ========= CREATE =========
        // ✅ IMPORTANT: on accepte les 2 routes pour éviter le 405
        // - /api/admin/profile/clients (route "logique")
        // - /api/admin/clients        (route "ancienne" utilisée par ton frontend)
        [HttpPost("clients")]
        [HttpPost("/api/admin/clients")]
        public async Task<IActionResult> CreateClient([FromBody] CreateClientDto dto)
        {
            if (dto == null)
                return BadRequest(new { message = "Body invalide." });

            if (string.IsNullOrWhiteSpace(dto.FullName) ||
                string.IsNullOrWhiteSpace(dto.Email) ||
                string.IsNullOrWhiteSpace(dto.Phone) ||
                string.IsNullOrWhiteSpace(dto.PassportNumber) ||
                string.IsNullOrWhiteSpace(dto.Password))
            {
                return BadRequest(new { message = "Champs requis manquants." });
            }

            // ✅ Vérifs d'unicité
            if (await _db.Users.AnyAsync(u => u.PassportNumber == dto.PassportNumber))
                return BadRequest(new { message = "Client déjà existant (Passport Number doit être unique)." });

            if (await _db.Users.AnyAsync(u => u.Email == dto.Email))
                return BadRequest(new { message = "Email déjà utilisé." });

            if (await _db.Users.AnyAsync(u => u.Phone == dto.Phone))
                return BadRequest(new { message = "Phone déjà utilisé." });

            var client = new User
            {
                FullName = dto.FullName,
                Email = dto.Email,
                Phone = dto.Phone,
                PassportNumber = dto.PassportNumber,
                BirthDate = dto.BirthDate,
                Role = "client",
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            var hasher = new PasswordHasher<User>();
            client.PasswordHash = hasher.HashPassword(client, dto.Password);

            _db.Users.Add(client);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Inscription réussie", id = client.Id });
        }

        // ========= READ (search by passport) =========
        // GET /api/admin/profile/clients/by-passport/ABC123
        [HttpGet("clients/by-passport/{passport}")]
        [HttpGet("/api/admin/clients/by-passport/{passport}")]
        public async Task<IActionResult> GetByPassport(string passport)
        {
            if (string.IsNullOrWhiteSpace(passport))
                return BadRequest(new { message = "Passport vide." });

            var user = await _db.Users
                .Where(u => u.Role.ToLower() == "client" && u.PassportNumber == passport)
                .Select(u => new
                {
                    u.Id,
                    u.FullName,
                    u.Email,
                    PhoneNumber = u.Phone,
                    PassportId = u.PassportNumber,
                    u.BirthDate,
                    u.IsActive
                })
                .FirstOrDefaultAsync();

            if (user == null)
                return NotFound(new { message = "Client introuvable." });

            return Ok(user);
        }

        // ========= UPDATE =========
        // PUT /api/admin/profile/clients/5
        [HttpPut("clients/{id:int}")]
        [HttpPut("/api/admin/clients/{id:int}")]
        public async Task<IActionResult> UpdateClient(int id, [FromBody] UpdateClientDto dto)
        {
            var client = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && u.Role.ToLower() == "client");
            if (client == null) return NotFound(new { message = "Client introuvable." });

            // Unicité email/phone si changement
            if (!string.Equals(client.Email, dto.Email, StringComparison.OrdinalIgnoreCase))
            {
                if (await _db.Users.AnyAsync(u => u.Email == dto.Email && u.Id != id))
                    return BadRequest(new { message = "Email déjà utilisé." });
            }

            if (!string.Equals(client.Phone, dto.Phone, StringComparison.OrdinalIgnoreCase))
            {
                if (await _db.Users.AnyAsync(u => u.Phone == dto.Phone && u.Id != id))
                    return BadRequest(new { message = "Phone déjà utilisé." });
            }

            client.FullName = dto.FullName;
            client.Email = dto.Email;
            client.Phone = dto.Phone;
            client.BirthDate = dto.BirthDate;
            client.IsActive = dto.IsActive;

            await _db.SaveChangesAsync();
            return Ok(new { message = "Client modifié." });
        }

        // ========= DELETE =========
        // DELETE /api/admin/profile/clients/5
        [HttpDelete("clients/{id:int}")]
        [HttpDelete("/api/admin/clients/{id:int}")]
        public async Task<IActionResult> DeleteClient(int id)
        {
            var client = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && u.Role.ToLower() == "client");
            if (client == null) return NotFound(new { message = "Client introuvable." });

            _db.Users.Remove(client);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Client supprimé." });
        }
    }
}
