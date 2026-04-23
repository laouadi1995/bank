using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NoxaBank.Api.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;


/*
Ce contrôleur permet à l’administrateur de gérer les clients de la banque.
Il permet de consulter la liste des clients, rechercher un client,
et activer ou désactiver un compte client.
L’accès est sécurisé et seulement les utilisateurs avec le rôle admin peuvent utiliser ces routes.
*/


namespace NoxaBank.Api.Controllers.Admin
{
    [ApiController]
    [Route("api/admin")]
    [Authorize]
    public class AdminClientsController : ControllerBase
    {
        private readonly AppDbContext _db;
        public AdminClientsController(AppDbContext db) => _db = db;

        private int? GetUserIdFromToken()
        {
            var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
            if (int.TryParse(sub, out var id1)) return id1;

            var nameId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (int.TryParse(nameId, out var id2)) return id2;

            var id = User.FindFirstValue("id");
            if (int.TryParse(id, out var id3)) return id3;

            return null;
        }

        private async Task<bool> IsAdmin()
        {
            var userId = GetUserIdFromToken();
            if (userId == null) return false;

            var me = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId.Value);
            if (me == null) return false;

            return !string.IsNullOrWhiteSpace(me.Role) && me.Role.ToLower() == "admin";
        }

        // ✅ GET /api/admin/clients?q=
        [HttpGet("clients")]
        public async Task<IActionResult> GetClients([FromQuery] string? q = null)
        {
            if (!await IsAdmin()) return Forbid();

            var query = _db.Users.AsNoTracking()
                .Where(u => u.Role.ToLower() == "client");

            if (!string.IsNullOrWhiteSpace(q))
            {
                var x = q.Trim().ToLower();
                query = query.Where(u => u.FullName.ToLower().Contains(x) || u.Email.ToLower().Contains(x));
            }

            var clients = await query
                .OrderByDescending(u => u.Id)
                .Select(u => new
                {
                    id = u.Id,
                    fullName = u.FullName,
                    passportId = u.PassportNumber,
                    email = u.Email,
                    phoneNumber = u.Phone,
                    birthDate = u.BirthDate,
                    isActive = u.IsActive
                })
                .ToListAsync();

            return Ok(clients);
        }

        public class UpdateStatusDto
        {
            public bool IsActive { get; set; }
        }

        // ✅ PATCH /api/admin/clients/{id}/status
        [HttpPatch("clients/{id:int}/status")]
        public async Task<IActionResult> UpdateClientStatus(int id, [FromBody] UpdateStatusDto dto)
        {
            if (!await IsAdmin()) return Forbid();

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && u.Role.ToLower() == "client");
            if (user == null) return NotFound(new { message = "Client not found" });

            user.IsActive = dto.IsActive;
            await _db.SaveChangesAsync();

            return Ok(new { id = user.Id, isActive = user.IsActive });
        }

        // ✅ GET /api/admin/clients/search?passport=XXX
        [HttpGet("clients/search")]
        public async Task<IActionResult> SearchClient([FromQuery] string passport)
        {
            if (!await IsAdmin()) return Forbid();

            var pass = (passport ?? "").Trim().ToUpper();
            if (string.IsNullOrWhiteSpace(pass)) return Ok(new List<object>());

            var list = await _db.Users.AsNoTracking()
                .Where(u => u.Role.ToLower() == "client" && u.PassportNumber.ToUpper().Contains(pass))
                .OrderByDescending(u => u.Id)
                .Select(u => new
                {
                    id = u.Id,
                    fullName = u.FullName,
                    passportNumber = u.PassportNumber,
                    email = u.Email,
                    phoneNumber = u.Phone,
                    birthDate = u.BirthDate,
                    isActive = u.IsActive
                })
                .ToListAsync();

            return Ok(list);
        }
    }
}
