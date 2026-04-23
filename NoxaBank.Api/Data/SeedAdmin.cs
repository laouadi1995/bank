using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NoxaBank.Api.Models;

namespace NoxaBank.Api.Data
{
    public static class SeedAdmin
    {
        public static async Task EnsureAdminAsync(AppDbContext db)
        {
            var adminPassport = "ADMIN0001";
            var adminEmail = "noxabank@gmail.com";
            
            // Check if admin exists by passport number
            var existingAdmin = await db.Users.FirstOrDefaultAsync(u => u.PassportNumber == adminPassport);
            
            if (existingAdmin != null)
            {
                // Update email if different
                if (existingAdmin.Email != adminEmail)
                {
                    existingAdmin.Email = adminEmail;
                    db.Users.Update(existingAdmin);
                    await db.SaveChangesAsync();
                }
                return;
            }

            var admin = new User
            {
                FullName = "Noxa Admin",
                Email = adminEmail,
                Phone = "0000000000",
                PassportNumber = adminPassport,
                Role = "admin",
                CreatedAt = DateTime.UtcNow
            };

            var hasher = new PasswordHasher<User>();
            admin.PasswordHash = hasher.HashPassword(admin, "noxa2026");

            db.Users.Add(admin);
            await db.SaveChangesAsync();
        }
    }
}
