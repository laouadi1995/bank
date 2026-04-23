using System.ComponentModel.DataAnnotations;

namespace NoxaBank.Api.Models
{
    public class PendingSignUp
    {
        public int Id { get; set; }

        [Required, EmailAddress, MaxLength(100)]
        public string Email { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? Phone { get; set; }

        [MaxLength(50)]
        public string? PassportNumber { get; set; }

        [MaxLength(200)]
        public string? Address { get; set; }

        public DateTime? BirthDate { get; set; }

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        [Required, MaxLength(10)]
        public string VerificationCode { get; set; } = string.Empty;

        [Required]
        public bool IsVerified { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddHours(24);
        public DateTime? VerifiedAt { get; set; }
    }
}
