namespace NoxaBank.Api.Models;

public class User
{
    public int Id { get; set; }

    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    public string? Phone { get; set; }
    public string? PhoneNumber { get; set; }
    public string? PassportNumber { get; set; }
    public string? PassportId { get; set; }
    public string? Address { get; set; }
    public DateTime? BirthDate { get; set; }

    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "client";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // ✅ SOLDES
    public decimal CreditBalance { get; set; } = 0m;
    public decimal MainBalance { get; set; } = 0m;
    public decimal SavingsBalance { get; set; } = 0m;
}
